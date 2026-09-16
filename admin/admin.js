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
  update,
  remove,
  push
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

import {
  firebaseConfig,
  isFirebaseConfigured
} from "../js/firebase-config.js";

const ADMIN_EMAIL = "admin@unknown-world.app";
const WINNER_DURATION_MS = 15000;

const TEST_QUESTIONS = [
  "우주는 어디까지일까?", "심해 끝에는 뭐가 있을까?", "외계인은 존재할까?",
  "미래 사람은 어떻게 살까?", "내일 점심은 무엇일까?", "시간여행은 가능할까?",
  "블랙홀 안에는 뭐가 있을까?", "꿈은 왜 꾸는 걸까?", "동물은 무슨 생각을 할까?",
  "공룡의 색은 어땠을까?", "달에는 무엇이 있을까?", "화성에 생명체가 있을까?",
  "백 년 뒤 지구는 어떨까?", "우주는 왜 어두울까?", "별은 몇 개나 있을까?",
  "나는 미래에 뭘 할까?", "바다는 얼마나 깊을까?", "신은 존재할까?",
  "우주 밖에는 무엇이 있을까?", "인류는 어디서 왔을까?",
  "다른 우주도 있을까?", "로봇은 꿈을 꿀까?", "생명은 어떻게 시작됐을까?",
  "끝없는 공간이 가능할까?", "미래 동물은 어떻게 생길까?", "AI는 어디까지 발전할까?",
  "지구의 마지막은 언제일까?", "빛보다 빠를 수 있을까?", "죽으면 어디로 갈까?",
  "다른 행성의 하늘은?", "심해 생물은 왜 빛날까?", "내년의 나는 달라질까?",
  "우주는 계속 커질까?", "기억은 어디에 저장될까?", "고래는 서로 대화할까?",
  "곤충은 무엇을 느낄까?", "식물도 기억을 할까?", "외계 문명은 우리를 알까?",
  "태양은 언제까지 빛날까?", "지구 속에는 무엇이 있을까?",
  "달의 뒷면은 왜 다를까?", "태초에는 무엇이 있었을까?", "미래에는 바다가 변할까?",
  "인간은 다른 별에 살까?", "시간은 왜 한 방향일까?", "우리는 혼자인 걸까?",
  "내일 비가 올까?", "십 년 뒤 직업은 뭘까?", "미래 도시의 모습은?",
  "새는 길을 어떻게 찾을까?", "고양이는 나를 기억할까?", "꿈을 조절할 수 있을까?",
  "뇌는 왜 잠을 자야 할까?", "우주에는 소리가 있을까?", "별에도 계절이 있을까?",
  "다른 행성에도 바다가?", "지구 중심은 어떤 모습일까?", "공룡은 어떤 소리를 냈을까?",
  "미래 음식은 어떤 맛일까?", "인간은 얼마나 오래 살까?",
  "사라진 생물은 돌아올까?", "기후는 어디까지 변할까?", "우주선은 얼마나 빨라질까?",
  "심해에는 거인이 있을까?", "눈에 안 보이는 생명은?", "평행세계는 존재할까?",
  "우주의 끝을 볼 수 있을까?", "내 생각은 어디서 생길까?", "기억을 옮길 수 있을까?",
  "미래에는 학교가 있을까?", "로봇과 친구가 될 수 있을까?", "별은 왜 반짝일까?",
  "행성은 어떻게 태어날까?", "외계 생명은 어떤 색일까?", "인간은 화성에서 살까?",
  "심해는 왜 어두울까?", "우주에서 냄새가 날까?", "미래의 나는 어디에 있을까?",
  "곤충은 꿈을 꿀까?", "고래는 얼마나 멀리 갈까?",
  "지구는 왜 둥글까?", "달은 왜 따라오는 것 같을까?", "시간을 멈출 수 있을까?",
  "과거를 볼 수 있을까?", "미래를 예측할 수 있을까?", "우주는 왜 생겼을까?",
  "생명체의 끝은 어디일까?", "다른 지구가 있을까?", "인류는 언제까지 살까?",
  "태양보다 큰 별은 얼마나?", "우주에는 중심이 있을까?", "별이 사라지면 어떻게 될까?",
  "미래에는 날아다닐까?", "내일의 뉴스는 무엇일까?", "백 년 뒤 서울은 어떨까?",
  "바닷속 도시는 가능할까?", "우주 엘리베이터가 생길까?", "미래의 동물은 말을 할까?",
  "신기한 생명은 더 있을까?", "나는 무엇이 될까?"
];

const loginView = document.querySelector("#loginView");
const dashboardView = document.querySelector("#dashboardView");
const loginForm = document.querySelector("#loginForm");
const passwordInput = document.querySelector("#passwordInput");
const loginButton = document.querySelector("#loginButton");
const loginMessage = document.querySelector("#loginMessage");
const logoutButton = document.querySelector("#logoutButton");

const totalCount = document.querySelector("#totalCount");
const realCount = document.querySelector("#realCount");
const testCount = document.querySelector("#testCount");
const winnerCount = document.querySelector("#winnerCount");
const listSummary = document.querySelector("#listSummary");
const responseTbody = document.querySelector("#responseTbody");
const emptyRows = document.querySelector("#emptyRows");
const filterSelect = document.querySelector("#filterSelect");
const searchInput = document.querySelector("#searchInput");

const testButtons = [...document.querySelectorAll(".test-generate")];
const deleteTestsButton = document.querySelector("#deleteTestsButton");
const testMessage = document.querySelector("#testMessage");

const includeTestsCheckbox = document.querySelector("#includeTestsCheckbox");
const drawButton = document.querySelector("#drawButton");
const currentWinnerCard = document.querySelector("#currentWinnerCard");
const currentWinnerQuestion = document.querySelector("#currentWinnerQuestion");
const currentWinnerNickname = document.querySelector("#currentWinnerNickname");
const clearWinnerButton = document.querySelector("#clearWinnerButton");
const resetWinnersButton = document.querySelector("#resetWinnersButton");
const drawMessage = document.querySelector("#drawMessage");

const deleteAllButton = document.querySelector("#deleteAllButton");
const dangerMessage = document.querySelector("#dangerMessage");
const connectionText = document.querySelector("#connectionText");
const authIdentity = document.querySelector("#authIdentity");

let auth;
let db;
let responses = [];
let currentWinnerState = null;
let unsubscribeResponses = null;
let unsubscribeConnection = null;
let unsubscribeWinner = null;

function setBusy(elements, busy) {
  for (const element of elements) {
    if (element) element.disabled = busy;
  }
}

function normalizeResponse(id, raw = {}) {
  return {
    id,
    nickname: String(raw.nickname ?? "").trim(),
    question: String(raw.question ?? "").trim(),
    createdAt: Number(raw.createdAt ?? 0),
    winner: Boolean(raw.winner),
    isTest: Boolean(raw.isTest)
  };
}

function formatTime(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
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

function getFilteredResponses() {
  const filter = filterSelect.value;
  const term = searchInput.value.trim().toLowerCase();

  return responses
    .filter((item) => {
      if (filter === "real" && item.isTest) return false;
      if (filter === "test" && !item.isTest) return false;
      if (filter === "winner" && !item.winner) return false;

      if (term) {
        const haystack = `${item.nickname} ${item.question}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

function renderStats() {
  totalCount.textContent = String(responses.length);
  testCount.textContent = String(responses.filter((item) => item.isTest).length);
  realCount.textContent = String(responses.filter((item) => !item.isTest).length);
  winnerCount.textContent = String(responses.filter((item) => item.winner).length);
}

function renderRows() {
  const filtered = getFilteredResponses();
  listSummary.textContent = `${filtered.length}개 응답`;
  emptyRows.hidden = filtered.length > 0;

  responseTbody.innerHTML = filtered.map((item) => `
    <tr>
      <td>
        <span class="badge ${item.isTest ? "test" : ""}">
          ${item.isTest ? "TEST" : "실제"}
        </span>
      </td>
      <td>${escapeHtml(item.nickname || "-")}</td>
      <td class="question-cell">${escapeHtml(item.question)}</td>
      <td class="time-cell">${escapeHtml(formatTime(item.createdAt))}</td>
      <td>${item.winner ? '<span class="badge winner">당첨</span>' : "-"}</td>
      <td>
        <button
          class="row-delete-button"
          type="button"
          data-delete-id="${escapeHtml(item.id)}"
          aria-label="${escapeHtml(item.nickname || item.question)} 응답 삭제"
        >삭제</button>
      </td>
    </tr>
  `).join("");
}

function renderAll() {
  renderStats();
  renderRows();
}

function renderCurrentWinner() {
  const active = currentWinnerState?.active === true;
  if (!active) {
    currentWinnerCard.hidden = true;
    return;
  }

  const expiresAt = Number(currentWinnerState.expiresAt ?? 0);
  if (expiresAt && Date.now() >= expiresAt) {
    currentWinnerCard.hidden = true;
    return;
  }

  currentWinnerQuestion.textContent = String(currentWinnerState.question ?? "");
  currentWinnerNickname.textContent = currentWinnerState.nickname
    ? `닉네임: ${currentWinnerState.nickname}`
    : "닉네임 정보 없음";
  currentWinnerCard.hidden = false;
}

function attachRealtimeListeners() {
  if (unsubscribeResponses) unsubscribeResponses();
  if (unsubscribeConnection) unsubscribeConnection();
  if (unsubscribeWinner) unsubscribeWinner();

  unsubscribeResponses = onValue(ref(db, "responses"), (snapshot) => {
    const raw = snapshot.val() ?? {};
    responses = Object.entries(raw).map(([id, value]) => normalizeResponse(id, value));
    renderAll();
  }, (error) => {
    console.error(error);
    connectionText.textContent = "응답 목록 권한 오류";
  });

  unsubscribeConnection = onValue(ref(db, ".info/connected"), (snapshot) => {
    connectionText.textContent = snapshot.val() === true
      ? "Firebase 실시간 연결"
      : "Firebase 연결 끊김";
  });

  unsubscribeWinner = onValue(ref(db, "displayState/currentWinner"), (snapshot) => {
    currentWinnerState = snapshot.val();
    renderCurrentWinner();
  });
}

async function login(password) {
  if (!isFirebaseConfigured) throw new Error("Firebase 설정이 없습니다.");
  return signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
}

async function deleteResponseById(id) {
  const item = responses.find((response) => response.id === id);
  if (!item) return;

  const ok = window.confirm(`다음 응답을 삭제할까요?\n\n${item.question}`);
  if (!ok) return;

  const updates = {
    [`responses/${id}`]: null,
    [`publicResponses/${id}`]: null
  };

  if (currentWinnerState?.responseId === id) {
    updates["displayState/currentWinner"] = null;
  }

  await update(ref(db), updates);
}

function testQuestionAt(index) {
  return TEST_QUESTIONS[index % TEST_QUESTIONS.length];
}

async function generateTestResponses(count) {
  const safeCount = Math.max(1, Math.min(100, Number(count) || 0));
  const updates = {};
  const baseTime = Date.now();
  const offset = Math.floor(Math.random() * TEST_QUESTIONS.length);

  for (let i = 0; i < safeCount; i += 1) {
    const id = push(ref(db, "responses")).key;
    if (!id) continue;

    const question = testQuestionAt(i + offset).slice(0, 20);
    const nickname = `TEST-${String((i + 1) % 1000).padStart(3, "0")}`.slice(0, 10);
    const createdAt = baseTime + i;

    updates[`responses/${id}`] = {
      nickname,
      question,
      createdAt,
      winner: false,
      isTest: true
    };

    updates[`publicResponses/${id}`] = {
      question,
      createdAt,
      winner: false,
      isTest: true
    };
  }

  await update(ref(db), updates);
}

async function deleteTestResponses() {
  const testItems = responses.filter((item) => item.isTest);
  if (testItems.length === 0) {
    testMessage.textContent = "삭제할 테스트 데이터가 없습니다.";
    return;
  }

  const ok = window.confirm(`테스트 응답 ${testItems.length}개를 모두 삭제할까요?`);
  if (!ok) return;

  const updates = {};
  for (const item of testItems) {
    updates[`responses/${item.id}`] = null;
    updates[`publicResponses/${item.id}`] = null;
  }

  if (testItems.some((item) => item.id === currentWinnerState?.responseId)) {
    updates["displayState/currentWinner"] = null;
  }

  await update(ref(db), updates);
}

function secureRandomIndex(length) {
  if (length <= 0) return -1;

  if (!window.crypto?.getRandomValues) {
    return Math.floor(Math.random() * length);
  }

  const max = 0x100000000;
  const limit = max - (max % length);
  const buffer = new Uint32Array(1);

  do {
    window.crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);

  return buffer[0] % length;
}

async function drawWinner() {
  const includeTests = includeTestsCheckbox.checked;

  const eligible = responses.filter((item) =>
    !item.winner && (includeTests || !item.isTest)
  );

  if (eligible.length === 0) {
    drawMessage.textContent = includeTests
      ? "추첨 가능한 미당첨 응답이 없습니다."
      : "추첨 가능한 실제 응답이 없습니다.";
    return;
  }

  const index = secureRandomIndex(eligible.length);
  const selected = eligible[index];
  const now = Date.now();

  await update(ref(db), {
    [`responses/${selected.id}/winner`]: true,
    [`publicResponses/${selected.id}/winner`]: true,
    "displayState/currentWinner": {
      active: true,
      responseId: selected.id,
      question: selected.question,
      nickname: selected.nickname,
      shownAt: now,
      expiresAt: now + WINNER_DURATION_MS
    }
  });

  drawMessage.textContent = "추첨 결과를 시각화 화면에 표시했습니다.";
}

async function clearWinnerDisplay() {
  await remove(ref(db, "displayState/currentWinner"));
  drawMessage.textContent = "시각화 화면을 일반 질문 화면으로 복귀시켰습니다.";
}

async function resetWinnerHistory() {
  const winners = responses.filter((item) => item.winner);
  if (winners.length === 0) {
    drawMessage.textContent = "초기화할 당첨 이력이 없습니다.";
    return;
  }

  const ok = window.confirm(`당첨 이력 ${winners.length}건을 모두 초기화할까요?`);
  if (!ok) return;

  const updates = {
    "displayState/currentWinner": null
  };

  for (const item of winners) {
    updates[`responses/${item.id}/winner`] = false;
    updates[`publicResponses/${item.id}/winner`] = false;
  }

  await update(ref(db), updates);
  drawMessage.textContent = "당첨 이력을 초기화했습니다.";
}

async function deleteAllResponses() {
  if (responses.length === 0) {
    dangerMessage.textContent = "삭제할 응답이 없습니다.";
    return;
  }

  const typed = window.prompt(
    `실제 응답을 포함한 ${responses.length}개 데이터를 전부 삭제합니다.\n계속하려면 '전체삭제'를 입력하세요.`
  );

  if (typed !== "전체삭제") {
    dangerMessage.textContent = "전체 삭제를 취소했습니다.";
    return;
  }

  const updates = {
    "displayState/currentWinner": null
  };

  for (const item of responses) {
    updates[`responses/${item.id}`] = null;
    updates[`publicResponses/${item.id}`] = null;
  }

  await update(ref(db), updates);

  dangerMessage.textContent = `전체 응답 ${responses.length}개를 삭제했습니다.`;
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

filterSelect.addEventListener("change", renderRows);
searchInput.addEventListener("input", renderRows);

responseTbody.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-id]");
  if (!button) return;

  button.disabled = true;
  try {
    await deleteResponseById(button.dataset.deleteId);
  } catch (error) {
    console.error(error);
    window.alert("삭제에 실패했습니다.");
  } finally {
    button.disabled = false;
  }
});

for (const button of testButtons) {
  button.addEventListener("click", async () => {
    const count = Number(button.dataset.count);
    setBusy(testButtons, true);
    deleteTestsButton.disabled = true;
    testMessage.textContent = `테스트 질문 ${count}개 생성 중…`;

    try {
      await generateTestResponses(count);
      testMessage.textContent = `테스트 질문 ${count}개를 생성했습니다.`;
    } catch (error) {
      console.error(error);
      testMessage.textContent = "테스트 질문 생성에 실패했습니다.";
    } finally {
      setBusy(testButtons, false);
      deleteTestsButton.disabled = false;
    }
  });
}

deleteTestsButton.addEventListener("click", async () => {
  setBusy([deleteTestsButton], true);
  try {
    await deleteTestResponses();
  } catch (error) {
    console.error(error);
    testMessage.textContent = "테스트 데이터 삭제에 실패했습니다.";
  } finally {
    setBusy([deleteTestsButton], false);
  }
});

drawButton.addEventListener("click", async () => {
  setBusy([drawButton], true);
  drawMessage.textContent = "추첨 중…";
  try {
    await drawWinner();
  } catch (error) {
    console.error(error);
    drawMessage.textContent = "추첨 처리에 실패했습니다.";
  } finally {
    setBusy([drawButton], false);
  }
});

clearWinnerButton.addEventListener("click", async () => {
  setBusy([clearWinnerButton], true);
  try {
    await clearWinnerDisplay();
  } catch (error) {
    console.error(error);
    drawMessage.textContent = "시각화 복귀 처리에 실패했습니다.";
  } finally {
    setBusy([clearWinnerButton], false);
  }
});

resetWinnersButton.addEventListener("click", async () => {
  setBusy([resetWinnersButton], true);
  try {
    await resetWinnerHistory();
  } catch (error) {
    console.error(error);
    drawMessage.textContent = "당첨 이력 초기화에 실패했습니다.";
  } finally {
    setBusy([resetWinnersButton], false);
  }
});

deleteAllButton.addEventListener("click", async () => {
  setBusy([deleteAllButton], true);
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
    } else {
      authIdentity.textContent = "";
      responses = [];
      currentWinnerState = null;
      renderAll();

      if (unsubscribeResponses) unsubscribeResponses();
      if (unsubscribeConnection) unsubscribeConnection();
      if (unsubscribeWinner) unsubscribeWinner();

      unsubscribeResponses = null;
      unsubscribeConnection = null;
      unsubscribeWinner = null;

      if (user) {
        signOut(auth);
        loginMessage.textContent = "관리자 계정이 아닙니다.";
      }
    }
  });
}

initialize();
