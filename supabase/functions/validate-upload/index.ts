import { json, options, text } from "../_shared/http.ts";

const MAX_BYTES = 100 * 1024 * 1024;
const allowedCategories = new Set([
  "market_image", "identity_document", "tutoring_request", "tutoring_delivery",
  "message_attachment", "report_evidence",
]);

function startsWithBytes(bytes: Uint8Array, expected: number[]): boolean {
  return expected.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return new TextDecoder().decode(bytes.slice(offset, offset + length));
}

function magicMatches(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/jpeg") return startsWithBytes(bytes, [0xff, 0xd8, 0xff]);
  if (mime === "image/png") return startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mime === "image/webp") return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP";
  if (mime === "application/pdf") return ascii(bytes, 0, 5) === "%PDF-";
  return true;
}

async function currentUserId(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!token || !supabaseUrl || !anonKey) return null;
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: anonKey, authorization: token },
  });
  if (!response.ok) return null;
  const user = await response.json();
  return typeof user?.id === "string" ? user.id : null;
}

Deno.serve(async (request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.method !== "POST") return json(request, { error: "method_not_allowed" }, 405);
  const ownerId = await currentUserId(request);
  if (!ownerId) return json(request, { error: "unauthorized" }, 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(request, { error: "invalid_multipart" }, 400);
  }
  const value = form.get("file");
  const category = text(form.get("category"), 40);
  if (!(value instanceof File)) return json(request, { error: "file_required" }, 400);
  if (!allowedCategories.has(category)) return json(request, { error: "invalid_file_category" }, 400);
  if (value.size < 1 || value.size > MAX_BYTES) return json(request, { error: "file_size_not_allowed" }, 413);
  const mime = value.type.toLowerCase();
  const allowedMimes = new Set([
    "image/jpeg", "image/png", "image/webp", "application/pdf", "application/zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ]);
  if (!allowedMimes.has(mime)) return json(request, { error: "file_type_not_allowed" }, 415);
  const bytes = new Uint8Array(await value.arrayBuffer());
  if (!magicMatches(bytes, mime)) return json(request, { error: "file_signature_mismatch" }, 422);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return json(request, {
    accepted: true,
    ownerId,
    category,
    originalName: value.name.slice(0, 240),
    mimeType: mime,
    sizeBytes: value.size,
    sha256,
    scanStatus: "pending",
    note: "文件仍需服务端病毒扫描通过后才可用于订单或消息。",
  });
});
