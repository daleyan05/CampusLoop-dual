const dispatchRole = document.documentElement.dataset.dispatchRole || "student";

const dispatchStorageKeys = {
  requests: "campusLoopDispatchRequests",
  studentContacts: "campusLoopDispatchStudentContacts",
  studentRequestIds: "campusLoopDispatchStudentRequestIds",
  studentIdentity: "campusLoopDispatchStudentIdentity",
  mentors: "campusLoopDispatchMentors",
  mentorContacts: "campusLoopDispatchMentorContacts",
  mentorIdentity: "campusLoopDispatchMentorIdentity",
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
  pending: "待店长匹配",
  applied: "已有辅导员申请",
  assigned: "店长已派单",
  accepted: "辅导员已确认",
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

function matchingMentorsForRequest(request) {
  const appliedIds = new Set(request.applications || []);
  return getDispatchMentors()
    .filter((mentor) => mentor.active !== false)
    .map((mentor) => ({ mentor, score: matchingScore(request, mentor), applied: appliedIds.has(mentor.id) }))
    .sort((a, b) => Number(b.applied) - Number(a.applied) || b.score - a.score || a.mentor.name.localeCompare(b.mentor.name, "zh-CN"));
}

function showDispatchMessage(element, message, success = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("success", success);
}

function renderStudentRequestCard(request) {
  const statusText = {
    pending: "店长尚未派单，请等待平台匹配。",
    applied: "已有辅导员申请，店长正在筛选。",
    assigned: "店长已选择辅导员，正在等待对方确认。",
    accepted: "辅导员已确认，后续沟通由店长统一协调。",
    completed: "本次辅导订单已完成。"
  }[request.status] || "等待平台处理。";

  return `
    <article class="order-card">
      <div class="order-card-top"><span class="order-id">${escapeDispatchHtml(request.id)}</span>${dispatchStatusMarkup(request.status)}</div>
      <h3>${escapeDispatchHtml(request.subject)}</h3>
      ${orderMetaMarkup(request)}
      <p>${escapeDispatchHtml(statusText)}</p>
      <span class="privacy-mask">辅导员联系方式由店长保管</span>
      <small>提交时间：${formatDispatchTime(request.createdAt)}</small>
    </article>`;
}

function initStudentDispatch() {
  const form = document.querySelector("#requestForm");
  const message = document.querySelector("#requestMessage");
  const list = document.querySelector("#studentRequestList");
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

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (deadline.value < startDate.value) {
      showDispatchMessage(message, "截止日期不能早于希望开始日期。");
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
      assignedMentorId: "",
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
    document.querySelector("#requesterName").value = requester.name;
    document.querySelector("#requesterContact").value = requester.contact;
    startDate.min = today;
    deadline.min = today;
    showDispatchMessage(message, `需求 ${request.id} 已提交，联系方式仅店长端可见。`, true);
    renderStudentRequests();
  });

  renderStudentRequests();
}

function mentorOrderMarkup(request, mentor, mode) {
  const score = mentor ? matchingScore(request, mentor) : 0;
  const applied = mentor ? (request.applications || []).includes(mentor.id) : false;
  let action = '<button class="dispatch-primary" type="button" disabled>请先保存辅导员资料</button>';
  if (mentor && mode === "open") {
    action = applied
      ? '<button class="dispatch-secondary" type="button" disabled>已申请，等待店长派单</button>'
      : `<button class="dispatch-primary" type="button" data-apply-request="${escapeDispatchHtml(request.id)}">申请接单</button>`;
  }
  if (mentor && mode === "assignment" && request.status === "assigned") {
    action = `
      <button class="dispatch-primary" type="button" data-accept-request="${escapeDispatchHtml(request.id)}">确认接单</button>
      <button class="dispatch-danger" type="button" data-decline-request="${escapeDispatchHtml(request.id)}">无法接单</button>`;
  }
  if (mentor && mode === "assignment" && request.status === "accepted") {
    action = '<span class="status-pill status-accepted">已确认，等待店长协调</span>';
  }
  if (mentor && mode === "assignment" && request.status === "completed") {
    action = '<span class="status-pill status-completed">订单已完成</span>';
  }

  return `
    <article class="order-card">
      <div class="order-card-top"><span class="order-id">${escapeDispatchHtml(request.id)}</span>${dispatchStatusMarkup(request.status)}</div>
      <h3>${escapeDispatchHtml(request.subject)}</h3>
      ${orderMetaMarkup(request)}
      <p class="order-description">${escapeDispatchHtml(request.description)}</p>
      <div class="order-card-top"><span class="matching-score">与你的资料匹配度 ${score}%</span><span class="privacy-mask">学员联系方式不可见</span></div>
      <div class="order-actions">${action}</div>
    </article>`;
}

function initMentorDispatch() {
  const profileForm = document.querySelector("#mentorProfileForm");
  const profileMessage = document.querySelector("#mentorProfileMessage");
  const profileState = document.querySelector("#mentorProfileState");
  const openList = document.querySelector("#mentorOpenList");
  const assignmentList = document.querySelector("#mentorAssignmentList");
  let mentorId = readDispatchStorage(dispatchStorageKeys.mentorIdentity, "");

  function currentMentor() {
    return getDispatchMentors().find((mentor) => mentor.id === mentorId) || null;
  }

  function populateMentorForm() {
    const mentor = currentMentor();
    if (!mentor) return;
    const contacts = readDispatchStorage(dispatchStorageKeys.mentorContacts, {});
    document.querySelector("#mentorDisplayName").value = mentor.name || "";
    document.querySelector("#mentorContact").value = contacts[mentor.id]?.contact || "";
    document.querySelector("#mentorRate").value = mentor.rate || "";
    document.querySelector("#mentorMajor").value = mentor.major || "";
    document.querySelector("#mentorSubjects").value = mentor.subjects || "";
    document.querySelector("#mentorDispatchCountry").value = mentor.country || "";
    document.querySelector("#mentorDispatchCity").value = mentor.city || "";
    document.querySelector("#mentorDispatchArea").value = mentor.area || "";
    document.querySelector("#mentorBio").value = mentor.bio || "";
  }

  function renderMentorOrders() {
    const mentor = currentMentor();
    profileState.textContent = mentor ? `已登记 · ${mentor.id}` : "尚未登记";
    const requests = getDispatchRequests();
    const openRequests = requests
      .filter((request) => ["pending", "applied"].includes(request.status) && !request.assignedMentorId)
      .sort((a, b) => (mentor ? matchingScore(b, mentor) - matchingScore(a, mentor) : 0) || new Date(b.createdAt) - new Date(a.createdAt));
    const assignments = mentor
      ? requests.filter((request) => request.assignedMentorId === mentor.id && ["assigned", "accepted", "completed"].includes(request.status))
      : [];
    openList.innerHTML = openRequests.length
      ? openRequests.map((request) => mentorOrderMarkup(request, mentor, "open")).join("")
      : '<p class="empty-dispatch">当前没有开放的脱敏订单。</p>';
    assignmentList.innerHTML = assignments.length
      ? assignments.map((request) => mentorOrderMarkup(request, mentor, "assignment")).join("")
      : '<p class="empty-dispatch">店长尚未向你派单。</p>';
  }

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const mentors = getDispatchMentors();
    if (!mentorId) mentorId = makeDispatchId("MTR");
    const existingIndex = mentors.findIndex((mentor) => mentor.id === mentorId);
    const mentor = {
      id: mentorId,
      name: document.querySelector("#mentorDisplayName").value.trim(),
      rate: document.querySelector("#mentorRate").value.trim(),
      major: document.querySelector("#mentorMajor").value,
      subjects: document.querySelector("#mentorSubjects").value.trim(),
      country: document.querySelector("#mentorDispatchCountry").value.trim(),
      city: document.querySelector("#mentorDispatchCity").value.trim(),
      area: document.querySelector("#mentorDispatchArea").value.trim(),
      bio: document.querySelector("#mentorBio").value.trim(),
      active: true,
      createdAt: existingIndex >= 0 ? mentors[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (existingIndex >= 0) mentors[existingIndex] = mentor;
    else mentors.unshift(mentor);
    saveDispatchMentors(mentors);

    const contacts = readDispatchStorage(dispatchStorageKeys.mentorContacts, {});
    contacts[mentorId] = { contact: document.querySelector("#mentorContact").value.trim() };
    writeDispatchStorage(dispatchStorageKeys.mentorContacts, contacts);
    writeDispatchStorage(dispatchStorageKeys.mentorIdentity, mentorId);
    showDispatchMessage(profileMessage, `资料已保存。你的平台编号是 ${mentorId}，联系方式仅店长端可见。`, true);
    renderMentorOrders();
  });

  document.addEventListener("click", (event) => {
    const applyButton = event.target.closest("[data-apply-request]");
    const acceptButton = event.target.closest("[data-accept-request]");
    const declineButton = event.target.closest("[data-decline-request]");
    if (!applyButton && !acceptButton && !declineButton) return;
    const mentor = currentMentor();
    if (!mentor) return;
    const requestId = applyButton?.dataset.applyRequest || acceptButton?.dataset.acceptRequest || declineButton?.dataset.declineRequest;
    const requests = getDispatchRequests();
    const request = requests.find((item) => item.id === requestId);
    if (!request) return;

    if (applyButton && !request.assignedMentorId) {
      request.applications = [...new Set([...(request.applications || []), mentor.id])];
      request.status = "applied";
    }
    if (acceptButton && request.assignedMentorId === mentor.id && request.status === "assigned") {
      request.status = "accepted";
    }
    if (declineButton && request.assignedMentorId === mentor.id && request.status === "assigned") {
      request.applications = (request.applications || []).filter((id) => id !== mentor.id);
      request.assignedMentorId = "";
      request.status = request.applications.length ? "applied" : "pending";
    }
    request.updatedAt = new Date().toISOString();
    saveDispatchRequests(requests);
    renderMentorOrders();
  });

  populateMentorForm();
  renderMentorOrders();
}

function managerMentorOptionMarkup(request, selectedId = "") {
  const matches = matchingMentorsForRequest(request);
  if (!matches.length) return '<option value="">暂无辅导员资料</option>';
  return '<option value="">选择辅导员</option>' + matches.map(({ mentor, score, applied }) => {
    const selected = mentor.id === selectedId ? " selected" : "";
    return `<option value="${escapeDispatchHtml(mentor.id)}"${selected}>${escapeDispatchHtml(mentor.name)} · 匹配 ${score}%${applied ? " · 已申请" : ""} · ${escapeDispatchHtml(mentor.city)}</option>`;
  }).join("");
}

function managerRequestMarkup(request, studentContacts, mentorContacts) {
  const requester = studentContacts[request.id] || { name: "未记录", contact: "未记录" };
  const assignedMentor = getDispatchMentors().find((mentor) => mentor.id === request.assignedMentorId);
  const assignedContact = assignedMentor ? mentorContacts[assignedMentor.id]?.contact || "未记录" : "尚未派单";
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
          <div class="private-box">
            <strong>学员联系方式（仅店长可见）</strong>
            <span>${escapeDispatchHtml(requester.name)} · ${escapeDispatchHtml(requester.contact)}</span>
          </div>
          <div class="private-box">
            <strong>已派辅导员联系方式（仅店长可见）</strong>
            <span>${assignedMentor ? `${escapeDispatchHtml(assignedMentor.name)} · ${escapeDispatchHtml(assignedContact)}` : "尚未选择辅导员"}</span>
          </div>
        </div>
        <div class="dispatch-list">
          <div class="order-card-top"><strong>匹配与派单</strong><span class="step-badge">${appliedCount} 位已申请</span></div>
          <div class="assignment-controls">
            <label><span>选择辅导员</span><select data-mentor-select="${escapeDispatchHtml(request.id)}">${managerMentorOptionMarkup(request, request.assignedMentorId)}</select></label>
            <button class="dispatch-primary" type="button" data-assign-request="${escapeDispatchHtml(request.id)}">${request.assignedMentorId ? "重新派单" : "确认派单"}</button>
          </div>
          <div class="order-actions">
            ${["accepted", "assigned"].includes(request.status) ? `<button class="dispatch-secondary" type="button" data-complete-request="${escapeDispatchHtml(request.id)}">标记完成</button>` : ""}
            ${request.status === "completed" ? `<button class="dispatch-secondary" type="button" data-reopen-request="${escapeDispatchHtml(request.id)}">重新打开</button>` : ""}
          </div>
          <span class="privacy-mask">双方页面均不显示对方联系方式</span>
        </div>
      </div>
    </article>`;
}

function managerMentorCardMarkup(mentor, mentorContacts) {
  return `
    <article class="mentor-resource-card">
      <div class="order-card-top"><h3>${escapeDispatchHtml(mentor.name)}</h3><span class="order-id">${escapeDispatchHtml(mentor.id)}</span></div>
      <div class="order-meta"><span>${escapeDispatchHtml(mentor.major)}</span><span>${escapeDispatchHtml(mentor.rate)}</span><span>${escapeDispatchHtml([mentor.country, mentor.city, mentor.area].filter(Boolean).join(" · "))}</span></div>
      <p><strong>科目：</strong>${escapeDispatchHtml(mentor.subjects)}</p>
      <p>${escapeDispatchHtml(mentor.bio)}</p>
      <div class="mentor-contact">联系方式：${escapeDispatchHtml(mentorContacts[mentor.id]?.contact || "未记录")}</div>
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

    const mentors = getDispatchMentors();
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
    if (!assignButton && !completeButton && !reopenButton) return;
    if (!requireManagerSession()) return;
    const requestId = assignButton?.dataset.assignRequest || completeButton?.dataset.completeRequest || reopenButton?.dataset.reopenRequest;
    const requests = getDispatchRequests();
    const request = requests.find((item) => item.id === requestId);
    if (!request) return;

    if (assignButton) {
      const select = document.querySelector(`[data-mentor-select="${CSS.escape(requestId)}"]`);
      if (!select?.value) return;
      request.assignedMentorId = select.value;
      request.status = "assigned";
      request.applications = [...new Set([...(request.applications || []), select.value])];
    }
    if (completeButton && ["assigned", "accepted"].includes(request.status)) request.status = "completed";
    if (reopenButton && request.status === "completed") {
      request.assignedMentorId = "";
      request.status = request.applications?.length ? "applied" : "pending";
    }
    request.updatedAt = new Date().toISOString();
    saveDispatchRequests(requests);
    renderManagerDispatch();
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
if (dispatchRole === "mentor") initMentorDispatch();
if (dispatchRole === "manager") initManagerAccess();
