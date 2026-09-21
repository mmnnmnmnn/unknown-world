import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  query,
  orderByChild,
  limitToLast
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

import {
  firebaseConfig,
  isFirebaseConfigured
} from "../js/firebase-config.js";

const NEW_QUESTION_HIGHLIGHT_MS = 4000;
const DISPLAY_LIMIT = 100;
const SAFE_X = 43;
const SAFE_Y = 34;

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
let currentRecords = [];
let latestSeenRecord = null;

function setConnectionState(state) {
  connectionState.dataset.state = state;
  connectionText.textContent =
    state === "online"
      ? "실시간 연결"
      : state === "offline"
        ? "연결 끊김"
        : "연결 확인 중";

  if (state === "online" && isFirebaseConfigured) {
    configWarning.hidden = true;
  }
}

function normalizeRecord(id, raw = {}) {
  return {
    id,
    question: String(raw.question ?? "").trim(),
    createdAt: Number(raw.createdAt ?? 0)
  };
}

function compareRecords(a, b) {
  const timeDiff = a.createdAt - b.createdAt;
  if (timeDiff !== 0) return timeDiff;
  return a.id.localeCompare(b.id);
}

function sortRecords(records) {
  return [...records].sort(compareRecords);
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
  return 19;
}

function getNodeMaxWidth(count) {
  if (count <= 4) return 38;
  if (count <= 12) return 34;
  if (count <= 30) return 28;
  if (count <= 50) return 23;
  if (count <= 80) return 19;
  return 16;
}

function computePosition(record, index, count) {
  if (count <= 1) {
    return { x: 50, y: 48 };
  }

  const t = index / Math.max(1, count - 1);
  const radius = Math.sqrt(t);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const jitter = (hashUnit(record.id) - 0.5) * 0.32;
  const angle = index * goldenAngle + jitter;

  const x = 50 + Math.cos(angle) * SAFE_X * radius;
  const y = 47 + Math.sin(angle) * SAFE_Y * radius;

  return {
    x: clamp(x, 5, 95),
    y: clamp(y, 7, 86)
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

function layoutNodes(records = currentRecords) {
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
  ).slice(-DISPLAY_LIMIT);

  const nextIds = new Set(nextRecords.map((record) => record.id));
  const addedRecords = [];

  for (const [id, node] of nodes.entries()) {
    if (!nextIds.has(id)) {
      node.remove();
      nodes.delete(id);
    }
  }

  for (const record of nextRecords) {
    let node = nodes.get(record.id);
    if (!node) {
      node = createNode(record);
      addedRecords.push(record);
    }
    updateNodeText(node, record);
  }

  currentRecords = nextRecords;
  layoutNodes();

  const newest = nextRecords.at(-1) ?? null;

  if (!firstSnapshotReceived) {
    latestSeenRecord = newest;
    firstSnapshotReceived = true;
    return;
  }

  const trulyNew = addedRecords
    .filter((record) => !latestSeenRecord || compareRecords(record, latestSeenRecord) > 0)
    .sort(compareRecords);

  const newestAdded = trulyNew.at(-1);
  if (newestAdded) {
    markAsNew(newestAdded.id);
    showNewQuestionOverlay(newestAdded.question);
  }

  if (newest && (!latestSeenRecord || compareRecords(newest, latestSeenRecord) > 0)) {
    latestSeenRecord = newest;
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

  const latestQuestionsQuery = query(
    ref(db, "publicResponses"),
    orderByChild("createdAt"),
    limitToLast(DISPLAY_LIMIT)
  );

  onValue(
    latestQuestionsQuery,
    syncSnapshot,
    () => {
      setConnectionState("offline");
      configWarning.hidden = false;
      configWarning.textContent = "질문 데이터를 불러오지 못했습니다. Firebase 권한을 확인해주세요.";
    }
  );

  window.addEventListener("resize", () => {
    requestAnimationFrame(() => layoutNodes());
  });
}

initialize();
