import { decodeSignature, hmacSha256, json, options, readJson, text, timingSafeEqual } from "../_shared/http.ts";

const statuses = new Set(["processing", "paid", "failed", "expired", "refunded"]);

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return json(request, { error: "method_not_allowed" }, 405);
  const secret = Deno.env.get("PAYMENT_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !supabaseUrl || !serviceRoleKey) return json(request, { error: "payment_service_not_configured" }, 503);

  const raw = await request.text();
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid_json");
    body = parsed as Record<string, unknown>;
  } catch {
    return json(request, { error: "invalid_request" }, 400);
  }
  const provider = text(body.provider, 80);
  const eventId = text(body.event_id, 180);
  const intentId = text(body.payment_intent_id, 80);
  const status = text(body.status, 20);
  const providerReference = text(body.provider_reference, 180);
  if (!provider || !eventId || !/^[0-9a-f-]{36}$/i.test(intentId) || !statuses.has(status)) {
    return json(request, { error: "invalid_payment_event" }, 400);
  }

  const encoding = Deno.env.get("PAYMENT_SIGNATURE_ENCODING") || "hex";
  const expected = await hmacSha256(secret, raw);
  const supplied = decodeSignature(request.headers.get("x-payment-signature") || "", encoding);
  const signatureIsValid = timingSafeEqual(expected, supplied);
  const payload = typeof body.payload === "object" && body.payload !== null ? body.payload : body;
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/apply_payment_webhook`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      p_payment_provider: provider,
      p_provider_event_id: eventId,
      p_target_payment_intent_id: intentId,
      p_next_payment_status: status,
      p_provider_reference: providerReference || null,
      p_webhook_payload: payload,
      p_signature_is_valid: signatureIsValid,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("Payment webhook RPC failed", response.status, detail.slice(0, 300));
    return json(request, { error: "payment_event_processing_failed" }, 502);
  }
  const result = await response.json();
  // Invalid signatures are recorded by the RPC and acknowledged deliberately;
  // retrying them would create a noisy webhook loop.
  return json(request, { accepted: signatureIsValid, status: result, eventId }, signatureIsValid ? 200 : 202);
});
