const configuredOrigin = Deno.env.get("ALLOWED_ORIGIN") || "*";

export function corsHeaders(request?: Request): Record<string, string> {
  const requestOrigin = request?.headers.get("origin");
  const allowOrigin = configuredOrigin === "*"
    ? "*"
    : requestOrigin === configuredOrigin ? configuredOrigin : configuredOrigin;
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-headers": "authorization, apikey, content-type, x-payment-signature",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-max-age": "86400",
    "cache-control": "no-store",
  };
}

export function json(request: Request, body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

export function options(request: Request): Response | null {
  return request.method === "OPTIONS" ? new Response(null, { status: 204, headers: corsHeaders(request) }) : null;
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_json");
    return value as Record<string, unknown>;
  } catch {
    throw new Error("invalid_json");
  }
}

export function text(value: unknown, max = 240): string {
  return String(value ?? "").trim().slice(0, max);
}

export function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left[index] ^ right[index];
  return result === 0;
}

export async function hmacSha256(secret: string, payload: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

export function decodeSignature(value: string, encoding = "hex"): Uint8Array {
  const normalized = value.trim().replace(/^sha256=/i, "");
  if (encoding === "base64") {
    try {
      return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
    } catch {
      return new Uint8Array();
    }
  }
  if (!/^[0-9a-f]{64}$/i.test(normalized)) return new Uint8Array();
  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("cf-connecting-ip")?.trim()
    || "unknown";
}
