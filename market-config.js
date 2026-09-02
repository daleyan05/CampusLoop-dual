// Fill these public client values after creating the Supabase project.
// The publishable/anon key is safe to expose when Row Level Security is enabled.
globalThis.CAMPUSLOOP_MARKET_CONFIG = Object.freeze({
  // Production v2 schema has passed migration and contract checks.
  cloudEnabled: true,
  supabaseUrl: "https://czauswtphccgkkeutmsg.supabase.co",
  supabasePublishableKey: "sb_publishable_REBMDklWw2gBPoAdw1narQ_iXpo6LsN",
  // Fixed staff aliases authenticate through their dedicated Supabase users.
  // Keep the mapping public; passwords remain in Supabase Auth only.
  authAccountDomain: "campusloopapp.net",
  adminAuthEmails: Object.freeze({
    Lessured: "lessured@campusloopapp.net",
    Lessures: "lessures@campusloopapp.net"
  }),
  mentorAuthEmails: Object.freeze({
    Lessured: "lessured@campusloopapp.net",
    Lessures: "lessures@campusloopapp.net"
  })
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
