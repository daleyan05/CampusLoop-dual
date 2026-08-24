import { clientIp, json, options, readJson, text } from "../_shared/http.ts";

const attempts = new Map<string, { count: number; windowStarted: number; lastSent: number }>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const MIN_INTERVAL_MS = 60 * 1000;

function validPhone(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return json(request, { error: "method_not_allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch {
    return json(request, { error: "invalid_request" }, 400);
  }
  const phone = text(body.phone, 20);
  if (!validPhone(phone)) return json(request, { error: "invalid_phone" }, 400);

  const now = Date.now();
  const key = `${clientIp(request)}:${phone}`;
  const previous = attempts.get(key);
  const state = !previous || now - previous.windowStarted >= WINDOW_MS
    ? { count: 0, windowStarted: now, lastSent: 0 }
    : previous;
  if (state.count >= MAX_PER_WINDOW) {
    return json(request, { error: "rate_limited", retryAfterSeconds: Math.ceil((state.windowStarted + WINDOW_MS - now) / 1000) }, 429, {
      "retry-after": String(Math.ceil((state.windowStarted + WINDOW_MS - now) / 1000)),
    });
  }
  if (now - state.lastSent < MIN_INTERVAL_MS) {
    return json(request, { error: "too_many_requests", retryAfterSeconds: Math.ceil((MIN_INTERVAL_MS - (now - state.lastSent)) / 1000) }, 429);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return json(request, { error: "auth_service_not_configured" }, 503);

  const upstream = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({ phone, create_user: true }),
  });
  if (!upstream.ok) {
    console.error("Supabase Auth OTP request failed", upstream.status);
    return json(request, { error: "otp_delivery_failed" }, upstream.status === 429 ? 429 : 502);
  }
  attempts.set(key, { count: state.count + 1, windowStarted: state.windowStarted, lastSent: now });
  return json(request, { accepted: true, expiresInSeconds: 300 });
});
