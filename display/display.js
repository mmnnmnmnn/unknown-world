import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

import {
  firebaseConfig,
  isFirebaseConfigured
} from "../js/firebase-config.js";

const NEW_QUESTION_HIGHLIGHT_MS = 4000;
const SAFE_X = 43;
const SAFE_Y = 38;

const appRoot = document.querySelector("#displayApp");
const questionField = document.querySelector("#questionField");
const emptyState = document.querySelector("#emptyState");
const newQuestionOverlay = document.querySelector("#newQuestionOverlay");
const newQuestionText = document.querySelector("#newQuestionText");
const connectionState = document.querySelector("#connectionState");
const connectionText = document.querySelector("#connectionText");
const configWarning = document.querySelector("#configWarning");

const nodes = new Map();
let firstSnapshotReceived = false;
let highlightTimer = 0;

function setConnectionState(state) {
  connectionState.dataset.state = state;
  connectionText.textContent =
    state === "online"
      ? "실시간 연결"
      : state === "offline"
        ? "연결 끊김"
        : "연결 확인 중";
}

function normalizeRecord(id, raw = {}) {
  return {
    id,
    question: String(raw.question ?? "").trim(),
    createdAt: Number(raw.createdAt ?? 0),
    winner: Boolean(raw.winner)
  };
}

function sortRecords(records) {
  return [...records].sort((a, b) => {
    const timeDiff = a.createdAt - b.createdAt;
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashUnit(value) {
  return (hashString(value) % 10000) / 10000;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getTextSize(count) {
  if (count <= 1) return 64;
  if (count <= 4) return 52;
  if (count <= 9) return 42;
  if (count <= 18) return 34;
  if (count <= 30) return 28;
  if (count <= 50) return 24;
  if (count <= 80) return 21;
  if (count <= 120) return 19;
  return 18;
}

function getNodeMaxWidth(count) {
  if (count <= 4) return 38;
  if (count <= 12) return 34;
  if (count <= 30) return 28;
  if (count <= 50) return 23;
  if (count <= 80) return 19;
  if (count <= 120) return 16;
  return 14;
}

function computePosition(record, index, count) {
  if (count <= 1) {
    return { x: 50, y: 50 };
  }

  // Golden-angle spiral: deterministic, evenly dispersed, and expands as questions accumulate.
  const t = index / Math.max(1, count - 1);
  const radius = Math.sqrt(t);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const jitter = (hashUnit(record.id) - 0.5) * 0.32;
  const angle = index * goldenAngle + jitter;

  const x = 50 + Math.cos(angle) * SAFE_X * radius;
  const y = 50 + Math.sin(angle) * SAFE_Y * radius;

  return {
    x: clamp(x, 5, 95),
    y: clamp(y, 7, 93)
  };
}

function createNode(record) {
  const node = document.createElement("article");
  node.className = "question-node";
  node.dataset.responseId = record.id;

  const text = document.createElement("span");
  text.className = "question-text";
  text.textContent = record.question;

  node.append(text);
  questionField.append(node);
  nodes.set(record.id, node);
  return node;
}

function updateNodeText(node, record) {
  const text = node.querySelector(".question-text");
  if (text && text.textContent !== record.question) {
    text.textContent = record.question;
  }
}

function layoutNodes(records) {
  const count = records.length;
  const textSize = getTextSize(count);
  const maxWidth = getNodeMaxWidth(count);
  emptyState.hidden = count > 0;

  records.forEach((record, index) => {
    const node = nodes.get(record.id);
    if (!node) return;

    const position = computePosition(record, index, count);
    node.style.setProperty("--x", `${position.x}%`);
    node.style.setProperty("--y", `${position.y}%`);
    node.style.setProperty("--text-size", `${textSize}px`);
    node.style.setProperty("--node-max-width", `${maxWidth}vw`);
  });
}

function markAsNew(id) {
  const node = nodes.get(id);
  if (!node) return;

  node.classList.remove("is-new");
  void node.offsetWidth;
  node.classList.add("is-new");

  window.setTimeout(() => {
    node.classList.remove("is-new");
  }, NEW_QUESTION_HIGHLIGHT_MS);
}

function showNewQuestionOverlay(question) {
  window.clearTimeout(highlightTimer);
  newQuestionText.textContent = question;
  newQuestionOverlay.classList.remove("is-visible");
  void newQuestionOverlay.offsetWidth;
  newQuestionOverlay.classList.add("is-visible");

  highlightTimer = window.setTimeout(() => {
    newQuestionOverlay.classList.remove("is-visible");
  }, NEW_QUESTION_HIGHLIGHT_MS);
}

function syncSnapshot(snapshot) {
  const raw = snapshot.val() ?? {};
  const nextRecords = sortRecords(
    Object.entries(raw)
      .map(([id, data]) => normalizeRecord(id, data))
      .filter((record) => record.question.length > 0)
  );

  const nextIds = new Set(nextRecords.map((record) => record.id));
  const previousIds = new Set(nodes.keys());
  const addedIds = [];

  // Remove deleted responses immediately.
  for (const [id, node] of nodes.entries()) {
    if (!nextIds.has(id)) {
      node.remove();
      nodes.delete(id);
    }
  }

  // Add/update current responses.
  for (const record of nextRecords) {
    let node = nodes.get(record.id);
    if (!node) {
      node = createNode(record);
      addedIds.push(record.id);
    }
    updateNodeText(node, record);
  }

  layoutNodes(nextRecords);

  // Initial database hydration should appear calmly, not as dozens of new-question alerts.
  if (firstSnapshotReceived && addedIds.length > 0) {
    const newestAdded = nextRecords
      .filter((record) => addedIds.includes(record.id))
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (newestAdded) {
      markAsNew(newestAdded.id);
      showNewQuestionOverlay(newestAdded.question);
    }
  }

  firstSnapshotReceived = true;

  // If the snapshot only updated existing records, preserve the current visual state.
  if (previousIds.size === 0 && nodes.size > 0) {
    requestAnimationFrame(() => layoutNodes(nextRecords));
  }
}

function initialize() {
  if (!isFirebaseConfigured) {
    configWarning.hidden = false;
    setConnectionState("offline");
    return;
  }

  const firebaseApp = initializeApp(firebaseConfig);
  const db = getDatabase(firebaseApp);

  onValue(ref(db, ".info/connected"), (snapshot) => {
    setConnectionState(snapshot.val() === true ? "online" : "offline");
  });

  onValue(
    ref(db, "publicResponses"),
    syncSnapshot,
    () => {
      setConnectionState("offline");
      configWarning.hidden = false;
      configWarning.textContent = "질문 데이터를 불러오지 못했습니다. Firebase 권한을 확인해주세요.";
    }
  );
}

initialize();
