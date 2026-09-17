(() => {
  "use strict";

  // This is a publishable-key adapter. Authorization is enforced again by
  // Supabase RLS and the admin-only RPCs; the browser never receives a
  // service-role credential.
  const config = globalThis.CAMPUSLOOP_MARKET_CONFIG || {};
  const configured = config.cloudEnabled === true
    && /^https:\/\//.test(String(config.supabaseUrl || ""))
    && String(config.supabasePublishableKey || "").length > 20
    && Boolean(globalThis.supabase?.createClient);
  const client = configured
    ? (globalThis.getCampusLoopSupabaseClient?.() || globalThis.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey))
    : null;

  let schema = configured ? "unknown" : "unavailable";
  let schemaPromise = null;
  let currentUser = null;
  let authorized = false;
  let role = "";
  let refreshPromise = null;
  let realtimeChannel = null;

  const requireData = (result) => {
    if (result?.error) throw result.error;
    return result?.data;
  };
  const errorText = (error) => String(error?.message || error?.details || error?.hint || error || "").toLowerCase();
  const missing = (error) => {
    const code = String(error?.code || "");
    const text = errorText(error);
    return code === "42P01" || code === "42883" || code === "PGRST202" || code === "PGRST205"
      || text.includes("does not exist") || text.includes("could not find the table")
      || text.includes("could not find the function");
  };
  const randomId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const countryNames = new Intl.DisplayNames(["zh-CN"], { type: "region" });
  const countryLabel = (code) => {
    const normalized = String(code || "").trim().toUpperCase();
    try { return countryNames.of(normalized) || normalized; } catch { return normalized; }
  };
  const currencySymbols = {
    AUD: "A$", CAD: "C$", CNY: "¥", EUR: "€", GBP: "£", MYR: "RM", SGD: "S$", USD: "$"
  };
  const zeroMinor = new Set(["BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF"]);
  const minorUnit = (code) => zeroMinor.has(String(code || "").toUpperCase()) ? 0 : 2;
  const money = (minor, code) => {
    const currency = String(code || "").toUpperCase();
    const value = Number(minor) / (10 ** minorUnit(currency));
    if (!Number.isFinite(value)) return "金额待确认";
    const symbol = currencySymbols[currency] || currency;
    return `${symbol} ${value.toLocaleString("zh-CN", { minimumFractionDigits: minorUnit(currency), maximumFractionDigits: minorUnit(currency) })}`;
  };
  const dateLabel = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "未记录" : date.toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };
  const dateValue = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  };
  const typeLabel = (value) => ({ passport: "护照", national_id: "身份证", student_id: "学生证" }[value] || value || "身份证明");
  const requestTypeLabel = (value) => ({ essay_structure: "论文结构梳理", assignment_support: "作业辅导", language_polish: "语言润色", course_tutoring: "课程答疑" }[value] || value || "辅导需求");
  const conditionLabel = (value) => ({ new: "全新", like_new: "几乎全新", good: "成色良好", fair: "有使用痕迹" }[value] || value || "未填写");
  const safeArray = (value) => Array.isArray(value) ? value : [];
  const namesFrom = (profiles) => Object.fromEntries(safeArray(profiles).map((row) => [row.id, row.display_name || "CampusLoop 用户"]));

  const fetchRows = async (table, select = "*", configure) => {
    let query = client.from(table).select(select);
    if (typeof configure === "function") query = configure(query) || query;
    return requireData(await query) || [];
  };

  const detectSchema = async () => {
    if (!configured) return "unavailable";
    const probe = await client.from("profiles").select("id").limit(1);
    if (!probe.error) return "v2";
    if (!missing(probe.error)) return "unavailable";
    // The legacy project is intentionally read-only for this adapter. It is
    // still useful for the market page, but it has no safe admin RPC contract.
    return "legacy";
  };
  const ensureSchema = async () => {
    if (schema !== "unknown") return schema;
    if (!schemaPromise) {
      schemaPromise = detectSchema().then((value) => { schema = value; return value; }).catch(() => {
        schema = "unavailable";
        return schema;
      });
    }
    return schemaPromise;
  };

  const getSessionUser = async () => {
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    return error ? null : data?.user || null;
  };
  const authProfile = (user, resolvedRole = "") => user ? {
    id: user.id,
    email: user.email || "",
    name: user.user_metadata?.display_name || user.user_metadata?.name || String(user.email || "CampusLoop 管理员").split("@")[0],
    role: resolvedRole
  } : null;
  const mappedAuthEmail = (mapping, alias) => {
    if (!mapping || typeof mapping !== "object") return "";
    const normalized = String(alias || "").trim().toLowerCase();
    const entry = Object.entries(mapping).find(([key]) => String(key).trim().toLowerCase() === normalized);
    return typeof entry?.[1] === "string" ? entry[1].trim().toLowerCase() : "";
  };
  const resolveLoginEmail = (identifier) => {
    const value = String(identifier || "").trim();
    if (value.includes("@")) return value.toLowerCase();
    const mapping = config.adminAuthEmails;
    const mapped = mappedAuthEmail(mapping, value);
    if (typeof mapped === "string" && mapped.includes("@")) return mapped.trim().toLowerCase();
    const error = new Error("cloud_identifier_requires_email");
    error.code = "cloud_identifier_requires_email";
    throw error;
  };

  const checkAuthorization = async (user) => {
    if (!user?.id || schema !== "v2") return { authorized: false, role: "" };
    const adminResult = await client.rpc("is_admin", { target_user_id: user.id });
    if (adminResult.error || adminResult.data !== true) return { authorized: false, role: "" };
    let resolvedRole = "operations_admin";
    const superResult = await client.rpc("is_super_admin", { target_user_id: user.id });
    if (!superResult.error && superResult.data === true) resolvedRole = "super_admin";
    return { authorized: true, role: resolvedRole };
  };

  const loadSnapshot = async () => {
    if (!client || schema !== "v2" || !authorized) return null;

    const [profiles, privateProfiles, userRoles, restrictions, addresses, applications, documents, listings, listingMedia, orders,
      tutoringRequests, quotes, selections, mentors, tutoringFiles, reports, reportEvidence, reportActions] = await Promise.all([
      fetchRows("profiles", "id,display_name,created_at,updated_at,deleted_at"),
      fetchRows("user_private_profiles", "user_id,email,phone,last_seen_at,created_at"),
      fetchRows("user_roles", "user_id,role,granted_at"),
      fetchRows("account_restrictions", "id,user_id,scope,reason,starts_at,ends_at,created_by,revoked_at,revoked_by,revoke_reason,created_at"),
      fetchRows("addresses", "id,user_id,country_code,city,is_default,updated_at"),
      fetchRows("identity_applications", "id,user_id,legal_name,document_type,country_code,status,version,submitted_at,reviewed_at,created_at"),
      fetchRows("identity_documents", "application_id,file_id,side,created_at"),
      fetchRows("market_listings", "id,seller_id,address_id,title,category,condition,description,price_minor,currency_code,country_code,city,quantity,available_quantity,delivery_methods,status,version,submitted_at,reviewed_at,created_at,updated_at"),
      fetchRows("market_listing_media", "listing_id,file_id,sort_order,alt_text,created_at"),
      fetchRows("market_orders", "id,listing_id,buyer_id,seller_id,quantity,listing_title_snapshot,unit_price_minor,subtotal_minor,currency_code,country_code,city,buyer_fee_bps,seller_fee_bps,buyer_fee_minor,seller_fee_minor,status,version,created_at,updated_at,completed_at"),
      fetchRows("tutoring_requests", "id,student_id,address_id,subject,major_category,major,request_type,mentor_summary,brief_private,country_code,city,currency_code,deadline,status,version,submitted_at,reviewed_at,created_at,updated_at"),
      fetchRows("tutoring_quotes", "id,request_id,mentor_id,revision,amount_minor,currency_code,billing_mode,note,status,created_at"),
      fetchRows("tutoring_quote_selections", "id,request_id,quote_id,selected_by,status,reviewed_by,review_reason,selected_at,reviewed_at"),
      fetchRows("mentor_profiles", "user_id,status,bio,major_categories,specialties,verified_at,created_at"),
      fetchRows("tutoring_files", "id,request_id,order_id,file_id,purpose,submitted_by,review_status,reviewed_by,review_reason,reviewed_at,created_at"),
      fetchRows("reports", "id,reporter_id,target_type,target_id,category,summary,priority,status,assigned_to,version,created_at,updated_at,resolved_at"),
      fetchRows("report_evidence", "id,report_id,file_id,evidence_type,snapshot,sha256,created_by,created_at"),
      fetchRows("report_actions", "id,report_id,report_version,action,reason,outcome,actor_id,created_at")
    ]);

    const names = namesFrom(profiles);
    const privateById = Object.fromEntries(privateProfiles.map((row) => [row.user_id, row]));
    const defaultAddressByUser = {};
    addresses.forEach((row) => {
      if (row.is_default || !defaultAddressByUser[row.user_id]) defaultAddressByUser[row.user_id] = row;
    });
    const rolesById = {};
    userRoles.forEach((row) => { (rolesById[row.user_id] ||= []).push(row.role); });
    const restrictionsByUser = {};
    restrictions.forEach((row) => {
      const existing = restrictionsByUser[row.user_id] || { userId: row.user_id, status: "active", history: [] };
      const active = row.scope === "account" && !row.revoked_at && new Date(row.starts_at).getTime() <= Date.now()
        && (!row.ends_at || new Date(row.ends_at).getTime() > Date.now());
      const historyEntry = row.revoked_at
        ? { type: "unban", reason: row.revoke_reason || "已解除限制", at: row.revoked_at, reviewer: names[row.revoked_by] || "管理员" }
        : { type: "ban", reason: row.reason, at: row.starts_at, expiresAt: row.ends_at || null, reviewer: names[row.created_by] || "管理员" };
      existing.history.push(historyEntry);
      if (active) Object.assign(existing, { status: "banned", reason: row.reason, bannedAt: row.starts_at, expiresAt: row.ends_at || null, reviewer: names[row.created_by] || "管理员" });
      restrictionsByUser[row.user_id] = existing;
    });

    const users = profiles.map((row) => {
      const privateRow = privateById[row.id] || {};
      const roles = rolesById[row.id] || [];
      const role = roles.includes("super_admin") ? "主管理员" : roles.includes("operations_admin") ? "运营管理员" : roles.includes("mentor") ? "辅导员" : "普通用户";
      const restriction = restrictionsByUser[row.id];
      const address = defaultAddressByUser[row.id];
      return {
        id: row.id,
        name: row.display_name || "未命名用户",
        contact: privateRow.email || privateRow.phone || row.id,
        role,
        location: address ? `${address.city} · ${countryLabel(address.country_code)}` : "未设置",
        joinedAt: row.created_at,
        lastActiveAt: privateRow.last_seen_at || row.updated_at || row.created_at,
        cloud: true,
        restriction
      };
    });

    const docByApplication = {};
    documents.forEach((row) => { (docByApplication[row.application_id] ||= []).push(row); });
    const fileIds = [...new Set([
      ...documents.map((row) => row.file_id),
      ...listingMedia.map((row) => row.file_id),
      ...tutoringFiles.map((row) => row.file_id),
      ...reportEvidence.map((row) => row.file_id).filter(Boolean)
    ])];
    const files = fileIds.length ? await fetchRows("file_assets", "id,owner_id,category,bucket_id,object_path,original_name,mime_type,size_bytes,sha256,scan_status,scan_detail,scanned_at,created_at", (query) => query.in("id", fileIds)) : [];
    const filesById = Object.fromEntries(files.map((row) => [row.id, row]));

    const identityApplicants = applications.map((row) => {
      const doc = docByApplication[row.id]?.[0];
      const file = doc ? filesById[doc.file_id] : null;
      const risk = !file ? "缺少证件文件" : file.scan_status === "blocked" ? "安全扫描未通过" : file.scan_status === "pending" ? "等待安全扫描" : "无";
      const privateRow = privateById[row.user_id] || {};
      return {
        id: row.id, userId: row.user_id, name: row.legal_name, email: privateRow.email || names[row.user_id] || "本地账号",
        docType: typeLabel(row.document_type), countryCode: row.country_code, nationality: countryLabel(row.country_code),
        submitted: dateLabel(row.submitted_at), submittedAt: row.submitted_at, version: row.version, risk,
        fileName: file?.original_name || "未上传文件", mimeType: file?.mime_type || "", fileSize: file?.size_bytes || 0,
        scanStatus: file?.scan_status || "pending", previewDataUrl: "", source: "cloud", cloudStatus: row.status,
        reviewedAt: row.reviewed_at || ""
      };
    });

    const listingMediaById = {};
    listingMedia.forEach((row) => { (listingMediaById[row.listing_id] ||= []).push(row); });
    const publishedItems = listings.map((row) => {
      const media = (listingMediaById[row.id] || []).sort((a, b) => a.sort_order - b.sort_order);
      const firstFile = filesById[media[0]?.file_id];
      const status = row.status === "pending_review" ? "pending" : row.status === "approved" ? "approved" : row.status === "rejected" ? "rejected" : row.status;
      return {
        id: row.id, sellerId: row.seller_id, seller: names[row.seller_id] || "未知卖家", avatar: (names[row.seller_id] || "卖").slice(0, 1),
        title: row.title, category: row.category, condition: conditionLabel(row.condition), description: row.description,
        price: Number(row.price_minor) / (10 ** minorUnit(row.currency_code)), priceMinor: Number(row.price_minor),
        currencyCode: row.currency_code, country: countryLabel(row.country_code), countryCode: row.country_code, city: row.city,
        delivery: row.delivery_methods || [], image: "", imageFileName: firstFile?.original_name || "", submittedAt: row.submitted_at,
        reviewStatus: status, version: row.version, cloud: true
      };
    });

    const orderStatus = (value) => ({
      pending_admin_review: "pending", awaiting_fees: "waitFee", awaiting_contact_consents: "waitExchange",
      contact_revealed: "waitExchange", handover_pending: "waitExchange", completed: "completed", rejected: "rejected"
    }[value] || value);
    const marketOrders = orders.map((row) => ({
      id: row.id, time: dateLabel(row.created_at), item: row.listing_title_snapshot, category: "二手商品",
      seller: names[row.seller_id] || "卖家", buyer: names[row.buyer_id] || "买家", amount: Number(row.subtotal_minor) / (10 ** minorUnit(row.currency_code)),
      currency: currencySymbols[row.currency_code] || row.currency_code, currencyCode: row.currency_code,
      sellerFee: Number(row.seller_fee_minor) / (10 ** minorUnit(row.currency_code)), buyerFee: Number(row.buyer_fee_minor) / (10 ** minorUnit(row.currency_code)),
      city: row.city, delivery: "平台订单", nextStatus: orderStatus(row.status), risk: "无", reviewStatus: orderStatus(row.status),
      version: row.version, cloud: true, cloudStatus: row.status, listingId: row.listing_id
    }));

    const quotesByRequest = {};
    quotes.forEach((row) => { (quotesByRequest[row.request_id] ||= []).push(row); });
    const selectionByRequest = Object.fromEntries(selections.map((row) => [row.request_id, row]));
    const tutorRequests = tutoringRequests.map((row) => {
      const selected = selectionByRequest[row.id];
      const quote = selected ? quotes.find((item) => item.id === selected.quote_id) : (quotesByRequest[row.id] || [])[0];
      return {
        id: row.id, subject: row.subject, type: requestTypeLabel(row.request_type), requestType: row.request_type,
        requirement: row.mentor_summary || row.brief_private, brief: row.brief_private, deadline: row.deadline,
        addressSnapshot: { countryCode: row.country_code, countryName: countryLabel(row.country_code), city: row.city },
        countryCode: row.country_code, countryName: countryLabel(row.country_code), city: row.city, currencyCode: row.currency_code,
        version: row.version, status: row.status, selectedQuoteId: selected?.quote_id || "", selectionId: selected?.id || "",
        cloud: true,
        cloudQuote: quote ? { id: quote.id, requestId: row.id, mentorName: names[quote.mentor_id] || "辅导员", mentorId: quote.mentor_id,
          amount: Number(quote.amount_minor) / (10 ** minorUnit(quote.currency_code)), amountMinor: Number(quote.amount_minor), currencyCode: quote.currency_code,
          billing: quote.billing_mode === "hourly" ? "每小时" : "一次性", note: quote.note || "", status: quote.status } : null,
        cloudSelectionStatus: selected?.status || "",
        cloudMatchStatus: selected ? (selected.status === "pending_admin" ? "pending" : selected.status === "approved" ? "approved" : "rejected") : "waiting"
      };
    });

    const tutoringFileRows = tutoringFiles.map((row) => {
      const file = filesById[row.file_id] || {};
      const order = orders.find((item) => item.id === row.order_id);
      const request = tutoringRequests.find((item) => item.id === row.request_id);
      return {
        id: row.id, name: file.original_name || "未命名文件", type: (file.mime_type || "FILE").split("/").pop()?.toUpperCase() || "FILE",
        category: row.purpose === "mentor_delivery" ? "交付文件" : "作业要求", orderId: order?.id || request?.id || "—",
        subject: request?.subject || order?.subject_snapshot || "辅导订单", submitter: names[row.submitted_by] || "匿名用户",
        size: file.size_bytes || 0, submitted: dateLabel(row.created_at), pages: "—", scan: file.scan_status === "blocked" ? "review" : file.scan_status || "pending",
        scanDetail: file.scan_detail || "等待安全扫描", hash: file.sha256 ? `${file.sha256.slice(0, 4)}…${file.sha256.slice(-4)}` : "未生成",
        previewTitle: file.original_name || "安全预览", previewText: "文件内容仅在完成安全扫描和权限核验后开放。", effect: "审核结果将推进对应订单流程。",
        audience: row.purpose === "mentor_delivery" ? "订单学生" : "已确认辅导员", cloud: true, cloudStatus: file.scan_status === "blocked" ? "blocked" : row.review_status, version: row.version || 1,
        fileAssetId: row.file_id
      };
    });

    const actionsByReport = {};
    reportActions.forEach((row) => { (actionsByReport[row.report_id] ||= []).push(row); });
    const evidenceByReport = {};
    reportEvidence.forEach((row) => { (evidenceByReport[row.report_id] ||= []).push(row); });
    const reportCases = reports.map((row) => {
      const targetType = row.target_type;
      const type = targetType === "tutoring_order" ? "tutoring" : targetType === "conversation" || targetType === "message" ? "message" : "market";
      const typeLabelText = targetType === "tutoring_order" ? "辅导交付纠纷" : targetType === "market_listing" ? "二手商品举报" : targetType === "market_order" ? "二手订单举报" : "平台安全举报";
      const history = safeArray(actionsByReport[row.id]).map((action) => ({ action: action.action, reason: action.reason, outcome: action.outcome, reviewedAt: dateLabel(action.created_at) }));
      const evidence = safeArray(evidenceByReport[row.id]).map((item) => ({ label: item.evidence_type === "file" ? "附件证据" : "系统快照", detail: item.snapshot?.summary || "证据已加密留存并脱敏展示。", meta: item.sha256 ? "哈希已留存" : "平台记录" }));
      return {
        id: row.id, type, typeLabel: typeLabelText, title: row.category, related: `${targetType} · ${row.target_id}`,
        target: "已脱敏对象", reporter: names[row.reporter_id] || "匿名用户", priority: row.priority, submitted: dateLabel(row.created_at),
        baseStatus: row.status, version: row.version, summary: row.summary, evidence, rules: ["遵守 CampusLoop 平台规则"],
        timeline: [{ label: "举报已提交", detail: row.summary, time: dateLabel(row.created_at) }], resolution: history.at(-1) || null, cloud: true
      };
    });

    return {
      users, restrictions: restrictionsByUser, identityApplicants, publishedItems, marketOrders,
      tutorRequests, tutorQuotes: quotes, tutorSelections: selections, tutorMentors: mentors,
      reviewFiles: tutoringFileRows, reportCases, loadedAt: new Date().toISOString(), role
    };
  };

  const invoke = async (name, args) => requireData(await client.rpc(name, args));

  const api = {
    configured,
    get client() { return client; },
    get mode() { return schema; },
    get authorized() { return authorized; },
    get role() { return role; },
    get user() { return currentUser; },
    async init() {
      if (!configured) return { mode: "unavailable", authorized: false, role: "", user: null };
      await ensureSchema();
      currentUser = await getSessionUser();
      const result = await checkAuthorization(currentUser).catch(() => ({ authorized: false, role: "" }));
      authorized = result.authorized;
      role = result.role;
      return { mode: schema, authorized, role, user: currentUser };
    },
    async signIn({ identifier, email, password } = {}) {
      const activeSchema = await ensureSchema();
      if (activeSchema !== "v2") {
        const error = new Error("cloud_schema_unavailable");
        error.code = "cloud_schema_unavailable";
        throw error;
      }
      const loginEmail = resolveLoginEmail(email || identifier);
      const data = requireData(await client.auth.signInWithPassword({ email: loginEmail, password }));
      const user = data?.user;
      if (!user) throw Object.assign(new Error("auth_user_missing"), { code: "auth_user_missing" });
      const access = await checkAuthorization(user);
      if (!access.authorized) {
        await client.auth.signOut().catch(() => {});
        throw Object.assign(new Error("insufficient_role"), { code: "insufficient_role" });
      }
      currentUser = user;
      authorized = true;
      role = access.role;
      return { mode: activeSchema, authorized: true, role, user: authProfile(user, role) };
    },
    async signOut() {
      if (client) requireData(await client.auth.signOut());
      currentUser = null;
      authorized = false;
      role = "";
    },
    async getSession(requiredRole = "") {
      const activeSchema = await ensureSchema();
      const user = await getSessionUser();
      if (!user) return { mode: activeSchema, authorized: false, role: "", user: null };
      const access = await checkAuthorization(user);
      const requested = String(requiredRole || "").trim().toLowerCase();
      const authorizedForRequest = !requested || (requested === "super_admin" ? access.role === "super_admin" : access.authorized);
      return { mode: activeSchema, authorized: authorizedForRequest, role: access.role, user: authProfile(user, access.role) };
    },
    async checkRole(requiredRole) {
      const session = await this.getSession(requiredRole);
      return { authorized: session.authorized, role: session.role, user: session.user, mode: session.mode };
    },
    async refresh() {
      if (!authorized || schema !== "v2") return null;
      if (!refreshPromise) refreshPromise = loadSnapshot().finally(() => { refreshPromise = null; });
      return refreshPromise;
    },
    async reviewIdentity({ id, version, decision, reason }) {
      return invoke("review_identity_application", { target_application_id: id, expected_version: version, review_decision: decision, review_reason: reason || null });
    },
    async reviewListing({ id, version, decision, reason }) {
      return invoke("review_market_listing", { target_listing_id: id, expected_version: version, review_decision: decision, review_reason: reason || null });
    },
    async reviewOrder({ id, version, decision, reason }) {
      return invoke("review_market_order", { target_order_id: id, expected_version: version, review_decision: decision, review_reason: reason || null });
    },
    async reviewTutoringRequest({ id, version, decision, reason }) {
      return invoke("review_tutoring_request", { target_request_id: id, expected_version: version, review_decision: decision, review_reason: reason || null });
    },
    async reviewTutoringMatch({ selectionId, version, decision, reason }) {
      return invoke("review_tutoring_match", { target_selection_id: selectionId, expected_request_version: version, review_decision: decision, review_reason: reason || null });
    },
    async reviewFile({ id, decision, reason }) {
      return invoke("review_tutoring_file", { target_tutoring_file_id: id, review_decision: decision, review_reason: reason || null });
    },
    async actOnReport({ id, version, action, reason }) {
      return invoke("act_on_report", { target_report_id: id, expected_version: version, report_action: action, action_reason: reason });
    },
    async banUser({ id, reason, endsAt }) {
      return invoke("ban_user_account", { target_user_id: id, ban_reason: reason, ban_ends_at: endsAt || null });
    },
    async unbanUser({ id, reason }) {
      return invoke("unban_user_account", { target_user_id: id, unban_reason: reason });
    },
    subscribe(onChange) {
      if (!client || schema !== "v2" || !authorized) return () => {};
      realtimeChannel = client.channel(`campusloop-admin-${randomId()}`);
      ["identity_applications", "market_listings", "market_orders", "tutoring_requests", "tutoring_quote_selections", "tutoring_files", "reports", "account_restrictions", "profiles"].forEach((table) => {
        realtimeChannel = realtimeChannel.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
      });
      realtimeChannel.subscribe();
      return () => {
        if (realtimeChannel) client.removeChannel(realtimeChannel);
        realtimeChannel = null;
      };
    }
  };

  globalThis.CampusLoopAdminCloud = Object.freeze(api);
})();
