# CampusLoop 数据库

这里是 CampusLoop v2 的 PostgreSQL / Supabase 数据库基线。迁移文件只创建
`v2` 表、RLS、RPC、Storage 桶和 Realtime 配置，不删除旧的 `market_items`、
`market_conversations` 等表，方便上线前做受控迁移。

## 迁移顺序

按文件名顺序执行：

1. `migrations/202608220001_core.sql`
   - 国家到 ISO 4217 币种映射
   - 用户资料、地址簿、角色、封禁、通知、审计、文件元数据
   - 首个地址自动设为默认地址
- 管理员角色和封禁/解封 RPC
2. `migrations/202608220002_identity_market.sql`
   - 实名申请和审核
   - 邀请制辅导员资料
   - 二手商品、图片、审核、订单、手续费快照
3. `migrations/202608220003_tutoring.sql`
   - 辅导需求、匿名辅导员 DTO、报价 revision、匹配和文件交付
4. `migrations/202608220004_messaging_payments_safety.sql`
   - 订单会话、消息回执、支付事实表、Webhook 幂等、举报和安全处置
   - 私有 Storage 桶、对象访问策略和 Realtime publication

金额统一使用最小货币单位 `bigint`，币种使用 ISO 4217 三字码。商品和辅导
需求在创建时从地址复制国家、城市和币种快照，之后不会因为用户切换浏览地区
或汇率变化而改写历史订单。

## 本地验证

当前工作区没有安装 `psql` 或 Supabase CLI，因此本轮只完成迁移文件和静态
检查，没有连接云端数据库。安装 Supabase CLI 后，在项目根目录执行：

```bash
supabase db lint
supabase db reset
supabase test db
```

契约测试位于 `tests/database_contract.sql`。它会检查：

- 关键表是否存在并启用 RLS；
- 国家/币种映射是否完整；
- 审核、订单、消息和支付表没有客户端直接写权限；
- 必需 RPC、策略、触发器和私有 Storage 桶是否存在；
- 所有 CampusLoop `SECURITY DEFINER` 函数是否固定了 `search_path`。

在执行迁移前，可以用公开 anon key 做只读远程预检（不会修改数据库，也不会输出密钥）：

```bash
node supabase/tests/remote-preflight.mjs
```

预检会分别报告 Auth 是否可访问、手机号登录是否启用，以及 v2 关键表是否已经
出现在 REST schema 中。只有显示 `schema ready` 后，才应切换新版前端到云端。

## 远程 Supabase 部署

前端默认将 `market-config.js` 的 `cloudEnabled` 设置为 `false`。这是有意的
保护开关：当前旧 Production 项目只有 `market_items` 等旧表，不能承载 v2
权限和审核流程。只有 staging 迁移、契约测试和双端验收全部通过后，才将它改为
`true` 并填写 staging 项目的 URL 与 publishable/anon key。

远程执行前必须先完成一次备份和 staging 验证。不要把 service-role key、数据库
密码或支付密钥写入前端、Git 或迁移文件。

推荐流程：

1. 在 Supabase Dashboard 创建数据库备份，并确认项目 URL 与当前 `market-config.js`
   中的项目一致。
2. 通过安全的 Supabase CLI 登录（或在 Dashboard SQL Editor 分文件执行迁移）。
3. 先在 staging 项目运行四个迁移和 `tests/database_contract.sql`。
4. 创建一名普通测试用户、一名运营管理员和一名主管理员，验证 anon、普通用户、
   mentor、运营管理员、主管理员五类权限。
5. 确认支付 Webhook 使用 Edge Function / service role 调用
   `apply_payment_webhook`，并完成签名、重放、失败重试测试。
6. 生产项目执行迁移后，再切换前端 API；不要让新版 UI 在数据库未完成时双写
   `localStorage` 和 Supabase。

本仓库没有自动执行远程迁移的脚本。真正执行云端迁移属于不可逆的权限和数据
变更，必须在确认备份、目标项目和 staging 结果后再执行。

仓库现在提供了一个带显式保护开关的 staging 脚本：

```bash
SUPABASE_PROJECT_REF=your_staging_ref CAMPUSLOOP_ALLOW_STAGING=yes ./supabase/deploy-staging.sh
```

脚本会先链接指定项目，再推送迁移、运行数据库契约测试和远程预检。不要把生产
项目作为目标，除非已经完成备份、staging 验证和上线确认。

## 管理员和辅导员账号初始化

账号应先在 Supabase Auth 中通过受控方式创建并验证邮箱/手机号，再使用生成的
UUID 授予角色。不要把密码写入 SQL。可复制的占位符模板见 `bootstrap.sql`：

```sql
-- 将真实 UUID 替换为已在 Auth 中创建的用户。
select public.set_user_role('00000000-0000-0000-0000-000000000000', 'super_admin', true);
select public.set_user_role('00000000-0000-0000-0000-000000000000', 'operations_admin', true);
select public.bind_mentor_account('lessured', '00000000-0000-0000-0000-000000000000');
select public.bind_mentor_account('lessures', '00000000-0000-0000-0000-000000000000');
select public.activate_mentor_account('00000000-0000-0000-0000-000000000000');
```

辅导员端不提供公开注册，数据库只允许两个固定别名 `lessured` 和 `lessures` 绑定
到 Auth 用户。登录接口必须在服务端检查用户是否同时拥有
`mentor` 角色、`mentor_profiles.status = 'active'`、实名认证通过，并且账号
没有 `account` 或 `tutoring` 限制。管理员端同样必须通过 Auth 会话和数据库角色
校验，不能依靠隐藏链接或前端角色下拉框。

运营管理员可以封禁普通用户；涉及其他管理员的封禁/解封只能由主管理员执行，
角色授予和撤销始终只允许主管理员。

## 前端接入边界

前端只使用公开 anon key 和用户会话，不直接写审核状态、订单状态、支付状态、
消息发送者或联系方式。对应操作调用 RPC：

- 商品：`submit_market_listing`、`review_market_listing`、`create_market_order`；
- 辅导：`create_tutoring_request`、`submit_tutoring_quote`、
  `select_tutoring_quote`、`review_tutoring_match`；
- 消息：`send_message`、`acknowledge_message_delivery`、`mark_conversation_read`；
- 实名/举报：`submit_identity_application`、`review_identity_application`、
  `create_report`、`act_on_report`。

文件上传先写入私有 Storage，再写 `file_assets` 元数据。生产环境还需要 Edge
Function 对 magic bytes、MIME、大小、SHA-256、病毒扫描和图片/PDF 元数据做服务端
校验；客户端传来的文件名、大小和扫描结果都不能当作事实。

## 旧数据迁移

旧页面和 `localStorage` 数据不是可信事实来源。迁移任务只能把旧商品、实名、订单
和文件导入为 `pending_review` / 待认领草稿，并记录 `legacy_source`、`legacy_id`
和审计事件。不能把本地“已实名”“已支付”“已审核”直接写成正式状态，也不能猜测
币种符号或跨地区换算。完成人工复核后再公开数据。
