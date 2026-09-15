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

const form = document.querySelector("#responseForm");
const nicknameInput = document.querySelector("#nickname");
const questionInput = document.querySelector("#question");
const submitButton = document.querySelector("#submitButton");
const formMessage = document.querySelector("#formMessage");
const completedState = document.querySelector("#completedState");
const configWarning = document.querySelector("#configWarning");

let db = null;

function normalizeSingleLine(value) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function showCompletedState() {
  form.hidden = true;
  completedState.hidden = false;
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

function initialize() {
  if (localStorage.getItem(STORAGE_KEY) === "true") {
    showCompletedState();
  }

  if (!isFirebaseConfigured) {
    configWarning.hidden = false;
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

  if (localStorage.getItem(STORAGE_KEY) === "true") {
    showCompletedState();
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

    // Firebase 저장 성공이 확인된 뒤에만 참여 완료 상태를 기록합니다.
    localStorage.setItem(STORAGE_KEY, "true");

    formMessage.textContent = "";
    showCompletedState();
  } catch (error) {
    console.error("응답 저장 실패:", error);
    formMessage.textContent =
      "저장에 실패했습니다. 입력 내용은 유지됩니다. 다시 제출해주세요.";
    submitButton.disabled = false;
  }
});

initialize();
