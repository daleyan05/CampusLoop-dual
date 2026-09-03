#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationDir = join(root, 'migrations');
const files = readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort();
const failures = [];
const checks = [];

function check(condition, message) {
  checks.push(message);
  if (!condition) failures.push(message);
}

function lexicalBalance(source) {
  let parentheses = 0;
  let singleQuote = false;
  let dollarTag = null;
  for (let i = 0; i < source.length; i += 1) {
    const current = source[i];
    const next = source[i + 1];
    if (dollarTag) {
      if (source.startsWith(dollarTag, i)) {
        i += dollarTag.length - 1;
        dollarTag = null;
      }
      continue;
    }
    if (singleQuote) {
      if (current === "'" && next === "'") {
        i += 1;
      } else if (current === "'") {
        singleQuote = false;
      }
      continue;
    }
    if (current === "'") {
      singleQuote = true;
      continue;
    }
    if (current === '$') {
      const match = source.slice(i).match(/^\$[A-Za-z_0-9]*\$/);
      if (match) {
        dollarTag = match[0];
        i += dollarTag.length - 1;
        continue;
      }
    }
    if (current === '(') parentheses += 1;
    if (current === ')') parentheses -= 1;
    if (parentheses < 0) return { parentheses, singleQuote, dollarTag };
  }
  return { parentheses, singleQuote, dollarTag };
}

const allSource = files.map((name) => readFileSync(join(migrationDir, name), 'utf8')).join('\n');

const expectedMigrations = [
  '202608220001_core.sql',
  '202608220002_identity_market.sql',
  '202608220003_tutoring.sql',
  '202608220004_messaging_payments_safety.sql',
  '202609030005_fixed_staff_roles.sql',
];
check(files.length === expectedMigrations.length, 'exactly five ordered migrations are present');
check(files.every((name, index) => name === expectedMigrations[index]), 'migration filenames and order match the contract');

for (const name of files) {
  const source = readFileSync(join(migrationDir, name), 'utf8');
  const balance = lexicalBalance(source);
  check((source.match(/^begin;$/gim) ?? []).length === 1, `${name}: one BEGIN`);
  check((source.match(/^commit;$/gim) ?? []).length === 1, `${name}: one COMMIT`);
  check(balance.parentheses === 0 && !balance.singleQuote && !balance.dollarTag, `${name}: lexical balance`);

  const securityDefinerBlocks = source.match(/create(?: or replace)? function[\s\S]*?\$\$;/gi) ?? [];
  for (const block of securityDefinerBlocks) {
    if (/security\s+definer/i.test(block)) {
      check(/set\s+search_path\s*=\s*''/i.test(block), `${name}: SECURITY DEFINER fixes search_path`);
    }
  }
}

const countryRows = (allSource.match(/\('[A-Z]{2}','[A-Z]{3}',\d\)/g) ?? []).length;
check(countryRows >= 190, `country currency map has at least 190 rows (${countryRows})`);

for (const table of [
  'mentor_access_allowlist', 'market_listings', 'market_orders', 'tutoring_requests', 'tutoring_quotes',
  'tutoring_orders', 'messages', 'payment_intents', 'reports',
]) {
  check(new RegExp(`create table public\\.${table}\\b`, 'i').test(allSource), `table exists: ${table}`);
  check(new RegExp(`alter table public\\.${table} enable row level security`, 'i').test(allSource), `RLS enabled: ${table}`);
}

for (const functionName of [
  'submit_market_listing', 'review_market_listing', 'create_market_order',
  'get_market_feed',
  'create_tutoring_request', 'get_mentor_open_requests', 'submit_tutoring_quote',
  'review_tutoring_match', 'send_message', 'apply_payment_webhook',
  'acknowledge_message_delivery',
  'can_read_market_media',
  'create_report', 'act_on_report', 'ban_user_account', 'unban_user_account',
  'bind_mentor_account', 'activate_mentor_account',
  'set_platform_setting', 'mark_notification_read',
]) {
  check(new RegExp(`create(?: or replace)? function public\\.${functionName}\\b`, 'i').test(allSource), `RPC exists: ${functionName}`);
}

check(/check\s*\(\s*\(case when market_order_id is not null then 1 else 0 end\)/i.test(allSource), 'payment intent enforces exactly one order type');
check(/ledger_entries_payment_reference_idx/i.test(allSource), 'ledger has provider-reference idempotency index');
check(/p_next_payment_status in \('paid', 'refunded'\)/i.test(allSource), 'payment webhook records refunds as ledger facts');
check(/return 'failed'::public\.payment_status/i.test(allSource), 'invalid webhook signatures are recorded without raising a retry loop');
check((allSource.match(/foreign key \(country_code, currency_code\)/gi) ?? []).length >= 4, 'country and currency snapshots have composite foreign keys');
check(/split_part\(object_path, '\/', 1\) = auth\.uid\(\)::text/i.test(allSource), 'file metadata path is scoped to owner');
check(/coalesce\(cardinality\(image_file_ids\), 0\)/i.test(allSource), 'market image NULL array is rejected');
check(/coalesce\(cardinality\(listing_delivery_methods\), 0\)/i.test(allSource), 'delivery method NULL array is rejected');
check(/f\.category <> 'report_evidence'[\s\S]{0,80}f\.scan_status <> 'passed'/i.test(allSource), 'report evidence requires a passed scan');
check(/request_file_scan_not_passed/i.test(allSource), 'tutoring request approval checks attachment scans');
check(/identity_document_required/i.test(allSource) && /listing_media_required/i.test(allSource), 'identity and listing approval require scanned files');
check(/report_row\.target_type = 'message'/i.test(allSource) && /report_row\.target_type = 'file'/i.test(allSource), 'report actions cover message and file targets');
check(/super_admin_required_for_escalation/i.test(allSource), 'report escalation requires a super-admin');
check(/case when member\.user_id = new\.sender_id then now\(\) else null end,[\s\S]{0,100}case when member\.user_id = new\.sender_id then now\(\) else null end/i.test(allSource), 'recipient delivery requires an explicit acknowledgement');
check(/revoke all on function public\.has_role/i.test(allSource), 'role inspection helper is not a public API');
check(/grant execute on function public\.is_admin\(uuid\) to anon, authenticated/i.test(allSource), 'RLS admin predicate remains callable');
check(/grant execute on function public\.is_super_admin\(uuid\) to authenticated/i.test(allSource), 'RLS super-admin predicate remains callable');
check(/create or replace function public\.set_platform_setting/i.test(allSource), 'platform settings use a validated RPC');
check(/mentor_access_allowlist/i.test(allSource) && /mentor_not_allowlisted/i.test(allSource), 'mentor access is allowlist-bound');
check(/is_scope_allowed\('account', target_user_id\)[\s\S]{0,100}has_role\('mentor'/i.test(allSource), 'restricted accounts cannot use mentor access');
check(/create or replace function public\.mark_notification_read/i.test(allSource), 'notification read timestamps use a server-time RPC');
check(/grant select \([\s\S]*?\) on public\.market_listings to anon, authenticated/i.test(allSource), 'public market reads use a column allowlist');
check(!/grant select on public\.market_listings/i.test(allSource), 'public market table does not expose all columns');
check(/grant insert \(owner_id, category, bucket_id, object_path, original_name, mime_type, size_bytes\)/i.test(allSource), 'file metadata insert excludes scan and hash claims');
check(/notification_event_key \|\| ':' \|\| target_user_id::text/i.test(allSource), 'notification outbox keys are recipient-scoped');
check(!/service_role[_ -]?key\s*[:=]/i.test(allSource), 'no service-role key is committed');

for (const table of [
  'identity_applications', 'market_listings', 'market_orders', 'tutoring_requests',
  'tutoring_quotes', 'tutoring_orders', 'messages', 'payment_intents', 'reports',
  'platform_settings',
]) {
  check(!new RegExp(`grant\\s+(?:[^;]*\\b)?(?:insert|update|delete)\\b[^;]*\\bon public\\.${table}`, 'i').test(allSource), `no direct client write grant: ${table}`);
}

if (failures.length) {
  console.error(`FAIL ${failures.length}/${checks.length}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS ${checks.length} static database checks`);
console.log(`Migrations: ${files.join(', ')}`);
console.log(`Country currency rows detected: ${countryRows}`);
