import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onValue
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

import {
  firebaseConfig,
  isFirebaseConfigured
} from "./firebase-config.js";

const questionField = document.querySelector("#questionField");
const emptyState = document.querySelector("#emptyState");
const connectionDot = document.querySelector("#connectionDot");
const connectionText = document.querySelector("#connectionText");
const configWarning = document.querySelector("#configWarning");

const cards = new Map();

function setConnectionState(state) {
  connectionDot.classList.remove("online", "offline");

  if (state === "online") {
    connectionDot.classList.add("online");
    connectionText.textContent = "Firebase 연결됨";
  } else if (state === "offline") {
    connectionDot.classList.add("offline");
    connectionText.textContent = "Firebase 연결 끊김";
  } else {
    connectionText.textContent = "연결 확인 중";
  }
}

function updateEmptyState() {
  emptyState.hidden = cards.size > 0;
}

function createQuestionCard(responseId, data) {
  const card = document.createElement("article");
  card.className = "question-card";
  card.dataset.responseId = responseId;

  const star = document.createElement("span");
  star.className = "question-star";
  star.textContent = "★";
  star.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.className = "question-text";
  text.textContent = data.question ?? "";

  card.append(star, text);
  return card;
}

function addOrUpdateQuestion(responseId, data) {
  const existing = cards.get(responseId);

  if (existing) {
    existing.querySelector(".question-text").textContent = data.question ?? "";
    return;
  }

  const card = createQuestionCard(responseId, data);
  cards.set(responseId, card);
  questionField.append(card);
  updateEmptyState();
}

function removeQuestion(responseId) {
  const card = cards.get(responseId);

  if (!card) {
    return;
  }

  card.remove();
  cards.delete(responseId);
  updateEmptyState();
}

function initialize() {
  if (!isFirebaseConfigured) {
    configWarning.hidden = false;
    setConnectionState("offline");
    return;
  }

  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  onValue(ref(db, ".info/connected"), (snapshot) => {
    setConnectionState(snapshot.val() === true ? "online" : "offline");
  });

  const publicResponsesRef = ref(db, "publicResponses");

  onChildAdded(publicResponsesRef, (snapshot) => {
    addOrUpdateQuestion(snapshot.key, snapshot.val() ?? {});
  });

  onChildChanged(publicResponsesRef, (snapshot) => {
    addOrUpdateQuestion(snapshot.key, snapshot.val() ?? {});
  });

  onChildRemoved(publicResponsesRef, (snapshot) => {
    removeQuestion(snapshot.key);
  });
}

initialize();
