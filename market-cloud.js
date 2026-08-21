(() => {
  "use strict";

  const config = globalThis.CAMPUSLOOP_MARKET_CONFIG || {};
  const configured = /^https:\/\//.test(config.supabaseUrl || "")
    && String(config.supabasePublishableKey || "").length > 20
    && Boolean(globalThis.supabase?.createClient);
  const client = configured
    ? globalThis.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey)
    : null;
  let realtimeChannel = null;

  const profileForAuthUser = async (authUser) => {
    if (!authUser) return null;
    const { data } = await client.from("market_profiles").select("id, display_name, created_at").eq("id", authUser.id).maybeSingle();
    return {
      id: authUser.id,
      email: authUser.email || "",
      name: data?.display_name || authUser.user_metadata?.display_name || String(authUser.email || "CampusLoop 用户").split("@")[0],
      createdAt: data?.created_at || authUser.created_at
    };
  };

  const mapItem = (row, names = {}) => ({
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

  const profilesByIds = async (ids) => {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (!uniqueIds.length) return {};
    const { data, error } = await client.from("market_profiles").select("id, display_name, created_at").in("id", uniqueIds);
    if (error) throw error;
    return Object.fromEntries((data || []).map((profile) => [profile.id, profile.display_name]));
  };

  const requireData = (result) => {
    if (result.error) throw result.error;
    return result.data;
  };

  const api = {
    configured,
    async init() {
      if (!configured) return { user: null };
      const { data } = await client.auth.getSession();
      return { user: await profileForAuthUser(data.session?.user || null) };
    },
    async signUp({ name, email, password }) {
      const data = requireData(await client.auth.signUp({ email, password, options: { data: { display_name: name } } }));
      return { user: await profileForAuthUser(data.user), needsEmailConfirmation: !data.session };
    },
    async signIn({ email, password }) {
      const data = requireData(await client.auth.signInWithPassword({ email, password }));
      return { user: await profileForAuthUser(data.user) };
    },
    async signOut() {
      requireData(await client.auth.signOut());
    },
    async listItems() {
      const rows = requireData(await client.from("market_items").select("*").eq("is_active", true).order("created_at", { ascending: false })) || [];
      const names = await profilesByIds(rows.map((row) => row.seller_id));
      return rows.map((row) => mapItem(row, names));
    },
    async createItem(item) {
      const row = requireData(await client.from("market_items").insert({
        seller_id: item.sellerId,
        title: item.title,
        category: item.category,
        price: item.price,
        currency: item.currency,
        country: item.country,
        city: item.city,
        area: item.area,
        description: item.description,
        image: item.image
      }).select().single());
      return mapItem(row, { [item.sellerId]: item.sellerName });
    },
    async removeItem(itemId) {
      requireData(await client.from("market_items").update({ is_active: false }).eq("id", itemId));
    },
    async openConversation(itemId) {
      return requireData(await client.rpc("open_market_conversation", { target_item_id: itemId }));
    },
    async listConversations(userId) {
      const rows = requireData(await client.from("market_conversations").select("*").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order("updated_at", { ascending: false })) || [];
      if (!rows.length) return { conversations: [], users: [] };
      const ids = rows.map((row) => row.id);
      const [messageRows, memberRows, names] = await Promise.all([
        client.from("market_messages").select("*").in("conversation_id", ids).order("created_at", { ascending: true }).then(requireData),
        client.from("market_conversation_members").select("conversation_id,user_id,last_read_at").in("conversation_id", ids).then(requireData),
        profilesByIds(rows.flatMap((row) => [row.buyer_id, row.seller_id]))
      ]);
      const users = Object.entries(names).map(([id, name]) => ({ id, name }));
      const conversations = rows.map((row) => {
        const members = (memberRows || []).filter((member) => member.conversation_id === row.id);
        const readByTime = Object.fromEntries(members.map((member) => [member.user_id, new Date(member.last_read_at).getTime()]));
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
    },
    async sendMessage(conversationId, senderId, text) {
      requireData(await client.from("market_messages").insert({ conversation_id: conversationId, sender_id: senderId, body: text }));
    },
    async markRead(conversationId, userId) {
      requireData(await client.from("market_conversation_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", conversationId).eq("user_id", userId));
    },
    subscribe(onChange) {
      if (!configured) return () => {};
      realtimeChannel = client.channel("market-message-updates")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "market_messages" }, onChange)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "market_conversation_members" }, onChange)
        .subscribe();
      return () => {
        if (realtimeChannel) client.removeChannel(realtimeChannel);
        realtimeChannel = null;
      };
    }
  };

  globalThis.CampusLoopMarketCloud = Object.freeze(api);
})();
