(() => {
  "use strict";

  /*
   * The browser only ever receives the publishable key. This adapter keeps
   * the old demo schema working while the v2 migrations are rolled out.
   * A v2 runtime/permission error is never silently downgraded to a direct
   * write against the legacy tables.
   */
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
  let realtimeChannel = null;

  const countryNames = new Intl.DisplayNames(["zh-CN"], { type: "region" });
  const currencySymbols = {
    AED: "د.إ", AFN: "؋", ALL: "Lek", AMD: "֏", AOA: "Kz", ARS: "$", AUD: "A$",
    AWG: "ƒ", AZN: "₼", BAM: "KM", BBD: "Bds$", BDT: "৳", BGN: "лв", BHD: "BD",
    BIF: "FBu", BMD: "$", BND: "B$", BOB: "Bs", BRL: "R$", BSD: "B$", BTN: "Nu.",
    BWP: "P", BYN: "Br", BZD: "BZ$", CAD: "C$", CDF: "FC", CHF: "CHF", CLP: "$",
    CNY: "¥", COP: "$", CRC: "₡", CUP: "$", CVE: "$", CZK: "Kč", DJF: "Fdj",
    DKK: "kr", DOP: "RD$", DZD: "دج", EGP: "E£", ERN: "Nfk", ETB: "Br", EUR: "€",
    FJD: "FJ$", GBP: "£", GEL: "₾", GHS: "GH₵", GMD: "D", GNF: "FG", GTQ: "Q",
    GYD: "G$", HKD: "HK$", HNL: "L", HTG: "G", HUF: "Ft", IDR: "Rp", ILS: "₪",
    INR: "₹", IQD: "ع.د", IRR: "﷼", ISK: "kr", JMD: "J$", JOD: "د.ا", JPY: "¥",
    KES: "KSh", KGS: "лв", KHR: "៛", KMF: "CF", KPW: "₩", KRW: "₩", KWD: "د.ك",
    KZT: "₸", LAK: "₭", LBP: "ل.ل", LKR: "රු", LRD: "L$", LSL: "L", LYD: "ل.د",
    MAD: "د.م.", MDL: "L", MGA: "Ar", MKD: "ден", MMK: "K", MNT: "₮", MRO: "UM",
    MRU: "UM", MUR: "₨", MVR: "Rf", MWK: "MK", MXN: "Mex$", MYR: "RM", MZN: "MT",
    NAD: "N$", NGN: "₦", NIO: "C$", NOK: "kr", NPR: "₨", NZD: "NZ$", OMR: "ر.ع.",
    PAB: "B/.", PEN: "S/.", PGK: "K", PHP: "₱", PKR: "₨", PLN: "zł", PYG: "₲",
    QAR: "ر.ق", RON: "lei", RSD: "дин", RUB: "₽", RWF: "FRw", SAR: "ر.س", SBD: "SI$",
    SCR: "₨", SDG: "ج.س.", SEK: "kr", SGD: "S$", SHP: "£", SLE: "Le", SLL: "Le",
    SOS: "S", SRD: "$", SSP: "£", STN: "Db", SVC: "$", SZL: "E", THB: "฿", TJS: "SM",
    TMT: "m", TND: "د.ت", TOP: "T$", TRY: "₺", TTD: "TT$", TWD: "NT$", TZS: "TSh",
    UAH: "₴", UGX: "USh", USD: "$", UYU: "$U", UZS: "лв", VES: "Bs.S", VND: "₫",
    VUV: "VT", WST: "WS$", XAF: "FCFA", XCD: "EC$", XOF: "CFA", XPF: "₣", YER: "﷼",
    ZAR: "R", ZMW: "ZK", ZWG: "ZiG"
  };
  const zeroMinorCurrencies = new Set([
    "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF"
  ]);
  const threeMinorCurrencies = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);

  const randomId = () => globalThis.crypto?.randomUUID?.()
    || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
      const value = Math.random() * 16 | 0;
      const replacement = character === "x" ? value : (value & 0x3 | 0x8);
      return replacement.toString(16);
    });

  const requireData = (result) => {
    if (result?.error) throw result.error;
    return result?.data;
  };
  const errorText = (error) => String(error?.message || error?.details || error?.hint || error || "").toLowerCase();
  const isMissingFunction = (error) => {
    const code = String(error?.code || "");
    const text = errorText(error);
    return code === "42883" || code === "PGRST202"
      || text.includes("could not find the function")
      || text.includes("function public.get_market_feed")
      || text.includes("does not exist");
  };
  const isMissingTable = (error) => {
    const code = String(error?.code || "");
    const text = errorText(error);
    return code === "42P01" || code === "PGRST205"
      || (text.includes("relation") && text.includes("does not exist"))
      || text.includes("could not find the table");
  };

  const profileFallback = (authUser) => {
    if (!authUser) return null;
    return {
      id: authUser.id,
      email: authUser.email || "",
      name: authUser.user_metadata?.display_name
        || String(authUser.email || "CampusLoop 用户").split("@")[0],
      createdAt: authUser.created_at
    };
  };
  const countryLabel = (countryCode) => {
    const code = String(countryCode || "").trim().toUpperCase();
    try { return countryNames.of(code) || code; } catch { return code; }
  };
  const currencyForCode = (currencyCode) => currencySymbols[String(currencyCode || "").toUpperCase()] || String(currencyCode || "").toUpperCase() || "£";
  const minorUnitFor = (currencyCode) => {
    const code = String(currencyCode || "").toUpperCase();
    if (zeroMinorCurrencies.has(code)) return 0;
    if (threeMinorCurrencies.has(code)) return 3;
    return 2;
  };
  const amountFromMinor = (minor, code) => Number(minor) / (10 ** minorUnitFor(code));
  const conditionCode = (value) => ({
    "全新未使用": "new",
    "几乎全新": "like_new",
    "使用良好": "good",
    "有明显使用痕迹": "fair"
  }[String(value || "").trim()] || String(value || "good").trim() || "good");

  const mapLegacyItem = (row, names = {}) => ({
    id: row.id,
    sellerId: row.seller_id,
    sellerName: names[row.seller_id] || "CampusLoop 用户",
    title: row.title,
    category: row.category,
    price: Number(row.price),
    priceLabel: "",
    currency: row.currency,
    country: row.country,
    city: row.city,
    area: row.area,
    description: row.description || "",
    image: row.image || "",
    createdAt: row.created_at
  });
  const mapV2Item = (row, names = {}) => ({
    id: row.id,
    sellerId: row.seller_id,
    sellerName: names[row.seller_id] || "CampusLoop 用户",
    title: row.title,
    category: row.category,
    price: amountFromMinor(row.price_minor, row.currency_code),
    priceMinor: Number(row.price_minor),
    priceLabel: "",
    currency: currencyForCode(row.currency_code),
    currencyCode: row.currency_code,
    country: row.country_code,
    countryName: countryLabel(row.country_code),
    countryCode: row.country_code,
    city: row.city,
    area: row.area || "",
    description: row.description || "",
    image: row.image || "",
    createdAt: row.created_at
  });

  const profileNames = async (ids, table) => {
    const uniqueIds = [...new Set((ids || []).filter(Boolean))];
    if (!uniqueIds.length) return {};
    const { data, error } = await client.from(table).select("id, display_name").in("id", uniqueIds);
    if (error) throw error;
    return Object.fromEntries((data || []).map((profile) => [profile.id, profile.display_name]));
  };

  const detectSchema = async () => {
    if (!configured) return "unavailable";
    const feedProbe = await client.rpc("get_market_feed", {
      feed_country_code: "ZZ",
      feed_city: "__campusloop_probe__",
      feed_category: null
    });
    if (!feedProbe.error) return "v2";
      if (!isMissingFunction(feedProbe.error)) return "unavailable";

    const v2TableProbe = await client.from("market_listings").select("id").limit(1);
    if (!v2TableProbe.error || !isMissingTable(v2TableProbe.error)) return "v2";
    const legacyProbe = await client.from("market_items").select("id").limit(1);
    if (!legacyProbe.error) return "legacy";
    return "unavailable";
  };
  const ensureSchema = async () => {
    if (schema !== "unknown") return schema;
    if (!schemaPromise) {
      schemaPromise = detectSchema().then((detected) => {
        schema = detected;
        return schema;
      }).catch(() => {
        schema = "unavailable";
        return schema;
      });
    }
    return schemaPromise;
  };
  const currentAuthUser = async () => {
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    return error ? null : data?.user || null;
  };
  const currentAuthState = async () => {
    if (!client) return { user: null, session: null, roles: [] };
    const { data } = await client.auth.getSession();
    const user = data?.session?.user || null;
    if (!user || schema !== "v2") return { user, session: data?.session || null, roles: [] };
    const result = await client.from("user_roles").select("role").eq("user_id", user.id);
    if (result.error) throw result.error;
    return {
      user,
      session: data?.session || null,
      roles: (result.data || []).map((row) => row.role).filter(Boolean)
    };
  };
  const checkRole = async (requiredRole) => {
    const state = await currentAuthState();
    if (!state.user) return { authorized: false, role: "", user: null, roles: [] };
    const requested = String(requiredRole || "").trim().toLowerCase();
    if (schema !== "v2") {
      return { authorized: requested === "user" || requested === "", role: "", user: state.user, roles: [] };
    }
    const roleAliases = {
      admin: "operations_admin",
      operations: "operations_admin",
      operations_admin: "operations_admin",
      super: "super_admin",
      super_admin: "super_admin",
      mentor: "mentor",
      user: "user"
    };
    const target = roleAliases[requested] || requested;
    let authorized = state.roles.includes(target);
    if (target === "operations_admin" || target === "super_admin") {
      const result = target === "super_admin"
        ? await client.rpc("is_super_admin", { target_user_id: state.user.id })
        : await client.rpc("is_admin", { target_user_id: state.user.id });
      authorized = !result.error && result.data === true;
    } else if (target === "mentor") {
      const result = await client.rpc("is_active_mentor", { target_user_id: state.user.id });
      authorized = !result.error && result.data === true;
    }
    const role = state.roles.includes("super_admin") ? "super_admin"
      : state.roles.includes("operations_admin") ? "operations_admin"
        : state.roles.includes("mentor") ? "mentor" : "user";
    return { authorized, role, user: state.user, roles: state.roles };
  };
  const profileForAuthUser = async (authUser) => {
    if (!authUser || !client) return null;
    const table = schema === "legacy" ? "market_profiles" : "profiles";
    const { data, error } = await client.from(table).select("id, display_name, created_at").eq("id", authUser.id).maybeSingle();
    if (error) {
      if (schema === "legacy" || isMissingTable(error)) return profileFallback(authUser);
      throw error;
    }
    return {
      id: authUser.id,
      email: authUser.email || "",
      name: data?.display_name || authUser.user_metadata?.display_name || String(authUser.email || "CampusLoop 用户").split("@")[0],
      createdAt: data?.created_at || authUser.created_at
    };
  };
  const defaultAddress = async (userId) => {
    if (!userId || schema !== "v2") return null;
    const { data, error } = await client.from("addresses").select("id, country_code, city, currency_code, address_line, is_default")
      .eq("user_id", userId).eq("is_default", true).maybeSingle();
    if (error) throw error;
    return data || null;
  };
  const v2Feed = async (options = {}) => {
    // An explicitly selected browse location must win over the account
    // default. This lets a signed-in user browse another city without
    // rewriting their saved address, while still preserving the default
    // address behavior when no location was supplied.
    const explicitCountry = String(options?.countryCode || "").trim().toUpperCase();
    const explicitCity = String(options?.city || "").trim();
    const hasExplicitLocation = Boolean(explicitCountry && explicitCity);
    const authUser = hasExplicitLocation ? null : await currentAuthUser();
    const address = hasExplicitLocation ? null : await defaultAddress(authUser?.id);
    const configuredCountry = String(config.defaultFeedCountryCode || "").trim().toUpperCase();
    const configuredCity = String(config.defaultFeedCity || "").trim();
    const feedCountry = explicitCountry || String(address?.country_code || configuredCountry).trim().toUpperCase();
    const feedCity = explicitCity || String(address?.city || configuredCity).trim();
    const feedCategory = String(options?.category || "").trim() || null;
    if (feedCountry && feedCity) {
      const rows = requireData(await client.rpc("get_market_feed", {
        feed_country_code: feedCountry,
        feed_city: feedCity,
        feed_category: feedCategory
      })) || [];
      const names = await profileNames(rows.map((row) => row.seller_id), "profiles");
      return rows.map((row) => mapV2Item(row, names));
    }
    // Guests have no saved address. This is a public-column allowlist query;
    // RLS still limits results to approved listings with available stock.
    const rows = requireData(await client.from("market_listings")
      .select("id,seller_id,title,category,condition,description,price_minor,currency_code,country_code,city,quantity,available_quantity,delivery_methods,created_at")
      .eq("status", "approved").gt("available_quantity", 0).order("created_at", { ascending: false })) || [];
    const names = await profileNames(rows.map((row) => row.seller_id), "profiles");
    return rows.map((row) => mapV2Item(row, names));
  };
  const legacyListItems = async () => {
    const rows = requireData(await client.from("market_items").select("*").eq("is_active", true).order("created_at", { ascending: false })) || [];
    const names = await profileNames(rows.map((row) => row.seller_id), "market_profiles");
    return rows.map((row) => mapLegacyItem(row, names));
  };

  const v2ConversationData = async (userId) => {
    const memberRows = requireData(await client.from("conversation_members").select("conversation_id,user_id,last_read_at,left_at")
      .eq("user_id", userId).is("left_at", null)) || [];
    const ids = memberRows.map((row) => row.conversation_id);
    if (!ids.length) return { conversations: [], users: [] };
    const [rows, messages] = await Promise.all([
      client.from("conversations").select("id,kind,market_order_id,tutoring_order_id,created_at,updated_at,status").in("id", ids).then(requireData),
      client.from("messages").select("id,conversation_id,sender_id,body,kind,created_at").in("conversation_id", ids).order("created_at", { ascending: true }).then(requireData)
    ]);
    const messageRows = messages || [];
    const receiptRows = messageRows.length
      ? requireData(await client.from("message_receipts").select("message_id,user_id,delivered_at,read_at").in("message_id", messageRows.map((row) => row.id))) || []
      : [];
    const conversationRows = rows || [];
    const marketOrderIds = conversationRows.map((row) => row.market_order_id).filter(Boolean);
    const orderRows = marketOrderIds.length
      ? requireData(await client.from("market_orders").select("id,listing_id,buyer_id,seller_id").in("id", marketOrderIds)) || []
      : [];
    const orderById = Object.fromEntries(orderRows.map((row) => [row.id, row]));
    const names = await profileNames(orderRows.flatMap((row) => [row.buyer_id, row.seller_id]), "profiles");
    const users = Object.entries(names).map(([id, name]) => ({ id, name }));
    const conversations = conversationRows.map((row) => {
      const order = orderById[row.market_order_id];
      const participants = order ? [order.buyer_id, order.seller_id] : [];
      const ownMembers = memberRows.filter((member) => member.conversation_id === row.id);
      const readByTime = Object.fromEntries(ownMembers.map((member) => [member.user_id, new Date(member.last_read_at || 0).getTime()]));
      return {
        id: row.id,
        itemId: order?.listing_id || row.tutoring_order_id || row.id,
        participants,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        messages: messageRows.filter((message) => message.conversation_id === row.id).map((message) => {
          const receipts = receiptRows.filter((receipt) => receipt.message_id === message.id);
          const readBy = receipts.filter((receipt) => receipt.read_at).map((receipt) => receipt.user_id);
          return {
            id: message.id,
            senderId: message.sender_id,
            text: message.body || (message.kind === "file" ? "[文件]" : ""),
            createdAt: message.created_at,
            readBy: [...new Set([...readBy, ...participants.filter((participant) => readByTime[participant] >= new Date(message.created_at).getTime())])]
          };
        })
      };
    });
    return { conversations, users };
  };
  const legacyConversationData = async (userId) => {
    const rows = requireData(await client.from("market_conversations").select("*").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order("updated_at", { ascending: false })) || [];
    if (!rows.length) return { conversations: [], users: [] };
    const ids = rows.map((row) => row.id);
    const [messageRows, memberRows, names] = await Promise.all([
      client.from("market_messages").select("*").in("conversation_id", ids).order("created_at", { ascending: true }).then(requireData),
      client.from("market_conversation_members").select("conversation_id,user_id,last_read_at").in("conversation_id", ids).then(requireData),
      profileNames(rows.flatMap((row) => [row.buyer_id, row.seller_id]), "market_profiles")
    ]);
    const users = Object.entries(names).map(([id, name]) => ({ id, name }));
    const conversations = rows.map((row) => {
      const members = (memberRows || []).filter((member) => member.conversation_id === row.id);
      const readByTime = Object.fromEntries(members.map((member) => [member.user_id, new Date(member.last_read_at || 0).getTime()]));
      const participants = [row.buyer_id, row.seller_id];
      return {
        id: row.id,
        itemId: row.item_id,
        participants,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        messages: (messageRows || []).filter((message) => message.conversation_id === row.id).map((message) => ({
          id: message.id,
          senderId: message.sender_id,
          text: message.body,
          createdAt: message.created_at,
          readBy: participants.filter((participant) => readByTime[participant] >= new Date(message.created_at).getTime())
        }))
      };
    });
    return { conversations, users };
  };

  const api = {
    configured,
    // Reuse the single browser client from the shared platform adapter. This
    // keeps auth state and realtime channels on one GoTrue instance.
    get client() { return client; },
    get mode() { return schema; },
    async init() {
      if (!configured) return { user: null, mode: "unavailable" };
      await ensureSchema();
      const { data } = await client.auth.getSession();
      return { user: await profileForAuthUser(data?.session?.user || null), mode: schema };
    },
    async signUp({ name, email, password }) {
      const data = requireData(await client.auth.signUp({ email, password, options: { data: { display_name: name } } }));
      await ensureSchema();
      return { user: await profileForAuthUser(data.user), needsEmailConfirmation: !data.session };
    },
    async signIn({ email, password }) {
      const data = requireData(await client.auth.signInWithPassword({ email, password }));
      await ensureSchema();
      return { user: await profileForAuthUser(data.user) };
    },
    async signOut() {
      requireData(await client.auth.signOut());
    },
    async getSession() {
      await ensureSchema();
      return { ...(await currentAuthState()), mode: schema };
    },
    async checkRole(requiredRole) {
      await ensureSchema();
      return checkRole(requiredRole);
    },
    async listItems(options = {}) {
      const activeSchema = await ensureSchema();
      if (activeSchema === "v2") return v2Feed(options);
      if (activeSchema === "legacy") return legacyListItems();
      return [];
    },
    async createItem(item) {
      const activeSchema = await ensureSchema();
      if (activeSchema === "legacy") {
        const row = requireData(await client.from("market_items").insert({
          seller_id: item.sellerId, title: item.title, category: item.category, price: item.price,
          currency: item.currency, country: item.country, city: item.city, area: item.area,
          description: item.description, image: item.image
        }).select().single());
        return mapLegacyItem(row, { [item.sellerId]: item.sellerName });
      }
      if (activeSchema !== "v2") throw new Error("cloud_schema_unavailable");
      const authUser = await currentAuthUser();
      if (!authUser?.id) throw new Error("auth_required");
      const selectedAddress = item.addressId
        ? requireData(await client.from("addresses").select("id,currency_code,country_code,city").eq("id", item.addressId).eq("user_id", authUser.id).maybeSingle())
        : await defaultAddress(authUser.id);
      const addressId = selectedAddress?.id;
      const imageFileIds = Array.isArray(item.imageFileIds) ? item.imageFileIds.filter(Boolean) : [];
      if (!addressId || !imageFileIds.length) {
        const error = new Error("v2_listing_requires_address_and_scanned_image");
        error.code = "v2_listing_requires_address_and_scanned_image";
        throw error;
      }
      const priceMinor = Math.round(Number(item.price) * (10 ** minorUnitFor(selectedAddress.currency_code)));
      const listingId = requireData(await client.rpc("submit_market_listing", {
        listing_address_id: addressId, listing_title: item.title, listing_category: item.category,
        listing_condition: conditionCode(item.condition), listing_description: item.description || "",
        listing_price_minor: priceMinor, listing_quantity: Math.max(1, Number(item.quantity || 1)),
        listing_delivery_methods: item.deliveryMethods || ["pickup"], image_file_ids: imageFileIds
      }));
      return (await v2Feed()).find((row) => row.id === listingId) || {
        id: listingId, sellerId: item.sellerId, sellerName: item.sellerName, title: item.title,
        category: item.category, price: item.price, currency: currencyForCode(selectedAddress.currency_code), country: countryLabel(selectedAddress.country_code),
        city: selectedAddress.city, area: item.area, description: item.description || "", image: "",
        createdAt: new Date().toISOString()
      };
    },
    async removeItem(itemId) {
      const activeSchema = await ensureSchema();
      if (activeSchema === "legacy") {
        requireData(await client.from("market_items").update({ is_active: false }).eq("id", itemId));
        return;
      }
      const error = new Error("v2_listing_archive_requires_review_rpc");
      error.code = "v2_listing_archive_requires_review_rpc";
      throw error;
    },
    async openConversation(itemId) {
      const activeSchema = await ensureSchema();
      if (activeSchema === "legacy") return requireData(await client.rpc("open_market_conversation", { target_item_id: itemId }));
      const error = new Error("market_order_required");
      error.code = "market_order_required";
      throw error;
    },
    async listConversations(userId) {
      const activeSchema = await ensureSchema();
      if (activeSchema === "v2") return v2ConversationData(userId);
      if (activeSchema === "legacy") return legacyConversationData(userId);
      return { conversations: [], users: [] };
    },
    async sendMessage(conversationId, senderId, text) {
      const activeSchema = await ensureSchema();
      if (activeSchema === "v2") {
        return requireData(await client.rpc("send_message", {
          target_conversation_id: conversationId, client_id: randomId(), message_body: text, attachment_file_id: null
        }));
      }
      if (activeSchema === "legacy") {
        return requireData(await client.from("market_messages").insert({ conversation_id: conversationId, sender_id: senderId, body: text }));
      }
      throw new Error("cloud_schema_unavailable");
    },
    async markRead(conversationId, userId) {
      const activeSchema = await ensureSchema();
      if (activeSchema === "v2") {
        const latest = requireData(await client.from("messages").select("id").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(1).maybeSingle());
        if (!latest?.id) return;
        requireData(await client.rpc("mark_conversation_read", { target_conversation_id: conversationId, through_message_id: latest.id }));
        return;
      }
      if (activeSchema === "legacy") requireData(await client.from("market_conversation_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", conversationId).eq("user_id", userId));
    },
    subscribe(onChange) {
      if (!configured || !client) return () => {};
      const tables = schema === "v2"
        ? ["market_listings", "market_listing_media", "market_orders", "messages", "message_receipts", "conversation_members", "conversations", "notifications"]
        : ["market_messages", "market_conversation_members"];
      realtimeChannel = client.channel(`campusloop-${schema}-updates`);
      tables.forEach((table) => {
        realtimeChannel = realtimeChannel.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
      });
      realtimeChannel.subscribe();
      return () => {
        if (realtimeChannel) client.removeChannel(realtimeChannel);
        realtimeChannel = null;
      };
    }
  };

  globalThis.CampusLoopMarketCloud = Object.freeze(api);
})();
