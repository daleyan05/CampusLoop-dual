(() => {
  "use strict";

  // Shared v2 adapter for account-owned data. It is deliberately separate
  // from the market adapter so the static demo can keep working while the
  // production schema is being deployed.
  const config = globalThis.CAMPUSLOOP_MARKET_CONFIG || {};
  const configured = config.cloudEnabled === true
    && /^https:\/\//.test(String(config.supabaseUrl || ""))
    && String(config.supabasePublishableKey || "").length > 20
    && Boolean(globalThis.supabase?.createClient);
  const sharedClient = globalThis.CampusLoopMarketCloud?.client || globalThis.getCampusLoopSupabaseClient?.() || null;
  const client = configured
    ? (sharedClient || globalThis.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey))
    : null;

  let schema = configured ? "unknown" : "unavailable";
  let schemaPromise = null;

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
  const safeFileName = (name) => String(name || "file").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 180) || "file";
  const documentType = (value) => ({ "护照": "passport", "身份证": "national_id", "学生证": "student_id" }[String(value || "").trim()] || String(value || "").trim());
  const zeroMinorCurrencies = new Set(["BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF"]);
  const threeMinorCurrencies = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);
  const minorUnitFor = (currencyCode) => {
    const code = String(currencyCode || "").trim().toUpperCase();
    if (zeroMinorCurrencies.has(code)) return 0;
    if (threeMinorCurrencies.has(code)) return 3;
    return 2;
  };
  const toMinor = (amount, currencyCode) => {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      const error = new Error("invalid_amount");
      error.code = "invalid_amount";
      throw error;
    }
    return Math.round(numeric * (10 ** minorUnitFor(currencyCode)));
  };
  const requestType = (value) => ({ "论文结构梳理": "essay_structure", "作业辅导": "assignment_support", "语言润色": "language_polish", "课程答疑": "course_tutoring" }[String(value || "").trim()] || String(value || "").trim());
  const billingMode = (value) => ({ "一次性": "one_time", "每小时": "hourly" }[String(value || "").trim()] || String(value || "").trim());
  const mappedAuthEmail = (mapping, alias) => {
    if (!mapping || typeof mapping !== "object") return "";
    const normalized = String(alias || "").trim().toLowerCase();
    const entry = Object.entries(mapping).find(([key]) => String(key).trim().toLowerCase() === normalized);
    return typeof entry?.[1] === "string" ? entry[1].trim().toLowerCase() : "";
  };
  const authEmailForAlias = (alias, kind) => {
    const normalized = String(alias || "").trim().toLowerCase();
    const configuredMap = kind === "mentor" ? config.mentorAuthEmails : config.adminAuthEmails;
    const mapped = mappedAuthEmail(configuredMap, normalized);
    if (mapped) return mapped;
    const domain = String(config.authAccountDomain || "campusloopapp.net").trim().replace(/^@/, "");
    return `${normalized}@${domain}`;
  };

  const detectSchema = async () => {
    if (!configured) return "unavailable";
    const probe = await client.from("profiles").select("id").limit(1);
    if (!probe.error) return "v2";
    if (!missing(probe.error)) return "unavailable";
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
  const currentUser = async () => {
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    return error ? null : data?.user || null;
  };
  const authProfile = (user, role = "") => user ? {
    id: user.id,
    email: user.email || "",
    name: user.user_metadata?.display_name || user.user_metadata?.name || String(user.email || "CampusLoop 用户").split("@")[0],
    role
  } : null;
  const resolveLoginEmail = (identifier, kind = "mentor") => {
    const value = String(identifier || "").trim();
    if (value.includes("@")) return value.toLowerCase();
    const mapping = config[`${kind}AuthEmails`];
    const mapped = mappedAuthEmail(mapping, value);
    if (typeof mapped === "string" && mapped.includes("@")) return mapped.trim().toLowerCase();
    const error = new Error("cloud_identifier_requires_email");
    error.code = "cloud_identifier_requires_email";
    throw error;
  };
  const roleCheck = async (user, requiredRole) => {
    const role = String(requiredRole || "").trim().toLowerCase();
    const rpcName = role === "mentor" ? "is_active_mentor" : role === "super_admin" || role === "super" ? "is_super_admin" : "is_admin";
    const result = await client.rpc(rpcName, { target_user_id: user.id });
    const authorized = !result.error && result.data === true;
    return {
      authorized,
      role: role === "mentor" ? "mentor" : role === "super_admin" || role === "super" ? "super_admin" : "operations_admin",
      roles: authorized ? [role === "mentor" ? "mentor" : role === "super_admin" || role === "super" ? "super_admin" : "operations_admin"] : []
    };
  };
  const requireV2User = async () => {
    const activeSchema = await ensureSchema();
    if (activeSchema !== "v2") {
      const error = new Error("cloud_schema_unavailable");
      error.code = "cloud_schema_unavailable";
      throw error;
    }
    const user = await currentUser();
    if (!user?.id) {
      const error = new Error("auth_required");
      error.code = "auth_required";
      throw error;
    }
    return user;
  };

  const mapAddress = (row) => ({
    id: row.id,
    label: row.label,
    name: row.recipient_name || row.label,
    recipientName: row.recipient_name || "",
    country: row.country_code,
    city: row.city,
    region: row.region || "",
    detail: row.address_line,
    postalCode: row.postal_code || "",
    currencyCode: row.currency_code,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });

  const api = {
    configured,
    get client() { return client; },
    get mode() { return schema; },
    async init() {
      if (!configured) return { mode: "unavailable", user: null };
      await ensureSchema();
      return { mode: schema, user: await currentUser() };
    },
    async signInMentor({ username, password }) {
      if (!client) throw Object.assign(new Error("cloud_unavailable"), { code: "cloud_unavailable" });
      if (await ensureSchema() !== "v2") throw Object.assign(new Error("cloud_schema_unavailable"), { code: "cloud_schema_unavailable" });
      const alias = String(username || "").trim();
      const data = requireData(await client.auth.signInWithPassword({ email: authEmailForAlias(alias, "mentor"), password: String(password || "") }));
      const user = data?.user;
      const active = requireData(await client.rpc("is_active_mentor", { target_user_id: user?.id }));
      if (active !== true) {
        await client.auth.signOut().catch(() => {});
        throw Object.assign(new Error("mentor_access_required"), { code: "mentor_access_required" });
      }
      return { id: user.id, username: alias, cloud: true, user };
    },
    async signOut() {
      if (client) requireData(await client.auth.signOut());
    },
    async signIn({ identifier, email, password, role = "mentor", kind = role } = {}) {
      const activeSchema = await ensureSchema();
      if (activeSchema !== "v2") {
        const error = new Error("cloud_schema_unavailable");
        error.code = "cloud_schema_unavailable";
        throw error;
      }
      const loginEmail = resolveLoginEmail(email || identifier, kind);
      const data = requireData(await client.auth.signInWithPassword({ email: loginEmail, password }));
      const user = data?.user;
      if (!user) throw Object.assign(new Error("auth_user_missing"), { code: "auth_user_missing" });
      const access = await roleCheck(user, role);
      if (!access.authorized) {
        await client.auth.signOut().catch(() => {});
        throw Object.assign(new Error("insufficient_role"), { code: "insufficient_role" });
      }
      return { user: authProfile(user, access.role), ...access, mode: activeSchema };
    },
    async signOut() {
      if (client) requireData(await client.auth.signOut());
    },
    async getSession(requiredRole = "") {
      const activeSchema = await ensureSchema();
      const user = await currentUser();
      if (!user) return { mode: activeSchema, user: null, authorized: false, role: "", roles: [] };
      if (activeSchema !== "v2" || !requiredRole) return { mode: activeSchema, user: authProfile(user), authorized: activeSchema === "v2", role: "", roles: [] };
      const access = await roleCheck(user, requiredRole);
      return { mode: activeSchema, user: authProfile(user, access.role), ...access };
    },
    async checkRole(requiredRole) {
      const activeSchema = await ensureSchema();
      const user = await currentUser();
      if (activeSchema !== "v2" || !user) return { authorized: false, role: "", roles: [], user: user ? authProfile(user) : null, mode: activeSchema };
      const access = await roleCheck(user, requiredRole);
      return { ...access, user: authProfile(user, access.role), mode: activeSchema };
    },
    async listAddresses() {
      const user = await requireV2User();
      const rows = requireData(await client.from("addresses")
        .select("id,label,recipient_name,country_code,region,city,address_line,postal_code,currency_code,is_default,created_at,updated_at")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true })) || [];
      return rows.map(mapAddress);
    },
    async saveAddress(address) {
      const user = await requireV2User();
      const country = String(address?.country || "").trim().toUpperCase();
      const currency = requireData(await client.rpc("currency_for_country", { target_country_code: country }));
      if (!currency) {
        const error = new Error("unsupported_country");
        error.code = "unsupported_country";
        throw error;
      }
      const payload = {
        user_id: user.id,
        label: String(address?.label || "其他").trim(),
        recipient_name: String(address?.name || address?.recipientName || "").trim() || null,
        country_code: country,
        region: String(address?.region || "").trim() || null,
        city: String(address?.city || "").trim(),
        address_line: String(address?.detail || "").trim(),
        postal_code: String(address?.postalCode || "").trim() || null,
        currency_code: currency,
        is_default: Boolean(address?.isDefault)
      };
      const persistedId = /^[0-9a-f-]{36}$/i.test(String(address?.id || "")) ? address.id : "";
      const query = persistedId
        ? client.from("addresses").update(payload).eq("id", persistedId).eq("user_id", user.id)
        : client.from("addresses").insert(payload);
      const row = requireData(await query.select("id,label,recipient_name,country_code,region,city,address_line,postal_code,currency_code,is_default,created_at,updated_at").single());
      return mapAddress(row);
    },
    async deleteAddress(id) {
      const user = await requireV2User();
      requireData(await client.from("addresses").delete().eq("id", id).eq("user_id", user.id));
    },
    async getIdentityApplication() {
      const user = await requireV2User();
      const row = requireData(await client.from("identity_applications")
        .select("id,user_id,legal_name,document_type,country_code,status,version,submitted_at,reviewed_at")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle());
      if (!row) return null;
      const document = requireData(await client.from("identity_documents")
        .select("file_id")
        .eq("application_id", row.id)
        .maybeSingle());
      let file = null;
      if (document?.file_id) {
        file = requireData(await client.from("file_assets")
          .select("original_name,mime_type,size_bytes,scan_status")
          .eq("id", document.file_id)
          .maybeSingle());
      }
      return {
        id: row.id,
        userId: row.user_id,
        name: row.legal_name,
        docType: ({ passport: "护照", national_id: "身份证", student_id: "学生证" })[row.document_type] || row.document_type,
        country: row.country_code,
        countryCode: row.country_code,
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at || "",
        cloudStatus: row.status,
        version: row.version,
        fileName: file?.original_name || "",
        mimeType: file?.mime_type || "",
        fileSize: file?.size_bytes || 0,
        scanStatus: file?.scan_status || "pending",
        cloud: true
      };
    },
    async submitIdentity({ legalName, docType, countryCode, file }) {
      const user = await requireV2User();
      if (!(file instanceof File)) throw Object.assign(new Error("identity_document_required"), { code: "identity_document_required" });
      const category = "identity_document";
      const form = new FormData();
      form.append("file", file, file.name || "identity-document");
      form.append("category", category);
      const validation = await client.functions.invoke("validate-upload", { body: form });
      if (validation.error) throw validation.error;
      const details = validation.data || {};
      if (details.accepted !== true) throw Object.assign(new Error(details.error || "upload_validation_failed"), { code: details.error || "upload_validation_failed" });
      const path = `${user.id}/${randomId()}-${safeFileName(file.name)}`;
      const upload = await client.storage.from("private-documents").upload(path, file, { contentType: file.type, upsert: false });
      requireData(upload);
      const fileRow = requireData(await client.from("file_assets").insert({
        owner_id: user.id,
        category,
        bucket_id: "private-documents",
        object_path: path,
        original_name: details.originalName || file.name || "identity-document",
        mime_type: details.mimeType || file.type || "application/octet-stream",
        size_bytes: Number(details.sizeBytes || file.size),
        sha256: details.sha256 || null
      }).select("id,scan_status,created_at").single());
      const applicationId = requireData(await client.rpc("submit_identity_application", {
        legal_name: String(legalName || "").trim(),
        document_type: documentType(docType),
        country_code: String(countryCode || "").trim().toUpperCase(),
        document_file_id: fileRow.id
      }));
      return { id: applicationId, fileId: fileRow.id, scanStatus: fileRow.scan_status || "pending" };
    },
    async uploadFile({ file, category }) {
      const user = await requireV2User();
      if (!(file instanceof File)) throw Object.assign(new Error("file_required"), { code: "file_required" });
      const allowed = new Set(["market_image", "tutoring_request", "tutoring_delivery", "message_attachment", "report_evidence"]);
      if (!allowed.has(String(category || ""))) throw Object.assign(new Error("invalid_file_category"), { code: "invalid_file_category" });
      const form = new FormData();
      form.append("file", file, file.name || "file");
      form.append("category", String(category));
      const validation = await client.functions.invoke("validate-upload", { body: form });
      if (validation.error) throw validation.error;
      const details = validation.data || {};
      if (details.accepted !== true) throw Object.assign(new Error(details.error || "upload_validation_failed"), { code: details.error || "upload_validation_failed" });
      const bucket = category === "market_image" ? "market-media" : "private-documents";
      const path = `${user.id}/${randomId()}-${safeFileName(file.name)}`;
      requireData(await client.storage.from(bucket).upload(path, file, { contentType: details.mimeType || file.type, upsert: false }));
      const row = requireData(await client.from("file_assets").insert({
        owner_id: user.id,
        category,
        bucket_id: bucket,
        object_path: path,
        original_name: details.originalName || file.name || "file",
        mime_type: details.mimeType || file.type || "application/octet-stream",
        size_bytes: Number(details.sizeBytes || file.size),
        sha256: details.sha256 || null
      }).select("id,original_name,mime_type,size_bytes,scan_status,created_at").single());
      return { ...row, fileId: row.id };
    },
    async createTutoringRequest({ addressId, subject, majorCategory, major, type, mentorSummary, brief, deadline, fileIds = [] }) {
      await requireV2User();
      const deadlineDate = new Date(deadline);
      if (Number.isNaN(deadlineDate.getTime())) throw Object.assign(new Error("invalid_deadline"), { code: "invalid_deadline" });
      const summary = String(mentorSummary || brief || "").trim();
      const privateBrief = String(brief || "").trim();
      if (summary.length < 10 || privateBrief.length < 10) throw Object.assign(new Error("invalid_private_brief"), { code: "invalid_private_brief" });
      const id = requireData(await client.rpc("create_tutoring_request", {
        request_address_id: addressId,
        request_subject: String(subject || "").trim(),
        request_major_category: String(majorCategory || "").trim(),
        request_major: String(major || "").trim(),
        request_type: requestType(type),
        request_mentor_summary: summary,
        request_brief_private: privateBrief,
        request_deadline: deadlineDate.toISOString(),
        request_file_ids: Array.isArray(fileIds) ? fileIds.filter(Boolean) : []
      }));
      return { id, cloud: true, status: "pending_review" };
    },
    async listStudentTutoring() {
      const user = await requireV2User();
      const requests = requireData(await client.from("tutoring_requests")
        .select("id,address_id,subject,major_category,major,request_type,mentor_summary,brief_private,country_code,city,currency_code,deadline,status,version,submitted_at,reviewed_at,created_at,updated_at")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })) || [];
      const ids = requests.map((row) => row.id);
      const quotes = ids.length ? (requireData(await client.from("tutoring_quotes").select("id,request_id,mentor_id,revision,amount_minor,currency_code,billing_mode,note,status,created_at").in("request_id", ids)) || []) : [];
      const selections = ids.length ? (requireData(await client.from("tutoring_quote_selections").select("id,request_id,quote_id,status,review_reason,selected_at,reviewed_at").in("request_id", ids)) || []) : [];
      return { requests, quotes, selections };
    },
    async listMentorOpenRequests() {
      await requireV2User();
      return requireData(await client.rpc("get_mentor_open_requests")) || [];
    },
    async submitTutoringQuote({ requestId, amount, currencyCode, billing, note }) {
      await requireV2User();
      const amountMinor = toMinor(amount, currencyCode);
      const id = requireData(await client.rpc("submit_tutoring_quote", {
        target_request_id: requestId,
        quote_amount_minor: amountMinor,
        quote_billing_mode: billingMode(billing),
        quote_note: String(note || "").trim()
      }));
      return { id, amountMinor, currencyCode: String(currencyCode || "").toUpperCase(), cloud: true };
    },
    async selectTutoringQuote(quoteId) {
      await requireV2User();
      return { id: requireData(await client.rpc("select_tutoring_quote", { target_quote_id: quoteId })), cloud: true };
    },
    async listTutoringMessages(requestId) {
      const user = await requireV2User();
      const request = String(requestId || "").trim();
      if (!request) return { conversationId: "", messages: [] };
      const order = requireData(await client.from("tutoring_orders")
        .select("id")
        .eq("request_id", request)
        .or(`student_id.eq.${user.id},mentor_id.eq.${user.id}`)
        .limit(1)
        .maybeSingle());
      if (!order?.id) return { conversationId: "", messages: [] };
      const conversation = requireData(await client.from("conversations")
        .select("id,status")
        .eq("tutoring_order_id", order.id)
        .maybeSingle());
      if (!conversation?.id) return { conversationId: "", messages: [] };
      const rows = requireData(await client.from("messages")
        .select("id,sender_id,body,kind,created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })) || [];
      return {
        conversationId: conversation.id,
        status: conversation.status,
        messages: rows.map((row) => ({
          id: row.id,
          senderId: row.sender_id,
          text: row.body || "",
          kind: row.kind,
          createdAt: row.created_at
        }))
      };
    },
    async sendTutoringMessage({ requestId, text }) {
      const user = await requireV2User();
      const request = String(requestId || "").trim();
      const body = String(text || "").trim();
      if (!request || !body) throw Object.assign(new Error("message_required"), { code: "message_required" });
      const order = requireData(await client.from("tutoring_orders")
        .select("id")
        .eq("request_id", request)
        .or(`student_id.eq.${user.id},mentor_id.eq.${user.id}`)
        .limit(1)
        .maybeSingle());
      if (!order?.id) throw Object.assign(new Error("tutoring_order_not_found"), { code: "tutoring_order_not_found" });
      const conversation = requireData(await client.from("conversations")
        .select("id,status")
        .eq("tutoring_order_id", order.id)
        .maybeSingle());
      if (!conversation?.id) throw Object.assign(new Error("conversation_not_ready"), { code: "conversation_not_ready" });
      if (conversation.status !== "open") throw Object.assign(new Error("conversation_not_open"), { code: "conversation_not_open" });
      const messageId = requireData(await client.rpc("send_message", {
        target_conversation_id: conversation.id,
        client_id: randomId(),
        message_body: body,
        attachment_file_id: null
      }));
      return { id: messageId, conversationId: conversation.id, senderId: user.id, text: body, cloud: true };
    }
  };

  globalThis.CampusLoopPlatformCloud = Object.freeze(api);
})();
