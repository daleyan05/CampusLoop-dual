(() => {
  "use strict";

  const STORAGE = {
    users: "campusLoopMarketUsersV2",
    session: "campusLoopMarketSessionV2",
    items: "campusLoopMarketItemsV2",
    conversations: "campusLoopMarketConversationsV2",
    migrated: "campusLoopMarketMigratedV2"
  };

  const LEGACY = {
    users: "campusLoopAccounts",
    session: "campusLoopActiveUser",
    items: "campusLoopPostedItems"
  };

  const categoryIcons = {
    教材书籍: "📚",
    家具家居: "🪑",
    数码电器: "💻",
    厨房用品: "🍳",
    服饰用品: "🧥",
    其他: "📦"
  };

  // 193 个联合国会员国，加上巴勒斯坦和梵蒂冈，共 195 个国家。
  const countryCodes = "AF,AL,DZ,AD,AO,AG,AR,AM,AU,AT,AZ,BS,BH,BD,BB,BY,BE,BZ,BJ,BT,BO,BA,BW,BR,BN,BG,BF,BI,CV,KH,CM,CA,CF,TD,CL,CN,CO,KM,CG,CR,CI,HR,CU,CY,CZ,CD,DK,DJ,DM,DO,EC,EG,SV,GQ,ER,EE,SZ,ET,FJ,FI,FR,GA,GM,GE,DE,GH,GR,GD,GT,GN,GW,GY,HT,HN,HU,IS,IN,ID,IR,IQ,IE,IL,IT,JM,JP,JO,KZ,KE,KI,KP,KR,KW,KG,LA,LV,LB,LS,LR,LY,LI,LT,LU,MG,MW,MY,MV,ML,MT,MH,MR,MU,MX,FM,MD,MC,MN,ME,MA,MZ,MM,NA,NR,NP,NL,NZ,NI,NE,NG,MK,NO,OM,PK,PW,PA,PG,PY,PE,PH,PL,PT,QA,RO,RU,RW,KN,LC,VC,WS,SM,ST,SA,SN,RS,SC,SL,SG,SK,SI,SB,SO,ZA,SS,ES,LK,SD,SR,SE,CH,SY,TJ,TZ,TH,TL,TG,TO,TT,TN,TR,TM,TV,UG,UA,AE,GB,US,UY,UZ,VU,VE,VN,YE,ZM,ZW,PS,VA".split(",");
  const regionNames = new Intl.DisplayNames(["zh-CN"], { type: "region" });
  const countryEntries = countryCodes
    .map((code) => ({ code, name: regionNames.of(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  const countryNames = countryEntries.map((entry) => entry.name);
  const countryCodeByName = Object.fromEntries(countryEntries.map((entry) => [entry.name, entry.code]));
  const locationCatalog = globalThis.CAMPUSLOOP_LOCATION_DATA || {};
  const customLocationValue = "__custom__";
  const cityIndexCache = new Map();

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const uid = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

  function safeLoad(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function parseLegacyPrice(value) {
    const text = String(value || "").trim();
    const currencyMatch = text.match(/^(C\$|A\$|NZ\$|S\$|MX\$|R\$|£|¥|\$|€|₩|₹|฿|₱|₽|RM|CHF|kr|zł|Kč|Ft|₺)/);
    const amountMatch = text.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
    return {
      currency: currencyMatch?.[1] || "£",
      price: amountMatch ? Number(amountMatch[0]) : null,
      priceLabel: amountMatch ? "" : "价格面议"
    };
  }

  function migrateLegacyData() {
    if (localStorage.getItem(STORAGE.migrated)) return;

    const existingUsers = safeLoad(STORAGE.users, []);
    const legacyUsers = safeLoad(LEGACY.users, []);
    const migratedUsers = legacyUsers
      .filter((account) => account?.email)
      .map((account) => ({
        id: `user:${normalizeEmail(account.email)}`,
        name: String(account.name || "CampusLoop 用户").trim(),
        email: normalizeEmail(account.email),
        password: String(account.password || ""),
        createdAt: account.createdAt || new Date().toISOString()
      }));

    const userMap = new Map([...existingUsers, ...migratedUsers].map((user) => [user.email, user]));
    save(STORAGE.users, [...userMap.values()]);

    const existingItems = safeLoad(STORAGE.items, []);
    const legacyItems = safeLoad(LEGACY.items, []);
    const migratedItems = legacyItems.map((item, index) => {
      const parsedPrice = parseLegacyPrice(item.price);
      const sellerEmail = normalizeEmail(item.sellerEmail);
      return {
        id: String(item.id || `legacy-item-${index}-${Date.now()}`),
        title: String(item.title || "二手商品"),
        category: "其他",
        price: parsedPrice.price,
        priceLabel: parsedPrice.priceLabel,
        currency: parsedPrice.currency,
        country: String(item.country || "未填写"),
        city: String(item.city || "未填写"),
        area: String(item.area || "未填写"),
        description: String(item.note || item.description || ""),
        image: String(item.image || item.photo || ""),
        sellerId: sellerEmail ? `user:${sellerEmail}` : `legacy-seller:${index}`,
        sellerName: String(item.sellerName || item.seller || "CampusLoop 用户"),
        createdAt: item.createdAt || new Date().toISOString()
      };
    });

    const itemMap = new Map([...migratedItems, ...existingItems].map((item) => [item.id, item]));
    if (itemMap.size) save(STORAGE.items, [...itemMap.values()]);

    if (!safeLoad(STORAGE.session, null)) {
      const legacySession = safeLoad(LEGACY.session, null);
      const email = normalizeEmail(legacySession?.email);
      if (email && userMap.has(email)) save(STORAGE.session, { userId: userMap.get(email).id });
    }

    localStorage.setItem(STORAGE.migrated, "1");
  }

  function seedItems() {
    if (localStorage.getItem(STORAGE.items)) return;
    const now = Date.now();
    save(STORAGE.items, [
      {
        id: "demo-item-desk",
        title: "实木学习书桌",
        category: "家具家居",
        price: 35,
        priceLabel: "",
        currency: "£",
        country: "英国",
        city: "London",
        area: "Bloomsbury",
        description: "九成新，桌面宽敞，适合宿舍学习。需自取。",
        image: "",
        sellerId: "demo-seller-lin",
        sellerName: "Lin",
        createdAt: new Date(now - 40 * 60 * 1000).toISOString()
      },
      {
        id: "demo-item-book",
        title: "商科核心教材套装",
        category: "教材书籍",
        price: 18,
        priceLabel: "",
        currency: "£",
        country: "英国",
        city: "Manchester",
        area: "Oxford Road",
        description: "共 4 本，有少量课堂笔记，可在大学附近交付。",
        image: "",
        sellerId: "demo-seller-mia",
        sellerName: "Mia",
        createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "demo-item-monitor",
        title: "24 寸显示器",
        category: "数码电器",
        price: 50,
        priceLabel: "",
        currency: "£",
        country: "英国",
        city: "London",
        area: "Canary Wharf",
        description: "1080P，接口正常，附电源线和 HDMI 线。",
        image: "",
        sellerId: "demo-seller-chen",
        sellerName: "Chen",
        createdAt: new Date(now - 8 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "demo-item-cooker",
        title: "小型电饭煲",
        category: "厨房用品",
        price: 60,
        priceLabel: "",
        currency: "¥",
        country: "中国",
        city: "Shanghai",
        area: "杨浦区",
        description: "适合一到两人使用，搬家出清，可地铁站交付。",
        image: "",
        sellerId: "demo-seller-yao",
        sellerName: "Yao",
        createdAt: new Date(now - 22 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "demo-item-coat",
        title: "防水冬季外套",
        category: "服饰用品",
        price: 28,
        priceLabel: "",
        currency: "$",
        country: "美国",
        city: "Boston",
        area: "Allston",
        description: "M 码，只穿过几次，保暖防雨。",
        image: "",
        sellerId: "demo-seller-ivy",
        sellerName: "Ivy",
        createdAt: new Date(now - 30 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "demo-item-lamp",
        title: "可调光护眼台灯",
        category: "家具家居",
        price: 12,
        priceLabel: "",
        currency: "€",
        country: "法国",
        city: "Paris",
        area: "第十三区",
        description: "三档色温，USB 供电，灯光和按键都正常。",
        image: "",
        sellerId: "demo-seller-lou",
        sellerName: "Lou",
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]);
  }

  migrateLegacyData();
  seedItems();

  let users = safeLoad(STORAGE.users, []);
  let items = safeLoad(STORAGE.items, []);
  const demoCityById = {
    "demo-item-desk": "London",
    "demo-item-book": "Manchester",
    "demo-item-monitor": "London",
    "demo-item-cooker": "Shanghai",
    "demo-item-coat": "Boston",
    "demo-item-lamp": "Paris"
  };
  let demoLocationsChanged = false;
  items = items.map((item) => {
    const city = demoCityById[item.id];
    if (!city || city === item.city) return item;
    demoLocationsChanged = true;
    return { ...item, city };
  });
  if (demoLocationsChanged) save(STORAGE.items, items);
  let conversations = safeLoad(STORAGE.conversations, []);
  let session = safeLoad(STORAGE.session, null);
  let currentUser = users.find((user) => user.id === session?.userId) || null;
  let authMode = "login";
  let pendingAction = null;
  let selectedConversationId = "";
  let pendingPhoto = "";
  let toastTimer = 0;

  const elements = {
    accountLabel: $("#accountLabel"),
    authButton: $("#authButton"),
    logoutButton: $("#logoutButton"),
    authModal: $("#authModal"),
    authForm: $("#authForm"),
    authName: $("#authName"),
    authEmail: $("#authEmail"),
    authPassword: $("#authPassword"),
    authMessage: $("#authMessage"),
    authSubmitButton: $("#authSubmitButton"),
    nameField: $("#nameField"),
    itemModal: $("#itemModal"),
    itemForm: $("#itemForm"),
    itemMessage: $("#itemMessage"),
    itemPhotoInput: $("#itemPhotoInput"),
    itemCountryInput: $("#itemCountryInput"),
    itemCityInput: $("#itemCityInput"),
    itemAreaInput: $("#itemAreaInput"),
    itemCityCustomField: $("#itemCityCustomField"),
    itemCityCustomInput: $("#itemCityCustomInput"),
    itemAreaCustomField: $("#itemAreaCustomField"),
    itemAreaCustomInput: $("#itemAreaCustomInput"),
    photoPreview: $("#photoPreview"),
    searchInput: $("#searchInput"),
    countryFilter: $("#countryFilter"),
    cityFilter: $("#cityFilter"),
    areaFilter: $("#areaFilter"),
    categoryFilter: $("#categoryFilter"),
    sortSelect: $("#sortSelect"),
    clearFiltersButton: $("#clearFiltersButton"),
    resultCount: $("#resultCount"),
    itemGrid: $("#itemGrid"),
    messageLoginNote: $("#messageLoginNote"),
    messageLayout: $("#messageLayout"),
    conversationItems: $("#conversationItems"),
    chatAvatar: $("#chatAvatar"),
    chatTitle: $("#chatTitle"),
    chatMeta: $("#chatMeta"),
    messageHistory: $("#messageHistory"),
    messageForm: $("#messageForm"),
    messageInput: $("#messageInput"),
    unreadBadge: $("#unreadBadge"),
    toast: $("#toast")
  };

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 2600);
  }

  function initials(name) {
    return String(name || "CL")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "CL";
  }

  function formatPrice(item) {
    if (item.priceLabel) return item.priceLabel;
    if (!Number.isFinite(Number(item.price))) return "价格面议";
    const amount = Number(item.price);
    return `${item.currency || "£"}${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "刚刚";
    return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
  }

  function findItem(itemId) {
    return items.find((item) => item.id === itemId);
  }

  function findUser(userId) {
    return users.find((user) => user.id === userId);
  }

  function saveItems() {
    save(STORAGE.items, items);
  }

  function saveConversations() {
    save(STORAGE.conversations, conversations);
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  }

  function fillSelect(select, values, allLabel, selectedValue) {
    select.replaceChildren();
    const fragment = document.createDocumentFragment();
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = allLabel;
    fragment.append(allOption);
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      fragment.append(option);
    });
    select.append(fragment);
    select.value = values.includes(selectedValue) ? selectedValue : "all";
  }

  function catalogForCountry(countryName) {
    const countryCode = countryCodeByName[countryName];
    return locationCatalog[countryCode] || { s: {}, c: [] };
  }

  function cityIndexForCountry(countryName) {
    if (cityIndexCache.has(countryName)) return cityIndexCache.get(countryName);
    const index = new Map();
    catalogForCountry(countryName).c.forEach(([city, stateCode]) => {
      if (!index.has(city)) index.set(city, new Set());
      if (stateCode) index.get(city).add(stateCode);
    });
    cityIndexCache.set(countryName, index);
    return index;
  }

  function citiesForCountry(countryName) {
    if (countryName === "all") return [];
    return unique([
      ...cityIndexForCountry(countryName).keys(),
      ...items.filter((item) => item.country === countryName).map((item) => item.city)
    ]);
  }

  function areasForLocation(countryName, cityName) {
    if (countryName === "all") return [];
    const catalog = catalogForCountry(countryName);
    let catalogAreas;
    if (cityName === "all") {
      catalogAreas = Object.values(catalog.s);
    } else {
      const stateCodes = cityIndexForCountry(countryName).get(cityName) || new Set();
      catalogAreas = [...stateCodes].map((code) => catalog.s[code] || code);
    }
    const itemAreas = items
      .filter((item) => item.country === countryName)
      .filter((item) => cityName === "all" || item.city === cityName)
      .map((item) => item.area);
    return unique([...catalogAreas, ...itemAreas]);
  }

  function itemMatchesArea(item, selectedArea) {
    if (selectedArea === "all" || item.area === selectedArea) return true;
    const catalog = catalogForCountry(item.country);
    const stateCodes = cityIndexForCountry(item.country).get(item.city) || new Set();
    return [...stateCodes].some((code) => (catalog.s[code] || code) === selectedArea);
  }

  function syncLocationFilters(changed = "") {
    const previousCountry = elements.countryFilter.value || "all";
    const previousCity = elements.cityFilter.value || "all";
    const previousArea = elements.areaFilter.value || "all";
    fillSelect(elements.countryFilter, countryNames, "全部国家", previousCountry);

    const selectedCountry = elements.countryFilter.value;
    const cities = citiesForCountry(selectedCountry);
    const cityAllLabel = selectedCountry === "all" ? "全部城市（请先选择国家）" : "全部城市";
    fillSelect(elements.cityFilter, cities, cityAllLabel, changed === "country" ? "all" : previousCity);

    const selectedCity = elements.cityFilter.value;
    const areas = areasForLocation(selectedCountry, selectedCity);
    const areaAllLabel = selectedCountry === "all" ? "全部地区（请先选择国家）" : "全部地区 / 州省";
    fillSelect(elements.areaFilter, areas, areaAllLabel, changed === "country" || changed === "city" ? "all" : previousArea);
  }

  function filteredItems() {
    const query = elements.searchInput.value.trim().toLocaleLowerCase("zh-CN");
    const country = elements.countryFilter.value;
    const city = elements.cityFilter.value;
    const area = elements.areaFilter.value;
    const category = elements.categoryFilter.value;
    const result = items.filter((item) => {
      const haystack = `${item.title} ${item.description} ${item.country} ${item.city} ${item.area} ${item.category}`.toLocaleLowerCase("zh-CN");
      return (!query || haystack.includes(query))
        && (country === "all" || item.country === country)
        && (city === "all" || item.city === city)
        && itemMatchesArea(item, area)
        && (category === "all" || item.category === category);
    });
    const sortablePrice = (item, fallback) => Number.isFinite(item.price) ? item.price : fallback;

    if (elements.sortSelect.value === "priceAsc") {
      result.sort((a, b) => sortablePrice(a, Infinity) - sortablePrice(b, Infinity));
    } else if (elements.sortSelect.value === "priceDesc") {
      result.sort((a, b) => sortablePrice(b, -Infinity) - sortablePrice(a, -Infinity));
    } else {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return result;
  }

  function createItemCard(item) {
    const card = document.createElement("article");
    card.className = "item-card";

    const photo = document.createElement("div");
    photo.className = "item-photo";
    if (item.image) {
      const image = document.createElement("img");
      image.src = item.image;
      image.alt = item.title;
      photo.append(image);
    } else {
      photo.textContent = categoryIcons[item.category] || categoryIcons.其他;
    }
    const chip = document.createElement("span");
    chip.className = "category-chip";
    chip.textContent = item.category || "其他";
    photo.append(chip);

    const body = document.createElement("div");
    body.className = "item-body";
    const titleRow = document.createElement("div");
    titleRow.className = "item-title-row";
    const title = document.createElement("h3");
    title.textContent = item.title;
    const price = document.createElement("span");
    price.className = "item-price";
    price.textContent = formatPrice(item);
    titleRow.append(title, price);

    const description = document.createElement("p");
    description.className = "item-description";
    description.textContent = item.description || "卖家暂未填写商品描述。";
    const location = document.createElement("span");
    location.className = "item-location";
    location.textContent = `⌖ ${item.country} · ${item.city} · ${item.area}`;
    const seller = document.createElement("span");
    seller.className = "item-seller";
    seller.textContent = `卖家：${item.sellerName || "CampusLoop 用户"} · ${formatDate(item.createdAt)}`;

    const actions = document.createElement("div");
    actions.className = "item-actions";
    const contactButton = document.createElement("button");
    contactButton.className = "primary-button small";
    contactButton.type = "button";
    contactButton.textContent = currentUser?.id === item.sellerId ? "查看商品会话" : "联系卖家";
    contactButton.addEventListener("click", () => {
      if (currentUser?.id === item.sellerId) {
        const ownConversation = conversations.find((conversation) => conversation.itemId === item.id && conversation.participants.includes(currentUser.id));
        if (ownConversation) selectConversation(ownConversation.id, true);
        else showToast("这件商品暂时还没有买家咨询。");
      } else {
        contactSeller(item.id);
      }
    });
    actions.append(contactButton);

    if (currentUser?.id === item.sellerId) {
      const removeButton = document.createElement("button");
      removeButton.className = "remove-button";
      removeButton.type = "button";
      removeButton.textContent = "下架";
      removeButton.addEventListener("click", () => removeItem(item.id));
      actions.append(removeButton);
    } else {
      actions.classList.add("single");
    }

    body.append(titleRow, description, location, seller, actions);
    card.append(photo, body);
    return card;
  }

  function renderItems() {
    const result = filteredItems();
    elements.resultCount.textContent = `${result.length} 件商品`;
    elements.itemGrid.replaceChildren();
    if (!result.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      const strong = document.createElement("strong");
      strong.textContent = "没有找到匹配的商品";
      const span = document.createElement("span");
      span.textContent = "可以清除筛选条件，或发布一件新的二手商品。";
      empty.append(strong, span);
      elements.itemGrid.append(empty);
      return;
    }
    result.forEach((item) => elements.itemGrid.append(createItemCard(item)));
  }

  function renderAccount() {
    const loggedIn = Boolean(currentUser);
    elements.accountLabel.hidden = !loggedIn;
    elements.logoutButton.hidden = !loggedIn;
    elements.authButton.hidden = loggedIn;
    elements.accountLabel.textContent = loggedIn ? `你好，${currentUser.name}` : "";
    renderItems();
    renderMessageCenter();
  }

  function setAuthMode(mode) {
    authMode = mode === "register" ? "register" : "login";
    const registering = authMode === "register";
    $$(".auth-tab").forEach((tab) => {
      const active = tab.dataset.authMode === authMode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    elements.nameField.hidden = !registering;
    elements.authName.required = registering;
    elements.authPassword.autocomplete = registering ? "new-password" : "current-password";
    elements.authSubmitButton.textContent = registering ? "创建账号" : "登录账号";
    elements.authMessage.textContent = "";
    elements.authMessage.classList.remove("success");
  }

  function openAuth(mode = "login", action = null) {
    pendingAction = action;
    elements.authForm.reset();
    setAuthMode(mode);
    elements.authModal.hidden = false;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => (authMode === "register" ? elements.authName : elements.authEmail).focus(), 0);
  }

  function closeModal(modal, clearPending = true) {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (clearPending) pendingAction = null;
  }

  function finishAuthentication(user) {
    currentUser = user;
    session = { userId: user.id };
    save(STORAGE.session, session);
    const action = pendingAction;
    closeModal(elements.authModal, false);
    pendingAction = null;
    renderAccount();
    showToast(`欢迎，${user.name}`);
    if (action?.type === "post") openItemModal();
    if (action?.type === "contact") contactSeller(action.itemId);
  }

  function handleAuthSubmit(event) {
    event.preventDefault();
    const email = normalizeEmail(elements.authEmail.value);
    const password = elements.authPassword.value;
    const name = elements.authName.value.trim();
    elements.authMessage.classList.remove("success");

    if (!email || !password || (authMode === "register" && !name)) {
      elements.authMessage.textContent = "请完整填写账号信息。";
      return;
    }
    if (password.length < 6) {
      elements.authMessage.textContent = "密码至少需要 6 位。";
      return;
    }

    if (authMode === "register") {
      if (users.some((user) => user.email === email)) {
        elements.authMessage.textContent = "这个邮箱已经注册，可以直接登录。";
        return;
      }
      const user = { id: `user:${email}`, name, email, password, createdAt: new Date().toISOString() };
      users.push(user);
      save(STORAGE.users, users);
      elements.authMessage.textContent = "账号已创建。";
      elements.authMessage.classList.add("success");
      finishAuthentication(user);
      return;
    }

    const user = users.find((entry) => entry.email === email);
    if (!user) {
      elements.authMessage.textContent = "没有找到这个账号，请先注册。";
      return;
    }
    if (user.password !== password) {
      elements.authMessage.textContent = "密码不正确。";
      return;
    }
    finishAuthentication(user);
  }

  function logout() {
    currentUser = null;
    session = null;
    selectedConversationId = "";
    localStorage.removeItem(STORAGE.session);
    renderAccount();
    showToast("已退出账号。");
  }

  function openItemModal() {
    if (!currentUser) {
      openAuth("login", { type: "post" });
      return;
    }
    elements.itemForm.reset();
    elements.itemMessage.textContent = "";
    elements.itemMessage.classList.remove("success");
    pendingPhoto = "";
    renderPhotoPreview();
    populatePostCountries();
    elements.itemModal.hidden = false;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => $("#itemNameInput").focus(), 0);
  }

  function populatePostCountries() {
    const preferredCountry = elements.countryFilter.value !== "all" ? elements.countryFilter.value : "英国";
    elements.itemCountryInput.replaceChildren();
    const fragment = document.createDocumentFragment();
    countryNames.forEach((country) => {
      const option = document.createElement("option");
      option.value = country;
      option.textContent = country;
      fragment.append(option);
    });
    elements.itemCountryInput.append(fragment);
    elements.itemCountryInput.value = countryNames.includes(preferredCountry) ? preferredCountry : "英国";
    syncPostCities("country");
  }

  function fillPostLocationSelect(select, values, preferredValue, customLabel) {
    select.replaceChildren();
    const fragment = document.createDocumentFragment();
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      fragment.append(option);
    });
    const customOption = document.createElement("option");
    customOption.value = customLocationValue;
    customOption.textContent = customLabel;
    fragment.append(customOption);
    select.append(fragment);
    select.value = values.includes(preferredValue) ? preferredValue : values[0] || customLocationValue;
  }

  function syncPostCities() {
    const country = elements.itemCountryInput.value;
    const cities = citiesForCountry(country);
    const defaultCityByCountry = {
      中国: "Shanghai",
      英国: "London",
      美国: "New York City",
      加拿大: "Toronto",
      澳大利亚: "Sydney",
      法国: "Paris",
      德国: "Berlin",
      日本: "Tokyo",
      韩国: "Seoul",
      新加坡: "Singapore"
    };
    const filteredCity = elements.countryFilter.value === country && elements.cityFilter.value !== "all"
      ? elements.cityFilter.value
      : "";
    const preferredCity = filteredCity || defaultCityByCountry[country] || "";
    fillPostLocationSelect(elements.itemCityInput, cities, preferredCity, "其他城市（手动填写）");
    syncPostAreas();
  }

  function syncPostAreas() {
    const country = elements.itemCountryInput.value;
    const city = elements.itemCityInput.value;
    const cityForAreas = city === customLocationValue ? "all" : city;
    const areas = areasForLocation(country, cityForAreas);
    const filteredArea = elements.countryFilter.value === country
      && elements.cityFilter.value === city
      && elements.areaFilter.value !== "all"
      ? elements.areaFilter.value
      : "";
    fillPostLocationSelect(elements.itemAreaInput, areas, filteredArea, "其他地区（手动填写）");
    toggleCustomLocationFields();
  }

  function toggleCustomLocationFields() {
    const customCity = elements.itemCityInput.value === customLocationValue;
    const customArea = elements.itemAreaInput.value === customLocationValue;
    elements.itemCityCustomField.hidden = !customCity;
    elements.itemCityCustomInput.required = customCity;
    elements.itemAreaCustomField.hidden = !customArea;
    elements.itemAreaCustomInput.required = customArea;
    if (!customCity) elements.itemCityCustomInput.value = "";
    if (!customArea) elements.itemAreaCustomInput.value = "";
  }

  function renderPhotoPreview() {
    elements.photoPreview.replaceChildren();
    if (pendingPhoto) {
      const image = document.createElement("img");
      image.src = pendingPhoto;
      image.alt = "商品照片预览";
      elements.photoPreview.append(image);
    } else {
      const text = document.createElement("span");
      text.textContent = "照片预览";
      elements.photoPreview.append(text);
    }
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("error", reject);
      reader.addEventListener("load", () => {
        const image = new Image();
        image.addEventListener("error", reject);
        image.addEventListener("load", () => {
          try {
            const maxSide = 1100;
            const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
            const context = canvas.getContext("2d");
            if (!context) throw new Error("图片处理失败");
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.78));
          } catch (error) {
            reject(error);
          }
        });
        image.src = String(reader.result || "");
      });
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotoChange() {
    const file = elements.itemPhotoInput.files?.[0];
    if (!file) {
      pendingPhoto = "";
      renderPhotoPreview();
      return;
    }
    if (!file.type.startsWith("image/")) {
      elements.itemMessage.textContent = "请选择有效的图片文件。";
      elements.itemPhotoInput.value = "";
      return;
    }
    try {
      elements.itemMessage.textContent = "正在处理照片…";
      pendingPhoto = await resizeImage(file);
      elements.itemMessage.textContent = "";
      renderPhotoPreview();
    } catch {
      elements.itemMessage.textContent = "照片读取失败，请换一张再试。";
      pendingPhoto = "";
      renderPhotoPreview();
    }
  }

  function handleItemSubmit(event) {
    event.preventDefault();
    if (!currentUser) {
      closeModal(elements.itemModal);
      openAuth("login", { type: "post" });
      return;
    }
    const title = $("#itemNameInput").value.trim();
    const price = Number($("#itemPriceInput").value);
    const country = elements.itemCountryInput.value;
    const city = elements.itemCityInput.value === customLocationValue
      ? elements.itemCityCustomInput.value.trim()
      : elements.itemCityInput.value;
    const area = elements.itemAreaInput.value === customLocationValue
      ? elements.itemAreaCustomInput.value.trim()
      : elements.itemAreaInput.value;
    if (!title || !Number.isFinite(price) || price < 0 || !country || !city || !area) {
      elements.itemMessage.textContent = "请完整填写商品名称、价格、国家、城市和地区。";
      return;
    }

    const item = {
      id: uid("item"),
      title,
      category: $("#itemCategoryInput").value,
      price,
      priceLabel: "",
      currency: $("#itemCurrencyInput").value,
      country,
      city,
      area,
      description: $("#itemDescriptionInput").value.trim(),
      image: pendingPhoto,
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      createdAt: new Date().toISOString()
    };
    items.unshift(item);
    saveItems();
    syncLocationFilters();
    renderItems();
    closeModal(elements.itemModal);
    showToast("商品已发布到二手市场。");
    window.location.hash = "market";
  }

  function removeItem(itemId) {
    const item = findItem(itemId);
    if (!item || item.sellerId !== currentUser?.id) return;
    if (!window.confirm(`确定要下架“${item.title}”吗？`)) return;
    items = items.filter((entry) => entry.id !== itemId);
    saveItems();
    syncLocationFilters();
    renderItems();
    renderMessageCenter();
    showToast("商品已下架，会话记录仍然保留。");
  }

  function conversationFor(itemId, buyerId, sellerId) {
    return conversations.find((conversation) => conversation.itemId === itemId
      && conversation.participants.includes(buyerId)
      && conversation.participants.includes(sellerId));
  }

  function contactSeller(itemId) {
    const item = findItem(itemId);
    if (!item) {
      showToast("这件商品已下架。");
      return;
    }
    if (!currentUser) {
      openAuth("login", { type: "contact", itemId });
      return;
    }
    if (currentUser.id === item.sellerId) {
      showToast("这是你自己发布的商品。");
      return;
    }
    let conversation = conversationFor(item.id, currentUser.id, item.sellerId);
    if (!conversation) {
      conversation = {
        id: uid("conversation"),
        itemId: item.id,
        participants: [currentUser.id, item.sellerId],
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      conversations.unshift(conversation);
      saveConversations();
    }
    selectConversation(conversation.id, true);
  }

  function conversationsForCurrentUser() {
    if (!currentUser) return [];
    return conversations
      .filter((conversation) => conversation.participants.includes(currentUser.id))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  function otherParticipant(conversation) {
    return conversation.participants.find((id) => id !== currentUser?.id) || "";
  }

  function participantName(conversation) {
    const otherId = otherParticipant(conversation);
    const account = findUser(otherId);
    if (account) return account.name;
    const item = findItem(conversation.itemId);
    if (item?.sellerId === otherId) return item.sellerName || "卖家";
    return "CampusLoop 用户";
  }

  function markConversationRead(conversation) {
    if (!currentUser) return;
    let changed = false;
    conversation.messages.forEach((message) => {
      if (message.senderId !== currentUser.id && !message.readBy?.includes(currentUser.id)) {
        message.readBy = [...(message.readBy || []), currentUser.id];
        changed = true;
      }
    });
    if (changed) saveConversations();
  }

  function unreadCount() {
    if (!currentUser) return 0;
    return conversationsForCurrentUser().reduce((count, conversation) => count + conversation.messages.filter((message) => message.senderId !== currentUser.id && !message.readBy?.includes(currentUser.id)).length, 0);
  }

  function renderUnreadBadge() {
    const count = unreadCount();
    elements.unreadBadge.hidden = count === 0;
    elements.unreadBadge.textContent = count > 99 ? "99+" : String(count);
  }

  function renderConversationList(list) {
    elements.conversationItems.replaceChildren();
    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "暂无商品会话。点击商品的“联系卖家”开始沟通。";
      elements.conversationItems.append(empty);
      return;
    }
    list.forEach((conversation) => {
      const item = findItem(conversation.itemId);
      const lastMessage = conversation.messages.at(-1);
      const button = document.createElement("button");
      button.className = "conversation-button";
      button.classList.toggle("active", conversation.id === selectedConversationId);
      button.type = "button";
      const strong = document.createElement("strong");
      strong.textContent = item?.title || "已下架商品";
      const person = document.createElement("span");
      person.textContent = `与 ${participantName(conversation)} 沟通`;
      const preview = document.createElement("span");
      preview.textContent = lastMessage?.text || "还没有消息";
      button.append(strong, person, preview);
      button.addEventListener("click", () => selectConversation(conversation.id));
      elements.conversationItems.append(button);
    });
  }

  function renderSelectedConversation() {
    const conversation = conversations.find((entry) => entry.id === selectedConversationId && entry.participants.includes(currentUser?.id));
    const submitButton = elements.messageForm.querySelector("button");
    if (!conversation) {
      elements.chatAvatar.textContent = "CL";
      elements.chatTitle.textContent = "请选择一个会话";
      elements.chatMeta.textContent = "从左侧选择商品后开始沟通。";
      elements.messageHistory.replaceChildren();
      const empty = document.createElement("p");
      empty.className = "message-empty";
      empty.textContent = "选择会话后即可发送私信。";
      elements.messageHistory.append(empty);
      elements.messageInput.disabled = true;
      submitButton.disabled = true;
      return;
    }

    markConversationRead(conversation);
    const item = findItem(conversation.itemId);
    const person = participantName(conversation);
    elements.chatAvatar.textContent = initials(person);
    elements.chatTitle.textContent = item?.title || "已下架商品";
    elements.chatMeta.textContent = `与 ${person} 沟通${item ? ` · ${item.city} ${item.area}` : " · 商品已下架"}`;
    elements.messageHistory.replaceChildren();
    if (!conversation.messages.length) {
      const empty = document.createElement("p");
      empty.className = "message-empty";
      empty.textContent = "还没有消息，发送第一条私信吧。";
      elements.messageHistory.append(empty);
    } else {
      conversation.messages.forEach((message) => {
        const bubble = document.createElement("div");
        bubble.className = "message-bubble";
        bubble.classList.toggle("own", message.senderId === currentUser.id);
        const text = document.createElement("span");
        text.textContent = message.text;
        const time = document.createElement("small");
        time.textContent = `${message.senderId === currentUser.id ? "我" : participantName(conversation)} · ${formatDate(message.createdAt)}`;
        bubble.append(text, time);
        elements.messageHistory.append(bubble);
      });
      elements.messageHistory.scrollTop = elements.messageHistory.scrollHeight;
    }
    elements.messageInput.disabled = false;
    submitButton.disabled = false;
    renderUnreadBadge();
  }

  function renderMessageCenter() {
    const loggedIn = Boolean(currentUser);
    elements.messageLoginNote.hidden = loggedIn;
    elements.messageLayout.hidden = !loggedIn;
    if (!loggedIn) {
      renderUnreadBadge();
      return;
    }
    const list = conversationsForCurrentUser();
    if (selectedConversationId && !list.some((conversation) => conversation.id === selectedConversationId)) selectedConversationId = "";
    if (!selectedConversationId && list.length) selectedConversationId = list[0].id;
    renderConversationList(list);
    renderSelectedConversation();
    renderUnreadBadge();
  }

  function selectConversation(conversationId, jump = false) {
    selectedConversationId = conversationId;
    renderMessageCenter();
    if (jump) {
      window.location.hash = "messages";
      window.setTimeout(() => elements.messageInput.focus(), 250);
    }
  }

  function sendMessage(event) {
    event.preventDefault();
    const conversation = conversations.find((entry) => entry.id === selectedConversationId && entry.participants.includes(currentUser?.id));
    const text = elements.messageInput.value.trim();
    if (!conversation || !currentUser || !text) return;
    conversation.messages.push({
      id: uid("message"),
      senderId: currentUser.id,
      text,
      readBy: [currentUser.id],
      createdAt: new Date().toISOString()
    });
    conversation.updatedAt = new Date().toISOString();
    saveConversations();
    elements.messageInput.value = "";
    renderMessageCenter();
  }

  function clearFilters() {
    elements.searchInput.value = "";
    elements.countryFilter.value = "all";
    syncLocationFilters("country");
    elements.categoryFilter.value = "all";
    elements.sortSelect.value = "newest";
    renderItems();
  }

  $$("#headerPostButton, #heroPostButton, #marketPostButton").forEach((button) => button.addEventListener("click", openItemModal));
  elements.authButton.addEventListener("click", () => openAuth("login"));
  $("#messageLoginButton").addEventListener("click", () => openAuth("login"));
  elements.logoutButton.addEventListener("click", logout);
  elements.authForm.addEventListener("submit", handleAuthSubmit);
  elements.itemForm.addEventListener("submit", handleItemSubmit);
  elements.itemPhotoInput.addEventListener("change", handlePhotoChange);
  elements.itemCountryInput.addEventListener("change", syncPostCities);
  elements.itemCityInput.addEventListener("change", syncPostAreas);
  elements.itemAreaInput.addEventListener("change", toggleCustomLocationFields);
  elements.messageForm.addEventListener("submit", sendMessage);
  elements.clearFiltersButton.addEventListener("click", clearFilters);
  elements.searchInput.addEventListener("input", renderItems);
  elements.countryFilter.addEventListener("change", () => { syncLocationFilters("country"); renderItems(); });
  elements.cityFilter.addEventListener("change", () => { syncLocationFilters("city"); renderItems(); });
  elements.areaFilter.addEventListener("change", renderItems);
  elements.categoryFilter.addEventListener("change", renderItems);
  elements.sortSelect.addEventListener("change", renderItems);
  $$(".auth-tab").forEach((tab) => tab.addEventListener("click", () => setAuthMode(tab.dataset.authMode)));
  $$('[data-close-modal]').forEach((button) => button.addEventListener("click", () => closeModal($(`#${button.dataset.closeModal}`))));
  $$(".modal-backdrop").forEach((backdrop) => backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeModal(backdrop);
  }));
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const openModal = $$(".modal-backdrop").find((modal) => !modal.hidden);
    if (openModal) closeModal(openModal);
  });
  window.addEventListener("storage", () => {
    users = safeLoad(STORAGE.users, []);
    items = safeLoad(STORAGE.items, []);
    conversations = safeLoad(STORAGE.conversations, []);
    session = safeLoad(STORAGE.session, null);
    currentUser = users.find((user) => user.id === session?.userId) || null;
    syncLocationFilters();
    renderAccount();
  });

  syncLocationFilters();
  renderAccount();
})();
