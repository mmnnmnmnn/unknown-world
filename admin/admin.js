import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  onValue,
  update
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

import {
  firebaseConfig,
  isFirebaseConfigured
} from "../js/firebase-config.js";

const ADMIN_EMAIL = "admin@unknown-world.app";

const loginView = document.querySelector("#loginView");
const dashboardView = document.querySelector("#dashboardView");
const loginForm = document.querySelector("#loginForm");
const passwordInput = document.querySelector("#passwordInput");
const loginButton = document.querySelector("#loginButton");
const loginMessage = document.querySelector("#loginMessage");
const logoutButton = document.querySelector("#logoutButton");

const totalCount = document.querySelector("#totalCount");
const approvedCount = document.querySelector("#approvedCount");
const blockedCount = document.querySelector("#blockedCount");
const pendingCount = document.querySelector("#pendingCount");
const hiddenCount = document.querySelector("#hiddenCount");
const listSummary = document.querySelector("#listSummary");
const responseTbody = document.querySelector("#responseTbody");
const emptyRows = document.querySelector("#emptyRows");
const statusFilter = document.querySelector("#statusFilter");
const startDateFilter = document.querySelector("#startDateFilter");
const endDateFilter = document.querySelector("#endDateFilter");
const searchInput = document.querySelector("#searchInput");
const csvButton = document.querySelector("#csvButton");

const deleteAllButton = document.querySelector("#deleteAllButton");
const dangerMessage = document.querySelector("#dangerMessage");
const connectionText = document.querySelector("#connectionText");
const authIdentity = document.querySelector("#authIdentity");

let auth;
let db;
let responses = [];
let unsubscribeResponses = null;
let unsubscribeConnection = null;

function setBusy(elements, busy) {
  for (const element of elements) {
    if (element) element.disabled = busy;
  }
}

function getKstDateString(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeResponse(id, raw = {}) {
  const question = String(raw.question ?? "").trim();
  const createdAt = Number(raw.createdAt ?? 0);
  const moderationStatus = String(raw.moderationStatus || (question ? "approved" : "pending"));

  return {
    id,
    question,
    createdAt,
    kstDate: String(raw.kstDate || getKstDateString(createdAt)),
    moderationStatus,
    moderationReasonCode: String(raw.moderationReasonCode ?? ""),
    moderationReason: String(raw.moderationReason ?? ""),
    moderationSource: String(raw.moderationSource ?? ""),
    moderatedAt: Number(raw.moderatedAt ?? 0),
    hidden: Boolean(raw.hidden)
  };
}

function formatTime(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(timestamp));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getStatusLabel(item) {
  if (item.hidden) return "숨김";
  if (item.moderationStatus === "approved") return "승인";
  if (item.moderationStatus === "blocked") return "차단";
  if (item.moderationStatus === "pending") return "보류";
  return item.moderationStatus || "기타";
}

function getFilteredResponses() {
  const filter = statusFilter.value;
  const startDate = startDateFilter.value;
  const endDate = endDateFilter.value;
  const term = searchInput.value.trim().toLowerCase();

  return responses
    .filter((item) => {
      if (filter === "hidden") {
        if (!item.hidden) return false;
      } else if (filter !== "all") {
        if (item.moderationStatus !== filter || item.hidden) return false;
      }

      if (startDate && item.kstDate && item.kstDate < startDate) return false;
      if (endDate && item.kstDate && item.kstDate > endDate) return false;

      if (term) {
        const haystack = [
          item.question,
          item.moderationReasonCode,
          item.moderationReason,
          item.moderationSource
        ].join(" ").toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
}

function renderStats() {
  totalCount.textContent = String(responses.length);
  approvedCount.textContent = String(responses.filter((item) => item.moderationStatus === "approved").length);
  blockedCount.textContent = String(responses.filter((item) => item.moderationStatus === "blocked").length);
  pendingCount.textContent = String(responses.filter((item) => item.moderationStatus === "pending").length);
  hiddenCount.textContent = String(responses.filter((item) => item.hidden).length);
}

function renderRows() {
  const filtered = getFilteredResponses();
  listSummary.textContent = `${filtered.length}개 질문`;
  emptyRows.hidden = filtered.length > 0;

  responseTbody.innerHTML = filtered.map((item) => {
    const status = getStatusLabel(item);
    const publicState = item.moderationStatus === "approved" && !item.hidden ? "공개" : "비공개";
    const reason = item.moderationReason || item.moderationReasonCode || "-";
    const hideButton = item.moderationStatus === "approved" && !item.hidden
      ? `<button class="row-hide-button" type="button" data-hide-id="${escapeHtml(item.id)}">숨김</button>`
      : "";

    return `
      <tr>
        <td><span class="badge status-${escapeHtml(item.hidden ? "hidden" : item.moderationStatus)}">${escapeHtml(status)}</span></td>
        <td class="question-cell">${escapeHtml(item.question || "-")}</td>
        <td class="time-cell">${escapeHtml(formatTime(item.createdAt))}</td>
        <td><span class="public-state ${publicState === "공개" ? "is-public" : ""}">${publicState}</span></td>
        <td class="reason-cell" title="${escapeHtml(item.moderationReasonCode)}">${escapeHtml(reason)}</td>
        <td>
          <div class="row-actions">
            ${hideButton}
            <button class="row-delete-button" type="button" data-delete-id="${escapeHtml(item.id)}">영구삭제</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderAll() {
  renderStats();
  renderRows();
}

function attachRealtimeListeners() {
  if (unsubscribeResponses) unsubscribeResponses();
  if (unsubscribeConnection) unsubscribeConnection();

  unsubscribeResponses = onValue(
    ref(db, "responses"),
    (snapshot) => {
      const raw = snapshot.val() ?? {};
      responses = Object.entries(raw).map(([id, value]) => normalizeResponse(id, value));
      renderAll();
    },
    (error) => {
      console.error(error);
      connectionText.textContent = "응답 목록 권한 오류";
    }
  );

  unsubscribeConnection = onValue(ref(db, ".info/connected"), (snapshot) => {
    connectionText.textContent = snapshot.val() === true
      ? "Firebase 실시간 연결"
      : "Firebase 연결 끊김";
  });
}

async function login(password) {
  if (!isFirebaseConfigured) throw new Error("Firebase 설정이 없습니다.");
  return signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
}

async function hideResponseById(id) {
  const item = responses.find((response) => response.id === id);
  if (!item || item.hidden) return;

  const ok = window.confirm(
    `다음 질문을 대형 화면에서 숨길까요?\n\n${item.question}\n\n원본 질문은 관리자 데이터에 남습니다.`
  );
  if (!ok) return;

  await update(ref(db), {
    [`responses/${id}/hidden`]: true,
    [`publicResponses/${id}`]: null
  });
}

async function deleteResponseById(id) {
  const item = responses.find((response) => response.id === id);
  if (!item) return;

  const ok = window.confirm(
    `다음 질문을 영구 삭제할까요?\n\n${item.question}\n\nresponses와 publicResponses에서 모두 삭제되며 복원할 수 없습니다.`
  );
  if (!ok) return;

  await update(ref(db), {
    [`responses/${id}`]: null,
    [`publicResponses/${id}`]: null
  });
}

function sanitizeCsvCell(value) {
  let text = String(value ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv() {
  const items = getFilteredResponses();
  if (items.length === 0) {
    window.alert("CSV로 저장할 질문이 없습니다.");
    return;
  }

  const rows = [
    ["ID", "질문", "제출시각(KST)", "KST날짜", "검열상태", "관리자숨김", "사유코드", "사유", "검열출처"]
  ];

  for (const item of items) {
    rows.push([
      item.id,
      item.question,
      formatTime(item.createdAt),
      item.kstDate,
      item.moderationStatus,
      item.hidden ? "TRUE" : "FALSE",
      item.moderationReasonCode,
      item.moderationReason,
      item.moderationSource
    ]);
  }

  const csv = "\uFEFF" + rows.map((row) => row.map(sanitizeCsvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = getKstDateString(Date.now());

  link.href = url;
  link.download = `unknown-world-questions-${date}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function deleteAllResponses() {
  const items = [...responses];
  const total = items.length;

  if (total === 0) {
    dangerMessage.textContent = "삭제할 질문이 없습니다.";
    return;
  }

  const typed = window.prompt(
    `원본을 포함한 ${total}개 질문을 모두 영구 삭제합니다.\n계속하려면 '전체삭제'를 입력하세요.`
  );

  if (typed !== "전체삭제") {
    dangerMessage.textContent = "전체 삭제를 취소했습니다.";
    return;
  }

  let deleted = 0;
  for (const group of chunk(items, 200)) {
    const updates = {};
    for (const item of group) {
      updates[`responses/${item.id}`] = null;
      updates[`publicResponses/${item.id}`] = null;
    }
    await update(ref(db), updates);
    deleted += group.length;
    dangerMessage.textContent = `${deleted}/${total}개 삭제 중…`;
  }

  dangerMessage.textContent = `전체 질문 ${deleted}개를 삭제했습니다.`;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = passwordInput.value;

  if (!password) {
    loginMessage.textContent = "비밀번호를 입력해주세요.";
    return;
  }

  setBusy([loginButton], true);
  loginMessage.textContent = "로그인 중…";

  try {
    await login(password);
    passwordInput.value = "";
    loginMessage.textContent = "";
  } catch (error) {
    console.error(error);
    loginMessage.textContent =
      error?.code === "auth/invalid-credential"
        ? "비밀번호가 맞지 않습니다."
        : "로그인에 실패했습니다. Firebase Authentication 설정을 확인해주세요.";
  } finally {
    setBusy([loginButton], false);
  }
});

logoutButton.addEventListener("click", () => signOut(auth));
statusFilter.addEventListener("change", renderRows);
startDateFilter.addEventListener("change", renderRows);
endDateFilter.addEventListener("change", renderRows);
searchInput.addEventListener("input", renderRows);
csvButton.addEventListener("click", downloadCsv);

responseTbody.addEventListener("click", async (event) => {
  const hideButton = event.target.closest("[data-hide-id]");
  const deleteButton = event.target.closest("[data-delete-id]");
  const button = hideButton || deleteButton;
  if (!button) return;

  button.disabled = true;
  try {
    if (hideButton) await hideResponseById(hideButton.dataset.hideId);
    if (deleteButton) await deleteResponseById(deleteButton.dataset.deleteId);
  } catch (error) {
    console.error(error);
    window.alert("처리에 실패했습니다.");
  } finally {
    button.disabled = false;
  }
});

deleteAllButton.addEventListener("click", async () => {
  setBusy([deleteAllButton], true);
  dangerMessage.textContent = "";
  try {
    await deleteAllResponses();
  } catch (error) {
    console.error(error);
    dangerMessage.textContent = "전체 삭제에 실패했습니다.";
  } finally {
    setBusy([deleteAllButton], false);
  }
});

function initialize() {
  if (!isFirebaseConfigured) {
    loginMessage.textContent = "Firebase 설정을 확인해주세요.";
    loginButton.disabled = true;
    return;
  }

  const firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getDatabase(firebaseApp);

  onAuthStateChanged(auth, (user) => {
    const isAdmin = user?.email === ADMIN_EMAIL;

    loginView.hidden = Boolean(isAdmin);
    dashboardView.hidden = !isAdmin;

    if (isAdmin) {
      authIdentity.textContent = user.email;
      attachRealtimeListeners();
      return;
    }

    authIdentity.textContent = "";
    responses = [];
    renderAll();

    if (unsubscribeResponses) unsubscribeResponses();
    if (unsubscribeConnection) unsubscribeConnection();
    unsubscribeResponses = null;
    unsubscribeConnection = null;

    if (user) {
      signOut(auth);
      loginMessage.textContent = "관리자 계정이 아닙니다.";
    }
  });
}

initialize();
