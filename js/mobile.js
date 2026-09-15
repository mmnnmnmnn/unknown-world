import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  update,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

import {
  firebaseConfig,
  isFirebaseConfigured
} from "./firebase-config.js";

const STORAGE_KEY = "unknown-world-submission-complete";
const LAST_RESPONSE_KEY = "unknown-world-last-response";

const startScreen = document.querySelector("#startScreen");
const transitionScreen = document.querySelector("#transitionScreen");
const scene14Screen = document.querySelector("#scene14Screen");

const enterButton = document.querySelector("#enterButton");
const replayButton = document.querySelector("#replayButton");
const startButtonFromComplete = document.querySelector("#startButtonFromComplete");

const revisitNotice = document.querySelector("#revisitNotice");
const configWarningStart = document.querySelector("#configWarningStart");
const scene14Warning = document.querySelector("#scene14Warning");

const form = document.querySelector("#responseForm");
const nicknameInput = document.querySelector("#nickname");
const questionInput = document.querySelector("#question");
const submitButton = document.querySelector("#submitButton");
const formMessage = document.querySelector("#formMessage");

const completedState = document.querySelector("#completedState");
const completedTitle = document.querySelector("#completedTitle");
const submissionSummary = document.querySelector("#submissionSummary");

let db = null;
let transitionTimer = null;

function normalizeSingleLine(value) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function isCompletedBrowser() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function getLastResponse() {
  try {
    const raw = localStorage.getItem(LAST_RESPONSE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("저장된 응답 정보 파싱 실패:", error);
    return null;
  }
}

function setScreen(screenName) {
  startScreen.hidden = screenName !== "start";
  transitionScreen.hidden = screenName !== "transition";
  scene14Screen.hidden = screenName !== "scene14";
}

function renderStartScreen() {
  revisitNotice.hidden = !isCompletedBrowser();
  configWarningStart.hidden = isFirebaseConfigured;
  setScreen("start");
}

function renderSubmissionSummary() {
  const lastResponse = getLastResponse();
  submissionSummary.innerHTML = "";

  const rows = [
    {
      label: "닉네임",
      value: lastResponse?.nickname ?? "확인할 수 없음"
    },
    {
      label: "질문",
      value: lastResponse?.question ?? "확인할 수 없음"
    }
  ];

  rows.forEach((row) => {
    const wrapper = document.createElement("div");
    wrapper.className = "summary-row";

    const dt = document.createElement("dt");
    dt.textContent = row.label;

    const dd = document.createElement("dd");
    dd.textContent = row.value;

    wrapper.append(dt, dd);
    submissionSummary.append(wrapper);
  });
}

function showCompletedPanel(options = {}) {
  const { title = "제출이 완료되었습니다." } = options;

  completedTitle.textContent = title;
  form.hidden = true;
  completedState.hidden = false;
  renderSubmissionSummary();
}

function showEntryForm() {
  completedState.hidden = true;
  form.hidden = false;
  formMessage.textContent = "";
  submitButton.disabled = false;
  scene14Warning.hidden = isFirebaseConfigured;

  if (!isCompletedBrowser()) {
    nicknameInput.value = "";
    questionInput.value = "";
  }
}

function renderScene14() {
  setScreen("scene14");

  if (isCompletedBrowser()) {
    showCompletedPanel({ title: "이미 참여가 완료된 브라우저입니다." });
  } else {
    showEntryForm();
  }
}

function startExperience() {
  clearTimeout(transitionTimer);
  setScreen("transition");

  transitionTimer = window.setTimeout(() => {
    renderScene14();
  }, 1150);
}

function returnToStart() {
  clearTimeout(transitionTimer);
  renderStartScreen();
}

function validateInputs() {
  const nickname = normalizeSingleLine(nicknameInput.value);
  const question = normalizeSingleLine(questionInput.value);

  if (nickname.length < 1 || nickname.length > 10) {
    return { ok: false, message: "닉네임은 1~10자로 입력해주세요." };
  }

  if (question.length < 1 || question.length > 20) {
    return { ok: false, message: "질문은 1~20자로 입력해주세요." };
  }

  return { ok: true, nickname, question };
}

function saveLocalCompletion(data) {
  localStorage.setItem(STORAGE_KEY, "true");
  localStorage.setItem(LAST_RESPONSE_KEY, JSON.stringify(data));
}

function initializeFirebase() {
  if (!isFirebaseConfigured) {
    submitButton.disabled = true;
    return;
  }

  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!db) {
    formMessage.textContent = "Firebase 설정을 먼저 완료해주세요.";
    return;
  }

  if (isCompletedBrowser()) {
    showCompletedPanel({ title: "이미 참여가 완료된 브라우저입니다." });
    return;
  }

  const validation = validateInputs();

  if (!validation.ok) {
    formMessage.textContent = validation.message;
    return;
  }

  nicknameInput.value = validation.nickname;
  questionInput.value = validation.question;

  submitButton.disabled = true;
  formMessage.textContent = "저장 중입니다…";

  try {
    const responseId = push(ref(db, "responses")).key;

    if (!responseId) {
      throw new Error("responseId 생성 실패");
    }

    const timestamp = serverTimestamp();

    const privateResponse = {
      nickname: validation.nickname,
      question: validation.question,
      createdAt: timestamp,
      winner: false
    };

    const publicResponse = {
      question: validation.question,
      createdAt: timestamp,
      winner: false
    };

    await update(ref(db), {
      [`responses/${responseId}`]: privateResponse,
      [`publicResponses/${responseId}`]: publicResponse
    });

    saveLocalCompletion({
      responseId,
      nickname: validation.nickname,
      question: validation.question,
      submittedAtLocal: Date.now()
    });

    formMessage.textContent = "";
    showCompletedPanel({ title: "제출이 완료되었습니다." });
  } catch (error) {
    console.error("응답 저장 실패:", error);
    formMessage.textContent =
      "저장에 실패했습니다. 입력 내용은 유지됩니다. 다시 제출해주세요.";
    submitButton.disabled = false;
  }
});

enterButton.addEventListener("click", startExperience);
replayButton.addEventListener("click", returnToStart);
startButtonFromComplete.addEventListener("click", returnToStart);

initializeFirebase();
renderStartScreen();
