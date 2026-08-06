const dispatchRole = document.documentElement.dataset.dispatchRole || "student";

const dispatchStorageKeys = {
  requests: "campusLoopDispatchRequests",
  studentContacts: "campusLoopDispatchStudentContacts",
  studentRequestIds: "campusLoopDispatchStudentRequestIds",
  studentIdentity: "campusLoopDispatchStudentIdentity",
  mentors: "campusLoopDispatchMentors",
  mentorContacts: "campusLoopDispatchMentorContacts",
  mentorIdentity: "campusLoopDispatchMentorIdentity",
  mentorAccounts: "campusLoopMentorAccounts",
  mentorAuthSession: "campusLoopMentorAuthSession",
  managerCredential: "campusLoopManagerCredential",
  managerActiveSession: "campusLoopManagerActiveSession",
  managerTabSession: "campusLoopManagerTabSession"
};

const defaultManagerCredential = Object.freeze({
  account: "manager",
  version: 3,
  salt: "campusloop-manager-v3-8b1e092e",
  hash: "e536c88979a445e5dfe26caf10afcea459bfe7be59463e2dcf3bf3f85f9aaa8e"
});
const managerCredentialVersion = defaultManagerCredential.version;
let managerDispatchStarted = false;
let managerDispatchRender = null;

function readDispatchStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeDispatchStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createManagerToken() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

async function hashManagerPassword(password, salt) {
  const value = `${salt}:${password}`;
  if (globalThis.crypto?.subtle && globalThis.TextEncoder) {
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  let fallbackHash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    fallbackHash ^= value.charCodeAt(index);
    fallbackHash = Math.imul(fallbackHash, 16777619);
  }
  return `fallback-${(fallbackHash >>> 0).toString(16)}`;
}

async function getManagerCredential() {
  let credential = readDispatchStorage(dispatchStorageKeys.managerCredential, null);
  if (!credential?.salt || !credential?.hash || credential.version !== managerCredentialVersion) {
    credential = {
      ...defaultManagerCredential,
      updatedAt: new Date().toISOString()
    };
    writeDispatchStorage(dispatchStorageKeys.managerCredential, credential);
    localStorage.removeItem(dispatchStorageKeys.managerActiveSession);
    sessionStorage.removeItem(dispatchStorageKeys.managerTabSession);
  }
  return credential;
}

async function verifyManagerPassword(password) {
  const credential = await getManagerCredential();
  return (await hashManagerPassword(password, credential.salt)) === credential.hash;
}

function managerSessionIsValid() {
  const activeSession = localStorage.getItem(dispatchStorageKeys.managerActiveSession);
  const tabSession = sessionStorage.getItem(dispatchStorageKeys.managerTabSession);
  return Boolean(activeSession && tabSession && activeSession === tabSession);
}

function startManagerSession() {
  const token = createManagerToken();
  localStorage.setItem(dispatchStorageKeys.managerActiveSession, token);
  sessionStorage.setItem(dispatchStorageKeys.managerTabSession, token);
}

function clearManagerSession() {
  const tabSession = sessionStorage.getItem(dispatchStorageKeys.managerTabSession);
  if (localStorage.getItem(dispatchStorageKeys.managerActiveSession) === tabSession) {
    localStorage.removeItem(dispatchStorageKeys.managerActiveSession);
  }
  sessionStorage.removeItem(dispatchStorageKeys.managerTabSession);
}

function getDispatchRequests() {
  return readDispatchStorage(dispatchStorageKeys.requests, []);
}

function saveDispatchRequests(requests) {
  writeDispatchStorage(dispatchStorageKeys.requests, requests);
}

function getDispatchMentors() {
  return readDispatchStorage(dispatchStorageKeys.mentors, []);
}

function saveDispatchMentors(mentors) {
  writeDispatchStorage(dispatchStorageKeys.mentors, mentors);
}

function getMentorAccounts() {
  return readDispatchStorage(dispatchStorageKeys.mentorAccounts, []);
}

function saveMentorAccounts(accounts) {
  writeDispatchStorage(dispatchStorageKeys.mentorAccounts, accounts);
}

function makeDispatchId(prefix) {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${timePart}-${randomPart}`;
}

function escapeDispatchHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeDispatchText(value) {
  return String(value || "").trim().toLocaleLowerCase("zh-CN");
}

function normalizeRmbRate(value) {
  const rate = String(value || "").trim();
  if (!rate || /元|人民币|￥|¥/.test(rate)) return rate;
  return `${rate} 元/小时`;
}

function formatMentorContact(contact = {}) {
  const details = [];
  if (contact.phone) details.push(`认证电话：${contact.phone}`);
  if (contact.wechat) details.push(`认证微信：${contact.wechat}`);
  return details.join(" · ") || contact.contact || "未记录";
}

function readMentorProof(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (file.size > 1024 * 1024) return reject(new Error("证明文件不能超过 1MB。"));
    if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
      return reject(new Error("证明文件仅支持图片或 PDF。"));
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve({
      proofName: file.name,
      proofType: file.type,
      proofDataUrl: String(reader.result || "")
    }));
    reader.addEventListener("error", () => reject(new Error("证明文件读取失败，请重新选择。")));
    reader.readAsDataURL(file);
  });
}

function readVerificationImage(file, label) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error(`请上传${label}。`));
    if (!file.type.startsWith("image/")) return reject(new Error(`${label}仅支持图片格式。`));
    if (file.size > 700 * 1024) return reject(new Error(`${label}不能超过 700KB。`));
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve({
      name: file.name,
      type: file.type,
      dataUrl: String(reader.result || "")
    }));
    reader.addEventListener("error", () => reject(new Error(`${label}读取失败，请重新选择。`)));
    reader.readAsDataURL(file);
  });
}

function formatDispatchDate(value) {
  if (!value) return "未填写";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? escapeDispatchHtml(value) : date.toLocaleDateString("zh-CN");
}

function formatDispatchTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("zh-CN");
}

function dispatchRegion(request) {
  return [request.country, request.city, request.area].filter(Boolean).join(" · ");
}

const dispatchStatusLabels = {
  pending: "等待辅导员抢单",
  applied: "抢单待店长审核",
  assigned: "店长审核通过",
  accepted: "学员已预约",
  completed: "已完成"
};

function dispatchStatusMarkup(status) {
  const safeStatus = dispatchStatusLabels[status] ? status : "pending";
  return `<span class="status-pill status-${safeStatus}">${dispatchStatusLabels[safeStatus]}</span>`;
}

function orderMetaMarkup(request) {
  return `
    <div class="order-meta">
      <span>${escapeDispatchHtml(request.major)}</span>
      <span>${escapeDispatchHtml(request.level)}</span>
      <span>${escapeDispatchHtml(request.serviceType)}</span>
      <span>${escapeDispatchHtml(dispatchRegion(request))}</span>
      <span>预算 ${escapeDispatchHtml(request.budget)}</span>
      <span>截止 ${formatDispatchDate(request.deadline)}</span>
    </div>`;
}

function matchingScore(request, mentor) {
  let score = 0;
  if (normalizeDispatchText(request.major) === normalizeDispatchText(mentor.major)) score += 45;

  const subject = normalizeDispatchText(request.subject);
  const mentorSubjects = normalizeDispatchText(mentor.subjects)
    .split(/[，,、;/]/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (mentorSubjects.some((item) => subject.includes(item) || item.includes(subject))) score += 25;

  if (normalizeDispatchText(request.country) === normalizeDispatchText(mentor.country)) score += 12;
  if (normalizeDispatchText(request.city) === normalizeDispatchText(mentor.city)) score += 10;
  if (normalizeDispatchText(request.area) === normalizeDispatchText(mentor.area)) score += 8;
  return Math.min(score, 100);
}

function getBookableMentors() {
  const approvedMentorIds = new Set(getMentorAccounts()
    .filter((account) => account.verificationStatus === "approved" && account.mentorId)
    .map((account) => account.mentorId));
  return getDispatchMentors().filter((mentor) => mentor.active !== false && approvedMentorIds.has(mentor.id));
}

function matchingMentorsForRequest(request) {
  const appliedIds = new Set(request.applications || []);
  return getBookableMentors()
    .map((mentor) => ({ mentor, score: matchingScore(request, mentor), applied: appliedIds.has(mentor.id) }))
    .sort((a, b) => Number(b.applied) - Number(a.applied) || b.score - a.score || a.mentor.name.localeCompare(b.mentor.name, "zh-CN"));
}

function showDispatchMessage(element, message, success = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("success", success);
}

function approvedMentorCardMarkup(request) {
  if (!["assigned", "accepted", "completed"].includes(request.status) || !request.assignedMentorId) return "";
  const mentor = getDispatchMentors().find((item) => item.id === request.assignedMentorId && item.active !== false);
  if (!mentor) return "";
  const booked = request.status === "accepted" || Boolean(request.studentBookedAt);
  const action = request.status === "completed"
    ? '<span class="status-pill status-completed">本次辅导已完成</span>'
    : booked
      ? '<button class="dispatch-secondary" type="button" disabled>已预约，等待店长协调</button>'
      : `<button class="dispatch-primary" type="button" data-book-mentor="${escapeDispatchHtml(request.id)}">预约该辅导员</button>`;
  return `
    <section class="approved-mentor-card" aria-label="店长审核通过的辅导员名片">
      <div class="approved-mentor-heading">
        <div><span class="approved-label">店长审核通过</span><h4>${escapeDispatchHtml(mentor.name)}</h4></div>
        <span class="order-id">${escapeDispatchHtml(mentor.id)}</span>
      </div>
      <div class="order-meta">
        <span>${escapeDispatchHtml(mentor.major)}</span>
        <span>${escapeDispatchHtml(mentor.rate)}</span>
        <span>${escapeDispatchHtml([mentor.country, mentor.city, mentor.area].filter(Boolean).join(" · "))}</span>
      </div>
      <p><strong>可辅导科目：</strong>${escapeDispatchHtml(mentor.subjects)}</p>
      <p>${escapeDispatchHtml(mentor.bio)}</p>
      <span class="privacy-mask">名片不显示联系方式，预约后仍由店长中转</span>
      <div class="order-actions">${action}</div>
    </section>`;
}

function renderStudentRequestCard(request) {
  const preferredMentor = request.preferredMentorId
    ? getDispatchMentors().find((mentor) => mentor.id === request.preferredMentorId)
    : null;
  const preferredStatus = preferredMentor
    ? {
        pending: `已向 ${preferredMentor.name} 发起预约申请，等待辅导员接单。`,
        applied: `${preferredMentor.name} 已接受预约申请，正在等待店长审核。`
      }[request.status]
    : "";
  const statusText = {
    pending: "需求已发布到辅导员抢单大厅，等待辅导员抢单。",
    applied: "已有辅导员抢单，正在等待店长审核。",
    assigned: "店长审核通过，辅导员名片已开放，你可以点击预约。",
    accepted: "你已预约辅导员，后续沟通由店长统一协调。",
    completed: "本次辅导订单已完成。"
  }[request.status] || "等待平台处理。";

  return `
    <article class="order-card">
      <div class="order-card-top"><span class="order-id">${escapeDispatchHtml(request.id)}</span>${dispatchStatusMarkup(request.status)}</div>
      <h3>${escapeDispatchHtml(request.subject)}</h3>
      ${orderMetaMarkup(request)}
      ${preferredMentor ? `<span class="preferred-mentor-line">指定辅导员 · ${escapeDispatchHtml(preferredMentor.name)}</span>` : ""}
      <p>${escapeDispatchHtml(preferredStatus || statusText)}</p>
      ${approvedMentorCardMarkup(request)}
      <span class="privacy-mask">辅导员联系方式由店长保管</span>
      <small>提交时间：${formatDispatchTime(request.createdAt)}</small>
    </article>`;
}

function studentMentorBookingCardMarkup(mentor, requests) {
  const activeBookings = requests.filter((request) => request.status !== "completed"
    && (request.preferredMentorId === mentor.id || request.assignedMentorId === mentor.id)).length;
  return `
    <article class="bookable-mentor-card">
      <div class="order-card-top"><h3>${escapeDispatchHtml(mentor.name)}</h3><span class="order-id">${escapeDispatchHtml(mentor.id)}</span></div>
      <div class="order-meta">
        <span>${escapeDispatchHtml(mentor.major)}</span>
        <span>${escapeDispatchHtml(mentor.rate)}</span>
        <span>${escapeDispatchHtml([mentor.country, mentor.city, mentor.area].filter(Boolean).join(" · "))}</span>
      </div>
      <p><strong>可辅导科目：</strong>${escapeDispatchHtml(mentor.subjects)}</p>
      <p>${escapeDispatchHtml(mentor.bio)}</p>
      <div class="mentor-availability"><strong>可预约时间</strong><span>${escapeDispatchHtml(mentor.availability || "请向店长确认具体时间")}</span></div>
      <span class="booking-load">当前预约：${activeBookings} 单处理中</span>
      <span class="privacy-mask">申请时不公开双方联系方式</span>
      <button class="dispatch-primary" type="button" data-request-mentor="${escapeDispatchHtml(mentor.id)}">申请预约辅导员</button>
    </article>`;
}

function initStudentDispatch() {
  const form = document.querySelector("#requestForm");
  const message = document.querySelector("#requestMessage");
  const list = document.querySelector("#studentRequestList");
  const mentorDirectory = document.querySelector("#studentMentorDirectory");
  const preferredMentorInput = document.querySelector("#requestPreferredMentor");
  const selectedMentorNotice = document.querySelector("#selectedMentorNotice");
  const selectedMentorName = document.querySelector("#selectedMentorName");
  const clearPreferredMentorButton = document.querySelector("#clearPreferredMentor");
  const startDate = document.querySelector("#requestStartDate");
  const deadline = document.querySelector("#requestDeadline");
  const today = new Date().toISOString().slice(0, 10);
  startDate.min = today;
  deadline.min = today;

  const identity = readDispatchStorage(dispatchStorageKeys.studentIdentity, null);
  if (identity) {
    document.querySelector("#requesterName").value = identity.name || "";
    document.querySelector("#requesterContact").value = identity.contact || "";
  }

  function renderStudentRequests() {
    const requestIds = new Set(readDispatchStorage(dispatchStorageKeys.studentRequestIds, []));
    const requests = getDispatchRequests().filter((request) => requestIds.has(request.id));
    list.innerHTML = requests.length
      ? requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(renderStudentRequestCard).join("")
      : '<p class="empty-dispatch">还没有提交需求。填写左侧表单后，店长会在这里更新派单进度。</p>';
  }

  function renderStudentMentors() {
    const mentors = getBookableMentors().sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    mentorDirectory.innerHTML = mentors.length
      ? mentors.map((mentor) => studentMentorBookingCardMarkup(mentor, getDispatchRequests())).join("")
      : '<p class="empty-dispatch">当前还没有可预约的认证辅导员。</p>';
  }

  function selectPreferredMentor(mentorId) {
    const mentor = getBookableMentors().find((item) => item.id === mentorId);
    if (!mentor) {
      showDispatchMessage(message, "该辅导员目前不可预约，请选择其他辅导员。");
      renderStudentMentors();
      return;
    }
    preferredMentorInput.value = mentor.id;
    selectedMentorName.textContent = mentor.name;
    selectedMentorNotice.hidden = false;
    showDispatchMessage(message, `已选择 ${mentor.name}，请填写并提交具体辅导需求。`, true);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearPreferredMentor() {
    preferredMentorInput.value = "";
    selectedMentorName.textContent = "";
    selectedMentorNotice.hidden = true;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (deadline.value < startDate.value) {
      showDispatchMessage(message, "截止日期不能早于希望开始日期。");
      return;
    }

    const preferredMentorId = preferredMentorInput.value;
    const preferredMentor = preferredMentorId
      ? getBookableMentors().find((mentor) => mentor.id === preferredMentorId)
      : null;
    if (preferredMentorId && !preferredMentor) {
      showDispatchMessage(message, "该辅导员目前不可预约，请重新选择。");
      clearPreferredMentor();
      renderStudentMentors();
      return;
    }

    const request = {
      id: makeDispatchId("REQ"),
      major: document.querySelector("#requestMajor").value,
      subject: document.querySelector("#requestSubject").value.trim(),
      level: document.querySelector("#requestLevel").value,
      serviceType: document.querySelector("#requestServiceType").value,
      budget: document.querySelector("#requestBudget").value.trim(),
      country: document.querySelector("#requestCountry").value.trim(),
      city: document.querySelector("#requestCity").value.trim(),
      area: document.querySelector("#requestArea").value.trim(),
      startDate: startDate.value,
      deadline: deadline.value,
      description: document.querySelector("#requestDescription").value.trim(),
      status: "pending",
      applications: [],
      preferredMentorId: preferredMentor?.id || "",
      assignedMentorId: "",
      reviewedAt: "",
      studentBookedAt: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const requester = {
      name: document.querySelector("#requesterName").value.trim(),
      contact: document.querySelector("#requesterContact").value.trim()
    };
    const requests = getDispatchRequests();
    requests.unshift(request);
    saveDispatchRequests(requests);

    const contacts = readDispatchStorage(dispatchStorageKeys.studentContacts, {});
    contacts[request.id] = requester;
    writeDispatchStorage(dispatchStorageKeys.studentContacts, contacts);
    const requestIds = readDispatchStorage(dispatchStorageKeys.studentRequestIds, []);
    requestIds.unshift(request.id);
    writeDispatchStorage(dispatchStorageKeys.studentRequestIds, [...new Set(requestIds)]);
    writeDispatchStorage(dispatchStorageKeys.studentIdentity, requester);

    form.reset();
    clearPreferredMentor();
    document.querySelector("#requesterName").value = requester.name;
    document.querySelector("#requesterContact").value = requester.contact;
    startDate.min = today;
    deadline.min = today;
    showDispatchMessage(message, preferredMentor
      ? `预约申请 ${request.id} 已发送给 ${preferredMentor.name}，联系方式仅店长端可见。`
      : `需求 ${request.id} 已提交，联系方式仅店长端可见。`, true);
    renderStudentRequests();
    renderStudentMentors();
  });

  mentorDirectory.addEventListener("click", (event) => {
    const requestButton = event.target.closest("[data-request-mentor]");
    if (requestButton) selectPreferredMentor(requestButton.dataset.requestMentor);
  });

  clearPreferredMentorButton.addEventListener("click", clearPreferredMentor);

  list.addEventListener("click", (event) => {
    const bookButton = event.target.closest("[data-book-mentor]");
    if (!bookButton) return;
    const requestIds = new Set(readDispatchStorage(dispatchStorageKeys.studentRequestIds, []));
    const requests = getDispatchRequests();
    const request = requests.find((item) => item.id === bookButton.dataset.bookMentor && requestIds.has(item.id));
    if (!request || request.status !== "assigned" || !request.assignedMentorId) return;
    request.status = "accepted";
    request.studentBookedAt = new Date().toISOString();
    request.updatedAt = request.studentBookedAt;
    saveDispatchRequests(requests);
    showDispatchMessage(message, "预约已提交，店长将继续中转双方沟通。", true);
    renderStudentRequests();
  });

  window.addEventListener("storage", (event) => {
    if ([dispatchStorageKeys.requests, dispatchStorageKeys.mentors, dispatchStorageKeys.mentorAccounts].includes(event.key)) {
      renderStudentRequests();
      renderStudentMentors();
    }
  });

  renderStudentRequests();
  renderStudentMentors();
}

function mentorOrderMarkup(request, mentor, mode) {
  const score = mentor ? matchingScore(request, mentor) : 0;
  let action = '<button class="dispatch-primary" type="button" disabled>请先保存辅导员资料</button>';
  if (mentor && mode === "open") {
    action = `<button class="dispatch-primary" type="button" data-apply-request="${escapeDispatchHtml(request.id)}">${request.preferredMentorId === mentor.id ? "接受预约申请" : "立即抢单"}</button>`;
  }
  if (mentor && mode === "review") {
    action = '<span class="status-pill status-applied">已抢单，等待店长审核</span>';
  }
  if (mentor && mode === "assignment" && request.status === "assigned") {
    action = '<span class="status-pill status-assigned">店长审核通过，等待学员预约</span>';
  }
  if (mentor && mode === "assignment" && request.status === "accepted") {
    action = '<span class="status-pill status-accepted">学员已预约，等待店长协调</span>';
  }
  if (mentor && mode === "assignment" && request.status === "completed") {
    action = '<span class="status-pill status-completed">订单已完成</span>';
  }

  return `
    <article class="order-card">
      <div class="order-card-top"><span class="order-id">${escapeDispatchHtml(request.id)}</span>${dispatchStatusMarkup(request.status)}</div>
      <h3>${escapeDispatchHtml(request.subject)}</h3>
      ${orderMetaMarkup(request)}
      ${request.preferredMentorId === mentor?.id ? '<span class="preferred-mentor-line">学员向你发起预约申请</span>' : ""}
      <p class="order-description">${escapeDispatchHtml(request.description)}</p>
      <div class="order-card-top"><span class="matching-score">与你的资料匹配度 ${score}%</span><span class="privacy-mask">学员联系方式不可见</span></div>
      <div class="order-actions">${action}</div>
    </article>`;
}

function initMentorAuth() {
  const authGate = document.querySelector("#mentorAuthGate");
  const mentorApp = document.querySelector("#mentorApp");
  const loginForm = document.querySelector("#mentorLoginForm");
  const registerForm = document.querySelector("#mentorRegisterForm");
  const loginMessage = document.querySelector("#mentorLoginMessage");
  const registerMessage = document.querySelector("#mentorRegisterMessage");
  const logoutButton = document.querySelector("#mentorLogoutButton");
  let dispatchInitialized = false;

  function showMentorApp(account) {
    authGate.hidden = true;
    mentorApp.hidden = false;
    logoutButton.hidden = false;
    if (!dispatchInitialized) {
      initMentorDispatch(account.id);
      dispatchInitialized = true;
    }
  }

  const sessionAccountId = sessionStorage.getItem(dispatchStorageKeys.mentorAuthSession);
  const sessionAccount = getMentorAccounts().find((account) => account.id === sessionAccountId);
  if (sessionAccount?.verificationStatus === "approved") showMentorApp(sessionAccount);
  else sessionStorage.removeItem(dispatchStorageKeys.mentorAuthSession);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const accountValue = normalizeDispatchText(document.querySelector("#mentorLoginAccount").value);
    const password = document.querySelector("#mentorLoginPassword").value;
    const account = getMentorAccounts().find((item) => item.loginAccount === accountValue);
    if (!account || (await hashManagerPassword(password, account.passwordSalt)) !== account.passwordHash) {
      showDispatchMessage(loginMessage, "账号或密码不正确。");
      return;
    }
    if (account.verificationStatus === "pending") {
      showDispatchMessage(loginMessage, "实名认证正在等待店长审核，通过后才能登录接单。");
      return;
    }
    if (account.verificationStatus === "rejected") {
      showDispatchMessage(loginMessage, "实名认证未通过，请联系平台重新提交清晰、相符的认证照片。");
      return;
    }

    submitButton.disabled = true;
    sessionStorage.setItem(dispatchStorageKeys.mentorAuthSession, account.id);
    document.querySelector("#mentorLoginPassword").value = "";
    showDispatchMessage(loginMessage, "认证通过，登录成功。", true);
    showMentorApp(account);
    submitButton.disabled = false;
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = registerForm.querySelector('button[type="submit"]');
    const displayName = document.querySelector("#mentorRegisterName").value.trim();
    const loginAccount = normalizeDispatchText(document.querySelector("#mentorRegisterAccount").value);
    const password = document.querySelector("#mentorRegisterPassword").value;
    const confirmPassword = document.querySelector("#mentorRegisterConfirmPassword").value;
    if (getMentorAccounts().some((account) => account.loginAccount === loginAccount)) {
      showDispatchMessage(registerMessage, "该手机号或邮箱已经注册，请直接登录。");
      return;
    }
    if (password.length < 8) {
      showDispatchMessage(registerMessage, "密码至少需要 8 位。");
      return;
    }
    if (password !== confirmPassword) {
      showDispatchMessage(registerMessage, "两次输入的密码不一致。");
      return;
    }

    submitButton.disabled = true;
    try {
      const [facePhoto, idPhoto] = await Promise.all([
        readVerificationImage(document.querySelector("#mentorFacePhoto").files[0], "清晰正面人脸照"),
        readVerificationImage(document.querySelector("#mentorIdPhoto").files[0], "身份证照片")
      ]);
      const passwordSalt = createManagerToken();
      const accounts = getMentorAccounts();
      accounts.unshift({
        id: makeDispatchId("MACC"),
        displayName,
        loginAccount,
        passwordSalt,
        passwordHash: await hashManagerPassword(password, passwordSalt),
        verificationStatus: "pending",
        facePhoto,
        idPhoto,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      saveMentorAccounts(accounts);
      registerForm.reset();
      showDispatchMessage(registerMessage, "注册资料已提交。店长核验人脸照与身份证照片一致并通过后，即可登录。", true);
    } catch (error) {
      const message = error?.name === "QuotaExceededError"
        ? "认证照片占用空间过大，请压缩图片后重新提交。"
        : error.message;
      showDispatchMessage(registerMessage, message);
    } finally {
      submitButton.disabled = false;
    }
  });

  logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem(dispatchStorageKeys.mentorAuthSession);
    window.location.reload();
  });
}

function initMentorDispatch(accountId) {
  const profileForm = document.querySelector("#mentorProfileForm");
  const profileMessage = document.querySelector("#mentorProfileMessage");
  const profileState = document.querySelector("#mentorProfileState");
  const openList = document.querySelector("#mentorOpenList");
  const assignmentList = document.querySelector("#mentorAssignmentList");
  const mentorAccount = getMentorAccounts().find((account) => account.id === accountId);
  let mentorId = mentorAccount?.mentorId || "";

  function currentMentor() {
    return getDispatchMentors().find((mentor) => mentor.id === mentorId) || null;
  }

  function populateMentorForm() {
    const mentor = currentMentor();
    if (!mentor) {
      document.querySelector("#mentorDisplayName").value = mentorAccount?.displayName || "";
      return;
    }
    const contacts = readDispatchStorage(dispatchStorageKeys.mentorContacts, {});
    const contact = contacts[mentor.id] || {};
    document.querySelector("#mentorDisplayName").value = mentor.name || "";
    document.querySelector("#mentorPhone").value = contact.phone || contact.contact || "";
    document.querySelector("#mentorWechat").value = contact.wechat || "";
    document.querySelector("#mentorRate").value = mentor.rate || "";
    document.querySelector("#mentorMajor").value = mentor.major || "";
    document.querySelector("#mentorSubjects").value = mentor.subjects || "";
    document.querySelector("#mentorDispatchCountry").value = mentor.country || "";
    document.querySelector("#mentorDispatchCity").value = mentor.city || "";
    document.querySelector("#mentorDispatchArea").value = mentor.area || "";
    document.querySelector("#mentorAvailability").value = mentor.availability || "";
    document.querySelector("#mentorBio").value = mentor.bio || "";
    document.querySelector("#mentorProofState").textContent = contact.proofName
      ? `已上传：${contact.proofName}；重新选择文件可替换。`
      : "支持图片或 PDF，文件不超过 1MB；证明仅店长端可查看。";
  }

  function renderMentorOrders() {
    const mentor = currentMentor();
    profileState.textContent = mentor ? `已登记 · ${mentor.id}` : "尚未登记";
    const requests = getDispatchRequests();
    const openRequests = requests
      .filter((request) => ["pending", "applied"].includes(request.status)
        && !request.assignedMentorId
        && (!request.preferredMentorId || request.preferredMentorId === mentor?.id)
        && (!mentor || !(request.applications || []).includes(mentor.id)))
      .sort((a, b) => Number(b.preferredMentorId === mentor?.id) - Number(a.preferredMentorId === mentor?.id)
        || (mentor ? matchingScore(b, mentor) - matchingScore(a, mentor) : 0)
        || new Date(b.createdAt) - new Date(a.createdAt));
    const assignments = mentor
      ? requests.filter((request) => (
        (!request.assignedMentorId && request.status === "applied" && (request.applications || []).includes(mentor.id))
        || (request.assignedMentorId === mentor.id && ["assigned", "accepted", "completed"].includes(request.status))
      ))
      : [];
    openList.innerHTML = openRequests.length
      ? openRequests.map((request) => mentorOrderMarkup(request, mentor, "open")).join("")
      : '<p class="empty-dispatch">当前没有开放的脱敏订单。</p>';
    assignmentList.innerHTML = assignments.length
      ? assignments.map((request) => mentorOrderMarkup(request, mentor, request.status === "applied" ? "review" : "assignment")).join("")
      : '<p class="empty-dispatch">你还没有抢单或通过审核的订单。</p>';
  }

  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = profileForm.querySelector('button[type="submit"]');
    const mentors = getDispatchMentors();
    const contacts = readDispatchStorage(dispatchStorageKeys.mentorContacts, {});
    const existingContact = mentorId ? contacts[mentorId] || {} : {};
    const proofFile = document.querySelector("#mentorProof").files[0] || null;
    if (!proofFile && !existingContact.proofDataUrl) {
      showDispatchMessage(profileMessage, "请上传教师资格证、学生证等证明文件。");
      return;
    }

    submitButton.disabled = true;
    let proof = null;
    try {
      proof = await readMentorProof(proofFile);
    } catch (error) {
      showDispatchMessage(profileMessage, error.message);
      submitButton.disabled = false;
      return;
    }

    if (!mentorId) mentorId = makeDispatchId("MTR");
    const existingIndex = mentors.findIndex((mentor) => mentor.id === mentorId);
    const mentor = {
      id: mentorId,
      name: document.querySelector("#mentorDisplayName").value.trim(),
      rate: normalizeRmbRate(document.querySelector("#mentorRate").value),
      major: document.querySelector("#mentorMajor").value,
      subjects: document.querySelector("#mentorSubjects").value.trim(),
      country: document.querySelector("#mentorDispatchCountry").value.trim(),
      city: document.querySelector("#mentorDispatchCity").value.trim(),
      area: document.querySelector("#mentorDispatchArea").value.trim(),
      availability: document.querySelector("#mentorAvailability").value.trim(),
      bio: document.querySelector("#mentorBio").value.trim(),
      active: true,
      createdAt: existingIndex >= 0 ? mentors[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (existingIndex >= 0) mentors[existingIndex] = mentor;
    else mentors.unshift(mentor);
    saveDispatchMentors(mentors);

    contacts[mentorId] = {
      ...existingContact,
      phone: document.querySelector("#mentorPhone").value.trim(),
      wechat: document.querySelector("#mentorWechat").value.trim(),
      ...(proof || {})
    };
    writeDispatchStorage(dispatchStorageKeys.mentorContacts, contacts);
    writeDispatchStorage(dispatchStorageKeys.mentorIdentity, mentorId);
    const accounts = getMentorAccounts();
    const accountIndex = accounts.findIndex((account) => account.id === accountId);
    if (accountIndex >= 0 && accounts[accountIndex].mentorId !== mentorId) {
      accounts[accountIndex].mentorId = mentorId;
      accounts[accountIndex].updatedAt = new Date().toISOString();
      saveMentorAccounts(accounts);
    }
    showDispatchMessage(profileMessage, `资料已保存。你的平台编号是 ${mentorId}，联系方式仅店长端可见。`, true);
    document.querySelector("#mentorProof").value = "";
    document.querySelector("#mentorProofState").textContent = `已上传：${contacts[mentorId].proofName}；重新选择文件可替换。`;
    submitButton.disabled = false;
    renderMentorOrders();
  });

  document.addEventListener("click", (event) => {
    const applyButton = event.target.closest("[data-apply-request]");
    if (!applyButton) return;
    const mentor = currentMentor();
    if (!mentor) return;
    const requestId = applyButton.dataset.applyRequest;
    const requests = getDispatchRequests();
    const request = requests.find((item) => item.id === requestId);
    if (!request) return;

    if (applyButton && !request.assignedMentorId
      && (!request.preferredMentorId || request.preferredMentorId === mentor.id)) {
      request.applications = [...new Set([...(request.applications || []), mentor.id])];
      request.status = "applied";
    }
    request.updatedAt = new Date().toISOString();
    saveDispatchRequests(requests);
    renderMentorOrders();
  });

  window.addEventListener("storage", (event) => {
    if ([dispatchStorageKeys.requests, dispatchStorageKeys.mentors].includes(event.key)) renderMentorOrders();
  });

  populateMentorForm();
  renderMentorOrders();
}

function managerMentorOptionMarkup(request, selectedId = "") {
  const appliedIds = new Set(request.applications || []);
  const matches = matchingMentorsForRequest(request).filter(({ mentor }) => appliedIds.has(mentor.id));
  if (!matches.length) return '<option value="">暂无辅导员抢单</option>';
  return '<option value="">选择已抢单辅导员</option>' + matches.map(({ mentor, score }) => {
    const selected = mentor.id === selectedId ? " selected" : "";
    return `<option value="${escapeDispatchHtml(mentor.id)}"${selected}>${escapeDispatchHtml(mentor.name)} · 匹配 ${score}% · 已抢单 · ${escapeDispatchHtml(mentor.city)}</option>`;
  }).join("");
}

function managerRequestMarkup(request, studentContacts, mentorContacts) {
  const requester = studentContacts[request.id] || { name: "未记录", contact: "未记录" };
  const assignedMentor = getDispatchMentors().find((mentor) => mentor.id === request.assignedMentorId);
  const preferredMentor = getDispatchMentors().find((mentor) => mentor.id === request.preferredMentorId);
  const assignedContact = assignedMentor ? formatMentorContact(mentorContacts[assignedMentor.id]) : "尚未派单";
  const appliedCount = (request.applications || []).length;

  return `
    <article class="order-card manager-order" data-manager-request-card="${escapeDispatchHtml(request.id)}">
      <div class="order-card-top">
        <div><span class="order-id">${escapeDispatchHtml(request.id)}</span> · <span>${formatDispatchTime(request.createdAt)}</span></div>
        ${dispatchStatusMarkup(request.status)}
      </div>
      <div class="manager-order-grid">
        <div class="dispatch-list">
          <h3>${escapeDispatchHtml(request.major)} · ${escapeDispatchHtml(request.subject)}</h3>
          ${orderMetaMarkup(request)}
          <p class="order-description">${escapeDispatchHtml(request.description)}</p>
          ${preferredMentor ? `<div class="private-box preferred-request-box"><strong>学员预约意向</strong><span>${escapeDispatchHtml(preferredMentor.name)} · ${request.applications?.includes(preferredMentor.id) ? "辅导员已接受，等待审核" : "等待辅导员接受预约申请"}</span></div>` : ""}
          <div class="private-box">
            <strong>学员联系方式（仅店长可见）</strong>
            <span>${escapeDispatchHtml(requester.name)} · ${escapeDispatchHtml(requester.contact)}</span>
          </div>
          <div class="private-box">
            <strong>审核通过辅导员联系方式（仅店长可见）</strong>
            <span>${assignedMentor ? `${escapeDispatchHtml(assignedMentor.name)} · ${escapeDispatchHtml(assignedContact)}` : "尚未选择辅导员"}</span>
          </div>
        </div>
        <div class="dispatch-list">
          <div class="order-card-top"><strong>抢单审核</strong><span class="step-badge">${appliedCount} 位已抢单</span></div>
          <div class="assignment-controls">
            <label><span>选择已抢单辅导员</span><select data-mentor-select="${escapeDispatchHtml(request.id)}">${managerMentorOptionMarkup(request, request.assignedMentorId)}</select></label>
            <button class="dispatch-primary" type="button" data-assign-request="${escapeDispatchHtml(request.id)}"${appliedCount ? "" : " disabled"}>${request.assignedMentorId ? "重新审核" : "审核通过并派单"}</button>
          </div>
          <div class="order-actions">
            ${request.status === "accepted" ? `<button class="dispatch-secondary" type="button" data-complete-request="${escapeDispatchHtml(request.id)}">标记完成</button>` : ""}
            ${request.status === "completed" ? `<button class="dispatch-secondary" type="button" data-reopen-request="${escapeDispatchHtml(request.id)}">重新打开</button>` : ""}
          </div>
          <span class="privacy-mask">审核通过后学员只看到辅导员名片，不显示联系方式</span>
        </div>
      </div>
    </article>`;
}

function managerMentorCardMarkup(mentor, mentorContacts) {
  const contact = mentorContacts[mentor.id] || {};
  const proofIsSafe = /^data:(?:image\/[a-z0-9.+-]+|application\/pdf);base64,/i.test(contact.proofDataUrl || "");
  const proofMarkup = proofIsSafe
    ? `<a href="${escapeDispatchHtml(contact.proofDataUrl)}" target="_blank" rel="noopener">查看证明（${escapeDispatchHtml(contact.proofName || "已上传文件")}）</a>`
    : "未上传证明";
  return `
    <article class="mentor-resource-card">
      <div class="order-card-top"><h3>${escapeDispatchHtml(mentor.name)}</h3><span class="order-id">${escapeDispatchHtml(mentor.id)}</span></div>
      <div class="order-meta"><span>${escapeDispatchHtml(mentor.major)}</span><span>${escapeDispatchHtml(mentor.rate)}</span><span>${escapeDispatchHtml([mentor.country, mentor.city, mentor.area].filter(Boolean).join(" · "))}</span></div>
      <p><strong>科目：</strong>${escapeDispatchHtml(mentor.subjects)}</p>
      <p><strong>可预约时间：</strong>${escapeDispatchHtml(mentor.availability || "请向店长确认具体时间")}</p>
      <p>${escapeDispatchHtml(mentor.bio)}</p>
      <div class="mentor-contact">${escapeDispatchHtml(formatMentorContact(contact))}</div>
      <div class="mentor-contact">认证证明：${proofMarkup}</div>
    </article>`;
}

function managerMentorVerificationMarkup(account) {
  const faceIsSafe = /^data:image\/[a-z0-9.+-]+;base64,/i.test(account.facePhoto?.dataUrl || "");
  const idIsSafe = /^data:image\/[a-z0-9.+-]+;base64,/i.test(account.idPhoto?.dataUrl || "");
  const statusLabel = { pending: "待审核", approved: "已通过", rejected: "已驳回" }[account.verificationStatus] || "待审核";
  const statusClass = account.verificationStatus === "approved"
    ? "status-accepted"
    : account.verificationStatus === "rejected" ? "status-rejected" : "status-pending";
  const reviewActions = account.verificationStatus === "approved"
    ? `<button class="dispatch-danger" type="button" data-reject-mentor-account="${escapeDispatchHtml(account.id)}">撤销认证</button>`
    : `
      <button class="dispatch-primary" type="button" data-approve-mentor-account="${escapeDispatchHtml(account.id)}">${account.verificationStatus === "rejected" ? "重新通过" : "确认一致并通过"}</button>
      <button class="dispatch-danger" type="button" data-reject-mentor-account="${escapeDispatchHtml(account.id)}">驳回认证</button>`;
  return `
    <article class="order-card verification-card">
      <div class="order-card-top">
        <div><h3>${escapeDispatchHtml(account.displayName)}</h3><span class="order-id">${escapeDispatchHtml(account.loginAccount)}</span></div>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
      </div>
      <div class="verification-photos">
        <figure class="verification-photo">
          ${faceIsSafe ? `<img src="${escapeDispatchHtml(account.facePhoto.dataUrl)}" alt="${escapeDispatchHtml(account.displayName)} 的清晰正面人脸照" />` : '<div class="empty-dispatch">人脸照无效</div>'}
          <figcaption>清晰正面人脸照</figcaption>
        </figure>
        <figure class="verification-photo">
          ${idIsSafe ? `<img src="${escapeDispatchHtml(account.idPhoto.dataUrl)}" alt="${escapeDispatchHtml(account.displayName)} 的身份证照片" />` : '<div class="empty-dispatch">身份证照片无效</div>'}
          <figcaption>身份证照片</figcaption>
        </figure>
      </div>
      <div class="verification-warning">请人工核验两张照片是否清晰、是否为同一人；本静态演示版不执行自动生物识别。</div>
      <div class="order-actions">${reviewActions}</div>
    </article>`;
}

function initManagerDispatch(onInvalidSession) {
  if (managerDispatchStarted) {
    managerDispatchRender?.();
    return;
  }
  managerDispatchStarted = true;

  const requestList = document.querySelector("#managerRequestList");
  const mentorList = document.querySelector("#managerMentorList");
  const verificationList = document.querySelector("#managerMentorVerificationList");
  const searchInput = document.querySelector("#managerSearch");
  const statusFilter = document.querySelector("#managerStatusFilter");

  function requireManagerSession() {
    if (managerSessionIsValid()) return true;
    onInvalidSession?.("当前店长登录已失效，请重新输入密码。");
    return false;
  }

  function renderManagerDispatch() {
    if (!requireManagerSession()) return;
    const requests = getDispatchRequests();
    const studentContacts = readDispatchStorage(dispatchStorageKeys.studentContacts, {});
    const mentorContacts = readDispatchStorage(dispatchStorageKeys.mentorContacts, {});
    const mentorAccounts = getMentorAccounts();
    const query = normalizeDispatchText(searchInput.value);
    const status = statusFilter.value;
    const filtered = requests.filter((request) => {
      const searchable = normalizeDispatchText(`${request.id} ${request.major} ${request.subject} ${dispatchRegion(request)}`);
      return (!query || searchable.includes(query)) && (status === "all" || request.status === status);
    });

    document.querySelector("#managerPendingCount").textContent = String(requests.filter((request) => request.status === "pending").length);
    document.querySelector("#managerAppliedCount").textContent = String(requests.filter((request) => request.status === "applied").length);
    document.querySelector("#managerAssignedCount").textContent = String(requests.filter((request) => request.status === "assigned").length);
    document.querySelector("#managerAcceptedCount").textContent = String(requests.filter((request) => ["accepted", "completed"].includes(request.status)).length);
    requestList.innerHTML = filtered.length
      ? filtered.map((request) => managerRequestMarkup(request, studentContacts, mentorContacts)).join("")
      : '<p class="empty-dispatch">没有符合筛选条件的辅导需求。</p>';

    verificationList.innerHTML = mentorAccounts.length
      ? mentorAccounts.map(managerMentorVerificationMarkup).join("")
      : '<p class="empty-dispatch">暂时没有待审核的辅导员注册资料。</p>';

    const approvedMentorIds = new Set(mentorAccounts
      .filter((account) => account.verificationStatus === "approved" && account.mentorId)
      .map((account) => account.mentorId));
    const mentors = getDispatchMentors().filter((mentor) => approvedMentorIds.has(mentor.id));
    mentorList.innerHTML = mentors.length
      ? mentors.map((mentor) => managerMentorCardMarkup(mentor, mentorContacts)).join("")
      : '<p class="empty-dispatch">还没有辅导员登记资料。</p>';
  }

  managerDispatchRender = renderManagerDispatch;

  searchInput.addEventListener("input", renderManagerDispatch);
  statusFilter.addEventListener("input", renderManagerDispatch);
  document.addEventListener("click", (event) => {
    const assignButton = event.target.closest("[data-assign-request]");
    const completeButton = event.target.closest("[data-complete-request]");
    const reopenButton = event.target.closest("[data-reopen-request]");
    const approveMentorButton = event.target.closest("[data-approve-mentor-account]");
    const rejectMentorButton = event.target.closest("[data-reject-mentor-account]");
    if (!assignButton && !completeButton && !reopenButton && !approveMentorButton && !rejectMentorButton) return;
    if (!requireManagerSession()) return;

    if (approveMentorButton || rejectMentorButton) {
      const accountId = approveMentorButton?.dataset.approveMentorAccount || rejectMentorButton?.dataset.rejectMentorAccount;
      const accounts = getMentorAccounts();
      const account = accounts.find((item) => item.id === accountId);
      if (!account) return;
      account.verificationStatus = approveMentorButton ? "approved" : "rejected";
      account.updatedAt = new Date().toISOString();
      saveMentorAccounts(accounts);
      if (account.mentorId) {
        const mentors = getDispatchMentors();
        const mentor = mentors.find((item) => item.id === account.mentorId);
        if (mentor) {
          mentor.active = Boolean(approveMentorButton);
          mentor.updatedAt = new Date().toISOString();
          saveDispatchMentors(mentors);
        }
      }
      renderManagerDispatch();
      return;
    }

    const requestId = assignButton?.dataset.assignRequest || completeButton?.dataset.completeRequest || reopenButton?.dataset.reopenRequest;
    const requests = getDispatchRequests();
    const request = requests.find((item) => item.id === requestId);
    if (!request) return;

    if (assignButton) {
      const select = document.querySelector(`[data-mentor-select="${CSS.escape(requestId)}"]`);
      if (!select?.value || !(request.applications || []).includes(select.value)) return;
      request.assignedMentorId = select.value;
      request.status = "assigned";
      request.reviewedAt = new Date().toISOString();
      request.studentBookedAt = "";
    }
    if (completeButton && request.status === "accepted") request.status = "completed";
    if (reopenButton && request.status === "completed") {
      request.status = request.assignedMentorId ? "assigned" : (request.applications?.length ? "applied" : "pending");
      request.studentBookedAt = "";
    }
    request.updatedAt = new Date().toISOString();
    saveDispatchRequests(requests);
    renderManagerDispatch();
  });

  window.addEventListener("storage", (event) => {
    if ([dispatchStorageKeys.requests, dispatchStorageKeys.mentors, dispatchStorageKeys.mentorAccounts].includes(event.key)) {
      renderManagerDispatch();
    }
  });

  renderManagerDispatch();
}

async function initManagerAccess() {
  const loginGate = document.querySelector("#managerLoginGate");
  const managerApp = document.querySelector("#managerApp");
  const loginForm = document.querySelector("#managerLoginForm");
  const passwordInput = document.querySelector("#managerPassword");
  const loginMessage = document.querySelector("#managerLoginMessage");
  const logoutButton = document.querySelector("#managerLogoutButton");
  const passwordForm = document.querySelector("#managerPasswordForm");
  const currentPasswordInput = document.querySelector("#managerCurrentPassword");
  const newPasswordInput = document.querySelector("#managerNewPassword");
  const confirmPasswordInput = document.querySelector("#managerConfirmPassword");
  const passwordMessage = document.querySelector("#managerPasswordMessage");

  function showManagerLogin(message = "") {
    managerApp.hidden = true;
    loginGate.hidden = false;
    logoutButton.hidden = true;
    document.querySelector("#managerRequestList").replaceChildren();
    document.querySelector("#managerMentorList").replaceChildren();
    document.querySelector("#managerMentorVerificationList").replaceChildren();
    ["managerPendingCount", "managerAppliedCount", "managerAssignedCount", "managerAcceptedCount"].forEach((id) => {
      document.querySelector(`#${id}`).textContent = "0";
    });
    passwordForm.reset();
    showDispatchMessage(passwordMessage, "");
    showDispatchMessage(loginMessage, message);
    passwordInput.value = "";
    window.setTimeout(() => passwordInput.focus(), 0);
  }

  function showManagerApp() {
    loginGate.hidden = true;
    managerApp.hidden = false;
    logoutButton.hidden = false;
    showDispatchMessage(loginMessage, "");
    initManagerDispatch(showManagerLogin);
  }

  await getManagerCredential();

  if (managerSessionIsValid()) showManagerApp();
  else showManagerLogin();

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    showDispatchMessage(loginMessage, "正在验证…");

    try {
      if (!(await verifyManagerPassword(passwordInput.value))) {
        showDispatchMessage(loginMessage, "密码不正确，无法进入店长后台。");
        passwordInput.select();
        return;
      }

      startManagerSession();
      passwordInput.value = "";
      showManagerApp();
    } finally {
      submitButton.disabled = false;
    }
  });

  logoutButton.addEventListener("click", () => {
    clearManagerSession();
    showManagerLogin("已安全退出店长后台。");
  });

  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!managerSessionIsValid()) {
      showManagerLogin("当前店长登录已失效，请重新输入密码。");
      return;
    }

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    if (!(await verifyManagerPassword(currentPassword))) {
      showDispatchMessage(passwordMessage, "当前密码不正确。");
      currentPasswordInput.select();
      return;
    }
    if (newPassword.length < 8) {
      showDispatchMessage(passwordMessage, "新密码至少需要 8 位。");
      newPasswordInput.focus();
      return;
    }
    if (newPassword !== confirmPassword) {
      showDispatchMessage(passwordMessage, "两次输入的新密码不一致。");
      confirmPasswordInput.select();
      return;
    }
    if (newPassword === currentPassword) {
      showDispatchMessage(passwordMessage, "新密码不能与当前密码相同。");
      newPasswordInput.select();
      return;
    }

    const salt = createManagerToken();
    const credential = {
      account: "manager",
      version: managerCredentialVersion,
      salt,
      hash: await hashManagerPassword(newPassword, salt),
      updatedAt: new Date().toISOString()
    };
    writeDispatchStorage(dispatchStorageKeys.managerCredential, credential);
    passwordForm.reset();
    showDispatchMessage(passwordMessage, "密码修改成功，下次请使用新密码登录。", true);
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== dispatchStorageKeys.managerActiveSession || managerSessionIsValid()) return;
    sessionStorage.removeItem(dispatchStorageKeys.managerTabSession);
    showManagerLogin("另一处已登录店长账号，本页面的登录已失效。");
  });
}

if (dispatchRole === "student") initStudentDispatch();
if (dispatchRole === "mentor") initMentorAuth();
if (dispatchRole === "manager") initManagerAccess();
