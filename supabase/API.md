# CampusLoop v2 API 契约

所有调用都通过 Supabase 会话执行。客户端只能使用 anon/publishable key；
审核、订单、支付和消息发送者由数据库 RPC 从 `auth.uid()` 推导。

## 公共读取

| 用途 | 入口 | 说明 |
| --- | --- | --- |
| 国家和币种 | `country_currency_rules` / `currency_for_country(text)` | 只读；国家代码为 ISO 3166-1 alpha-2 |
| 市场列表 | `get_market_feed(country_code, city, category)` | 服务端按国家/城市/分类过滤，只返回已审核且有库存的公开行 |
| 商品图片顺序 | `market_listing_media` | 只返回 `listing_id/sort_order/alt_text`；对象 URL 由服务端签发 |

## 用户 RPC

| RPC | 前置条件 | 关键结果 |
| --- | --- | --- |
| `submit_identity_application` | 已登录；证件文件归属本人 | `pending` 申请 ID |
| `create_tutoring_request` | 已登录；地址归属本人 | 从地址锁定国家、城市、币种 |
| `submit_market_listing` | 已登录；地址和图片归属本人 | 商品进入 `pending_review` |
| `create_market_order` | 买卖双方已实名；商品已审核 | 复制价格/币种/地区/费率快照；使用幂等 UUID |
| `select_tutoring_quote` | 学生本人且已实名 | 报价进入 `selected`，等待管理员 |
| `consent_market_contact_exchange` | 订单已付双方服务费 | 双方同意后创建订单会话 |
| `send_message` | 会话成员且未禁言 | 使用 `client_message_id` 重试去重 |
| `acknowledge_message_delivery` | 收件端是会话成员 | 仅写入服务端 `delivered_at` |
| `mark_conversation_read` | 会话成员 | 服务端时间写入已读回执 |
| `mark_notification_read` | 通知归属本人 | 服务端时间写入 `read_at` |
| `create_report` | 账号未受限；证据已扫描通过 | 举报进入 `pending` |

## 管理员 RPC

运营管理员可以审核实名、商品、辅导需求、订单和举报，并封禁普通账户。主管理员
额外拥有角色、平台设置和其他管理员账户管理权限：

```text
review_identity_application
review_market_listing
review_market_order
review_tutoring_request
review_tutoring_match
review_tutoring_file
act_on_report
ban_user_account / unban_user_account
set_user_role (super_admin only)
```

每个审核 RPC 都要求 `expected_version`，数据库用 `FOR UPDATE` 锁定目标并写只追加
审核记录、状态事件、审计事件和通知 outbox。客户端不能直接更新状态列。

## 辅导员 DTO

辅导员不能读取 `tutoring_requests` 基表。`get_mentor_open_requests()` 只返回：

```text
id, subject, major_category, major, request_type,
mentor_summary, country_code, city, currency_code, deadline,
attachment_types
```

不会返回学生 ID、姓名、电话、邮箱、详细地址、完整 brief、原始文件名或对象路径。

## 消息实时订阅

Realtime 发布表：`conversations`、`conversation_members`、`messages`、
`message_receipts`、`notifications`、`market_orders`、`tutoring_orders`。

推荐客户端状态映射：

```text
RPC 返回成功       -> 服务器已接收
message_receipts.delivered_at 非空 -> 对方客户端已确认收到
message_receipts.read_at 非空      -> 对方已读
RPC 错误/网络断开   -> 失败，可用同一个 client_message_id 重试
```

## 金额与地址

金额字段均为最小货币单位 `bigint`，例如 GBP 的 `1050` 表示 `£10.50`；币种不在
客户端换算。商品、辅导需求和订单创建时从地址复制 `country_code/city/currency_code`，
历史快照保持不变。用户切换浏览地区只影响列表筛选，不改写已有交易。

## 错误码约定

前端应将数据库错误码映射为可操作提示，不要直接展示 SQL 文本：

```text
identity_verification_required
account_restricted / market_access_restricted / tutoring_access_restricted
stale_version
listing_not_available / insufficient_quantity
request_not_open / mentor_access_required
conversation_access_denied / messaging_restricted
invalid_market_image / request_file_scan_not_passed
payment_intent_not_found / invalid_signature
```
