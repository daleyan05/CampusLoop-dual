// Fill these public client values after creating the Supabase project.
// The publishable/anon key is safe to expose when Row Level Security is enabled.
globalThis.CAMPUSLOOP_MARKET_CONFIG = Object.freeze({
  // Keep the browser on local demo data until a separate staging database
  // has passed the migration and permission checks. Set true only for that
  // verified environment (never for the old Production project).
  cloudEnabled: false,
  supabaseUrl: "https://lvoobltxibrpucpnndrz.supabase.co",
  supabasePublishableKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2b29ibHR4aWJycHVjcG5uZHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMDc2NzMsImV4cCI6MjEwMjg4MzY3M30.QDV80A55iuE-naWqBRNBor0HAkFav_waLO-LIpEQDwg"
});

// Keep every adapter in one document on the same GoTrue/Realtime client.
// The publishable key is safe in the browser when RLS is enabled; secrets
// must never be added here.
globalThis.getCampusLoopSupabaseClient = function getCampusLoopSupabaseClient() {
  const config = globalThis.CAMPUSLOOP_MARKET_CONFIG || {};
  if (config.cloudEnabled !== true
    || !/^https:\/\//.test(String(config.supabaseUrl || ""))
    || String(config.supabasePublishableKey || "").length < 20
    || !globalThis.supabase?.createClient) return null;
  const cache = globalThis.__campusLoopSupabaseClients ||= new Map();
  const cacheKey = `${config.supabaseUrl}|${config.supabasePublishableKey}`;
  if (!cache.has(cacheKey)) {
    cache.set(cacheKey, globalThis.supabase.createClient(
      config.supabaseUrl,
      config.supabasePublishableKey,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    ));
  }
  return cache.get(cacheKey);
};
