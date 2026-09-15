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

/* -------------------------------------------------------
   기본 상태
------------------------------------------------------- */
const STORAGE_KEY = "unknown-world-submission-complete";
const LAST_RESPONSE_KEY = "unknown-world-last-response";

const SCENE1_DURATION = 24000;
const SCENE1_ASSETS = [
  "./assets/scene01-space/star-chart-bg.png",
  "./assets/scene01-space/globe.png",
  "./assets/scene01-space/telescope-observer.png",
  "./assets/scene01-space/rocket-idle.png",
  "./assets/scene01-space/rocket-launch.png",
  "./assets/scene01-space/cloud-left.png",
  "./assets/scene01-space/cloud-right.png",
  "./assets/scene01-space/cloud-small.png",
  "./assets/scene01-space/lady-on-star.png",
  "./assets/scene01-space/deity-figure.png",
  "./assets/scene01-space/moth.png",
  "./assets/scene01-space/planet-jupiter.png",
  "./assets/scene01-space/planet-green.png",
  "./assets/scene01-space/saturn.png"
];

const startScreen = document.querySelector("#startScreen");
const scene1Screen = document.querySelector("#scene1Screen");
const scene14Screen = document.querySelector("#scene14Screen");

const enterButton = document.querySelector("#enterButton");
const loadStatus = document.querySelector("#loadStatus");
const revisitNotice = document.querySelector("#revisitNotice");
const sceneLoading = document.querySelector("#sceneLoading");

const sceneCamera = document.querySelector("#sceneCamera");
const backgroundDrift = document.querySelector("#backgroundDrift");
const globe = document.querySelector("#globe");
const observer = document.querySelector("#observer");
const rocketGroup = document.querySelector("#rocketGroup");
const rocketIdle = document.querySelector("#rocketIdle");
const rocketLaunch = document.querySelector("#rocketLaunch");
const cloudLeft = document.querySelector("#cloudLeft");
const cloudRight = document.querySelector("#cloudRight");
const cloudSmall = document.querySelector("#cloudSmall");

const decorativeElements = [
  document.querySelector("#mothTop"),
  document.querySelector("#ladyOnStar"),
  document.querySelector("#deityFigure"),
  document.querySelector("#jupiter"),
  document.querySelector("#planetGreen"),
  document.querySelector("#saturn"),
  document.querySelector("#mothLower")
];

const ladyOnStar = document.querySelector("#ladyOnStar");
const deityFigure = document.querySelector("#deityFigure");

const form = document.querySelector("#responseForm");
const nicknameInput = document.querySelector("#nickname");
const questionInput = document.querySelector("#question");
const submitButton = document.querySelector("#submitButton");
const formMessage = document.querySelector("#formMessage");
const scene14Warning = document.querySelector("#scene14Warning");
const completedState = document.querySelector("#completedState");
const completedTitle = document.querySelector("#completedTitle");
const submissionSummary = document.querySelector("#submissionSummary");
const replayButton = document.querySelector("#replayButton");

let db = null;
let scene1Ready = false;
let scene1LoadingPromise = null;
let scene1Animations = [];
let scene1Clock = null;
let activeSceneToken = 0;

/* -------------------------------------------------------
   Firebase
------------------------------------------------------- */
function initializeFirebase() {
  if (!isFirebaseConfigured) {
    submitButton.disabled = true;
    scene14Warning.hidden = false;
    return;
  }

  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  scene14Warning.hidden = true;
}

/* -------------------------------------------------------
   LocalStorage
------------------------------------------------------- */
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

function saveLocalCompletion(data) {
  localStorage.setItem(STORAGE_KEY, "true");
  localStorage.setItem(LAST_RESPONSE_KEY, JSON.stringify(data));
}

/* -------------------------------------------------------
   화면 전환
------------------------------------------------------- */
function showOnly(screen) {
  startScreen.hidden = screen !== "start";
  scene1Screen.hidden = screen !== "scene1";
  scene14Screen.hidden = screen !== "scene14";
}

function renderStartScreen() {
  cancelScene1();
  revisitNotice.hidden = !isCompletedBrowser();
  loadStatus.textContent = scene1Ready ? "준비 완료" : "장면을 준비하고 있습니다…";
  showOnly("start");
}

function renderScene14() {
  cancelScene1();
  showOnly("scene14");

  if (isCompletedBrowser()) {
    showCompletedPanel("이미 참여가 완료된 브라우저입니다.");
  } else {
    completedState.hidden = true;
    form.hidden = false;
    formMessage.textContent = "";
    submitButton.disabled = !db;
  }
}

function showCompletedPanel(title = "제출이 완료되었습니다.") {
  completedTitle.textContent = title;
  form.hidden = true;
  completedState.hidden = false;
  renderSubmissionSummary();
}

function renderSubmissionSummary() {
  const lastResponse = getLastResponse();
  submissionSummary.innerHTML = "";

  [
    ["닉네임", lastResponse?.nickname ?? "확인할 수 없음"],
    ["질문", lastResponse?.question ?? "확인할 수 없음"]
  ].forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "summary-row";

    const dt = document.createElement("dt");
    dt.textContent = label;

    const dd = document.createElement("dd");
    dd.textContent = value;

    row.append(dt, dd);
    submissionSummary.append(row);
  });
}

/* -------------------------------------------------------
   Scene 1 에셋 로딩
------------------------------------------------------- */
function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve({ src, ok: true });
    img.onerror = () => resolve({ src, ok: false });
    img.src = src;
  });
}

function preloadScene1(force = false) {
  if (scene1LoadingPromise && !force) {
    return scene1LoadingPromise;
  }

  scene1LoadingPromise = Promise.all(SCENE1_ASSETS.map(preloadImage))
    .then((results) => {
      const failed = results.filter((item) => !item.ok);

      if (failed.length) {
        console.warn("Scene 1 일부 에셋 로딩 실패:", failed);
      }

      const critical = new Set([
        "./assets/scene01-space/star-chart-bg.png",
        "./assets/scene01-space/globe.png",
        "./assets/scene01-space/telescope-observer.png",
        "./assets/scene01-space/rocket-idle.png",
        "./assets/scene01-space/rocket-launch.png"
      ]);

      scene1Ready = results
        .filter((item) => critical.has(item.src))
        .every((item) => item.ok);

      loadStatus.textContent = scene1Ready
        ? "준비 완료"
        : "일부 이미지 로딩에 실패했습니다. 입장 시 다시 시도합니다.";

      return scene1Ready;
    });

  return scene1LoadingPromise;
}

/* -------------------------------------------------------
   WAAPI helper
------------------------------------------------------- */
function createAnimation(element, keyframes, options) {
  const animation = element.animate(keyframes, {
    fill: "both",
    ...options
  });

  scene1Animations.push(animation);
  return animation;
}

function cancelScene1() {
  activeSceneToken += 1;

  scene1Animations.forEach((animation) => {
    try {
      animation.cancel();
    } catch {}
  });

  scene1Animations = [];
  scene1Clock = null;
}

function resetScene1Elements() {
  sceneCamera.style.transform = "";
  backgroundDrift.style.transform = "";
}

/* -------------------------------------------------------
   Scene 1 타임라인
------------------------------------------------------- */
async function playScene1() {
  cancelScene1();
  const token = activeSceneToken;
  resetScene1Elements();
  showOnly("scene1");

  if (!scene1Ready) {
    sceneLoading.hidden = false;
    const ready = await preloadScene1(true);
    sceneLoading.hidden = true;

    if (!ready) {
      console.error("Scene 1 핵심 에셋을 불러오지 못했습니다.");
      renderScene14();
      return;
    }
  }

  if (token !== activeSceneToken) return;

  createAnimation(
    backgroundDrift,
    [
      { transform: "translate3d(-1.1%, 0.8%, 0) scale(1.035)", offset: 0 },
      { transform: "translate3d(0.8%, -0.4%, 0) scale(1.05)", offset: 0.35 },
      { transform: "translate3d(-0.6%, -1.0%, 0) scale(1.045)", offset: 0.72 },
      { transform: "translate3d(0.5%, -1.7%, 0) scale(1.058)", offset: 1 }
    ],
    {
      duration: SCENE1_DURATION,
      easing: "ease-in-out"
    }
  );

  createAnimation(
    sceneCamera,
    [
      { transform: "translate3d(0, 0, 0) scale(1)", offset: 0 },
      { transform: "translate3d(0, -18%, 0) scale(1.8)", offset: 0.18 },
      { transform: "translate3d(0, -19%, 0) scale(1.88)", offset: 0.40 },
      { transform: "translate3d(0, 1.5%, 0) scale(0.87)", offset: 0.57 },
      { transform: "translate3d(-2%, 3%, 0) scale(0.95)", offset: 0.74 },
      { transform: "translate3d(2%, 5%, 0) scale(1.00)", offset: 0.86 },
      { transform: "translate3d(0, 0, 0) scale(1)", offset: 0.95 },
      { transform: "translate3d(0, -2%, 0) scale(1.02)", offset: 1 }
    ],
    {
      duration: SCENE1_DURATION,
      easing: "cubic-bezier(0.42, 0.05, 0.17, 1)"
    }
  );

  createAnimation(
    globe,
    [
      { opacity: 0, transform: "translate3d(0, 30%, 0) scale(0.92)", offset: 0 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 0.10 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 1 }
    ],
    {
      duration: SCENE1_DURATION,
      easing: "cubic-bezier(.2,.8,.25,1)"
    }
  );

  createAnimation(
    observer,
    [
      { opacity: 0, transform: "perspective(1200px) rotateX(87deg) translate3d(0, 18%, 0) scale(0.72)", offset: 0 },
      { opacity: 0, transform: "perspective(1200px) rotateX(87deg) translate3d(0, 18%, 0) scale(0.72)", offset: 0.16 },
      { opacity: 1, transform: "perspective(1200px) rotateX(70deg) translate3d(0, 12%, 0) scale(0.80)", offset: 0.21 },
      { opacity: 1, transform: "perspective(1200px) rotateX(32deg) translate3d(0, 6%, 0) scale(0.93)", offset: 0.26 },
      { opacity: 1, transform: "perspective(1200px) rotateX(0deg) translate3d(0, 0, 0) scale(1)", offset: 0.31 },
      { opacity: 1, transform: "perspective(1200px) rotateX(0deg) translate3d(0, 0, 0) scale(1)", offset: 1 }
    ],
    {
      duration: SCENE1_DURATION,
      easing: "cubic-bezier(.16,.85,.24,1)"
    }
  );

  createAnimation(
    rocketGroup,
    [
      { opacity: 0, transform: "translate3d(0, 28%, 0) scale(0.62) rotate(4deg)", offset: 0 },
      { opacity: 0, transform: "translate3d(0, 28%, 0) scale(0.62) rotate(4deg)", offset: 0.22 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1.02) rotate(1deg)", offset: 0.30 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)", offset: 0.35 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)", offset: 0.48 },
      { opacity: 1, transform: "translate3d(18%, -48%, 0) scale(0.98) rotate(7deg)", offset: 0.64 },
      { opacity: 1, transform: "translate3d(8%, -150%, 0) scale(0.95) rotate(-8deg)", offset: 0.73 },
      { opacity: 1, transform: "translate3d(-8%, -265%, 0) scale(0.90) rotate(-27deg)", offset: 0.81 },
      { opacity: 1, transform: "translate3d(-58%, -355%, 0) scale(0.82) rotate(-48deg)", offset: 0.89 },
      { opacity: 1, transform: "translate3d(-122%, -392%, 0) scale(0.74) rotate(-61deg)", offset: 0.96 },
      { opacity: 0, transform: "translate3d(-175%, -385%, 0) scale(0.68) rotate(-65deg)", offset: 1 }
    ],
    {
      duration: SCENE1_DURATION,
      easing: "cubic-bezier(.4,.03,.28,1)"
    }
  );

  createAnimation(
    rocketIdle,
    [
      { opacity: 1, offset: 0 },
      { opacity: 1, offset: 0.425 },
      { opacity: 0, offset: 0.426 },
      { opacity: 0, offset: 1 }
    ],
    {
      duration: SCENE1_DURATION,
      easing: "linear"
    }
  );

  createAnimation(
    rocketLaunch,
    [
      { opacity: 0, offset: 0 },
      { opacity: 0, offset: 0.425 },
      { opacity: 1, offset: 0.426 },
      { opacity: 1, offset: 1 }
    ],
    {
      duration: SCENE1_DURATION,
      easing: "linear"
    }
  );

  createAnimation(
    cloudLeft,
    [
      { opacity: 0, transform: "translate3d(25%, 10%, 0) scale(0.42)", offset: 0 },
      { opacity: 0, transform: "translate3d(25%, 10%, 0) scale(0.42)", offset: 0.428 },
      { opacity: 0.92, transform: "translate3d(10%, 2%, 0) scale(0.70)", offset: 0.48 },
      { opacity: 1, transform: "translate3d(-2%, 0, 0) scale(0.92)", offset: 0.60 },
      { opacity: 1, transform: "translate3d(-8%, -1%, 0) scale(1.02)", offset: 1 }
    ],
    {
      duration: SCENE1_DURATION,
      easing: "cubic-bezier(.16,.74,.30,1)"
    }
  );

  createAnimation(
    cloudRight,
    [
      { opacity: 0, transform: "translate3d(-24%, 11%, 0) scale(0.42)", offset: 0 },
      { opacity: 0, transform: "translate3d(-24%, 11%, 0) scale(0.42)", offset: 0.428 },
      { opacity: 0.90, transform: "translate3d(-8%, 2%, 0) scale(0.70)", offset: 0.48 },
      { opacity: 1, transform: "translate3d(1%, 0, 0) scale(0.92)", offset: 0.60 },
      { opacity: 1, transform: "translate3d(8%, -1%, 0) scale(1.02)", offset: 1 }
    ],
    {
      duration: SCENE1_DURATION,
      easing: "cubic-bezier(.16,.74,.30,1)"
    }
  );

  createAnimation(
    cloudSmall,
    [
      { opacity: 0, transform: "translate3d(8%, 10%, 0) scale(0.38)", offset: 0 },
      { opacity: 0, transform: "translate3d(8%, 10%, 0) scale(0.38)", offset: 0.435 },
      { opacity: 0.90, transform: "translate3d(0, 0, 0) scale(0.64)", offset: 0.49 },
      { opacity: 0.85, transform: "translate3d(-28%, 1%, 0) scale(0.78)", offset: 0.62 },
      { opacity: 0.74, transform: "translate3d(-74%, 3%, 0) scale(1.02)", offset: 1 }
    ],
    {
      duration: SCENE1_DURATION,
      easing: "ease-out"
    }
  );

  decorativeElements.forEach((element, index) => {
    const dx = index % 2 === 0 ? "-4%" : "4%";
    const dy = index % 3 === 0 ? "-3%" : "3%";

    let revealFrames = [
      { opacity: 0, transform: `translate3d(${dx}, ${dy}, 0) scale(0.92)`, offset: 0 },
      { opacity: 0, transform: `translate3d(${dx}, ${dy}, 0) scale(0.92)`, offset: 0.46 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 0.58 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 1 }
    ];

    if (element === ladyOnStar) {
      revealFrames = [
        { opacity: 0, transform: "translate3d(-4%, 2%, 0) scale(0.92)", offset: 0 },
        { opacity: 0, transform: "translate3d(-4%, 2%, 0) scale(0.92)", offset: 0.46 },
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 0.58 },
        { opacity: 1, transform: "translate3d(0, -1.4%, 0) scale(1)", offset: 0.74 },
        { opacity: 1, transform: "translate3d(0, 0.8%, 0) scale(1)", offset: 0.88 },
        { opacity: 1, transform: "translate3d(0, -0.6%, 0) scale(1)", offset: 1 }
      ];
    }

    if (element === deityFigure) {
      revealFrames = [
        { opacity: 0, transform: "translate3d(4%, 2%, 0) scale(0.92)", offset: 0 },
        { opacity: 0, transform: "translate3d(4%, 2%, 0) scale(0.92)", offset: 0.46 },
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 0.585 },
        { opacity: 1, transform: "translate3d(0, 1.1%, 0) scale(1)", offset: 0.75 },
        { opacity: 1, transform: "translate3d(0, -0.7%, 0) scale(1)", offset: 0.90 },
        { opacity: 1, transform: "translate3d(0, 0.5%, 0) scale(1)", offset: 1 }
      ];
    }

    createAnimation(element, revealFrames, {
      duration: SCENE1_DURATION,
      easing: "ease-out"
    });
  });

  sceneClock = createAnimation(
    scene1Screen,
    [{ opacity: 1 }, { opacity: 1 }],
    { duration: SCENE1_DURATION, easing: "linear" }
  );

  try {
    await sceneClock.finished;
  } catch {
    return;
  }

  if (token !== activeSceneToken) return;
  renderScene14();
}

/* -------------------------------------------------------
   앱 백그라운드 처리
------------------------------------------------------- */
document.addEventListener("visibilitychange", () => {
  if (scene1Screen.hidden) return;

  scene1Animations.forEach((animation) => {
    try {
      if (document.hidden) {
        animation.pause();
      } else if (animation.playState === "paused") {
        animation.play();
      }
    } catch {}
  });
});

/* -------------------------------------------------------
   입력 검증 / 저장
------------------------------------------------------- */
function normalizeSingleLine(value) {
  return value.replace(/[\r\n]+/g, " ").trim();
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

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!db) {
    formMessage.textContent = "Firebase 연결을 확인해주세요.";
    return;
  }

  if (isCompletedBrowser()) {
    showCompletedPanel("이미 참여가 완료된 브라우저입니다.");
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

    await update(ref(db), {
      [`responses/${responseId}`]: {
        nickname: validation.nickname,
        question: validation.question,
        createdAt: timestamp,
        winner: false
      },
      [`publicResponses/${responseId}`]: {
        question: validation.question,
        createdAt: timestamp,
        winner: false
      }
    });

    saveLocalCompletion({
      responseId,
      nickname: validation.nickname,
      question: validation.question,
      submittedAtLocal: Date.now()
    });

    formMessage.textContent = "";
    showCompletedPanel("제출이 완료되었습니다.");
  } catch (error) {
    console.error("응답 저장 실패:", error);
    formMessage.textContent =
      "저장에 실패했습니다. 입력 내용은 유지됩니다. 다시 제출해주세요.";
    submitButton.disabled = false;
  }
});

/* -------------------------------------------------------
   이벤트
------------------------------------------------------- */
enterButton.addEventListener("click", async () => {
  enterButton.classList.add("is-loading");
  enterButton.disabled = true;
  loadStatus.textContent = scene1Ready ? "우주로 이동합니다…" : "장면을 불러오는 중입니다…";
  sceneLoading.hidden = false;

  if (!scene1Ready) {
    await preloadScene1(true);
  }

  sceneLoading.hidden = true;
  enterButton.classList.remove("is-loading");
  enterButton.disabled = false;

  await playScene1();
});

replayButton.addEventListener("click", () => {
  renderStartScreen();
});

/* -------------------------------------------------------
   초기화
------------------------------------------------------- */
initializeFirebase();
renderStartScreen();
preloadScene1();
