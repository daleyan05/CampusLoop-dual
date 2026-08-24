import { json, options } from "../_shared/http.ts";

Deno.serve((request) => {
  const preflight = options(request);
  if (preflight) return preflight;
  if (request.method !== "GET") return json(request, { error: "method_not_allowed" }, 405);
  return json(request, {
    service: "campusloop-api",
    status: "ok",
    version: Deno.env.get("APP_VERSION") || "v2",
    timestamp: new Date().toISOString(),
  });
});
