#!/usr/bin/env node
import { readFileSync } from "node:fs";

const configSource = readFileSync(new URL("../../market-config.js", import.meta.url), "utf8");
const supabaseUrl = configSource.match(/supabaseUrl:\s*["']([^"']+)/)?.[1]?.replace(/\/$/, "");
const publishableKey = configSource.match(/supabasePublishableKey:\s*["']([^"']+)/)?.[1];
const jsonOutput = process.argv.includes("--json");

const result = {
  project: supabaseUrl ? new URL(supabaseUrl).hostname.split(".")[0] : null,
  reachable: false,
  schemaReady: false,
  phoneAuthEnabled: false,
  checks: [],
};

function record(name, ok, detail) {
  result.checks.push({ name, ok, detail });
}

if (!supabaseUrl || !publishableKey) {
  record("public_config", false, "market-config.js is missing a Supabase URL or publishable key");
} else {
  const headers = { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` };
  try {
    const settingsResponse = await fetch(`${supabaseUrl}/auth/v1/settings`, { headers });
    const settings = await settingsResponse.json();
    result.reachable = settingsResponse.ok;
    result.phoneAuthEnabled = settings?.external?.phone === true || settings?.phone_autoconfirm === true;
    record("auth_endpoint", settingsResponse.ok, settingsResponse.ok ? "Supabase Auth is reachable" : `HTTP ${settingsResponse.status}`);
    record("phone_auth", result.phoneAuthEnabled, result.phoneAuthEnabled ? "phone provider enabled" : "phone provider is disabled");

    const tableChecks = ["country_currency_rules", "profiles", "addresses", "market_listings", "messages"];
    const tableResults = await Promise.all(tableChecks.map(async (table) => {
      const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=1`, { headers });
      return { table, ok: response.ok, status: response.status };
    }));
    tableResults.forEach(({ table, ok, status }) => record(`table:${table}`, ok, ok ? "visible through REST" : `HTTP ${status}; migration likely not applied`));
    result.schemaReady = tableResults.every(({ ok }) => ok);
  } catch (error) {
    record("network", false, error instanceof Error ? error.message : String(error));
  }
}

if (jsonOutput) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`Project: ${result.project || "unknown"}`);
  result.checks.forEach(({ name, ok, detail }) => console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`));
  console.log(`\nResult: ${result.schemaReady ? "schema ready" : "migration required before frontend cutover"}`);
}

process.exitCode = result.reachable && result.schemaReady ? 0 : 2;
