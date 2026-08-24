#!/bin/sh
set -eu

PROJECT_REF=${SUPABASE_PROJECT_REF:-}
if [ -z "$PROJECT_REF" ]; then
  printf '%s\n' '请先设置 SUPABASE_PROJECT_REF，例如：lvoobltxibrpucpnndrz' >&2
  exit 2
fi
if [ "$PROJECT_REF" = "lvoobltxibrpucpnndrz" ]; then
  printf '%s\n' '拒绝把当前 Production 项目当作 staging。请创建并指定独立的 staging project ref。' >&2
  exit 4
fi
if [ "${SUPABASE_TARGET_ENV:-staging}" != "staging" ]; then
  printf '%s\n' 'SUPABASE_TARGET_ENV 必须明确设置为 staging。' >&2
  exit 5
fi
if [ "${CAMPUSLOOP_ALLOW_STAGING:-}" != "yes" ]; then
  printf '%s\n' '这是数据库写入操作。确认目标为 staging 后，设置 CAMPUSLOOP_ALLOW_STAGING=yes 再运行。' >&2
  exit 3
fi

if ! command -v npx >/dev/null 2>&1; then
  printf '%s\n' '找不到 npx。请先安装 Node.js。' >&2
  exit 1
fi

printf '目标 Supabase 项目：%s\n' "$PROJECT_REF"
printf '%s\n' '执行前请确认已在 Supabase Dashboard 完成备份，且当前项目是 staging。'
npx --yes supabase link --project-ref "$PROJECT_REF"
npx --yes supabase db push --include-all
npx --yes supabase test db
node supabase/tests/remote-preflight.mjs
