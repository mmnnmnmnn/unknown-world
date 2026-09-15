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
      { transform: "translate3d(-0.9%, 0.7%, 0) scale(1.035)", offset: 0 },
      { transform: "translate3d(0.7%, -0.2%, 0) scale(1.05)", offset: 0.34 },
      { transform: "translate3d(-0.5%, -0.8%, 0) scale(1.045)", offset: 0.72 },
      { transform: "translate3d(0.5%, -1.4%, 0) scale(1.058)", offset: 1 }
    ],
    { duration: SCENE1_DURATION, easing: "ease-in-out" }
  );

  /* 카메라:
     1) 관측자 쪽 확실히 보기
     2) 오른쪽으로 이동하며 기본 우주선 보기
     3) 이후 줌아웃
  */
  createAnimation(
    sceneCamera,
    [
      { transform: "translate3d(0, 0, 0) scale(1)", offset: 0 },
      { transform: "translate3d(18%, -22%, 0) scale(2.45)", offset: 0.16 },
      { transform: "translate3d(18%, -22%, 0) scale(2.45)", offset: 0.32 },
      { transform: "translate3d(-16%, -21%, 0) scale(2.45)", offset: 0.43 },
      { transform: "translate3d(-16%, -21%, 0) scale(2.45)", offset: 0.53 },
      { transform: "translate3d(-5%, -8%, 0) scale(1.55)", offset: 0.63 },
      { transform: "translate3d(0, 0.5%, 0) scale(0.92)", offset: 0.73 },
      { transform: "translate3d(4%, -1%, 0) scale(1.00)", offset: 0.84 },
      { transform: "translate3d(0, 0, 0) scale(1)", offset: 0.94 },
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
      { opacity: 0, transform: "translate3d(0, 30%, 0) scale(0.94)", offset: 0 },
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
      { opacity: 0, transform: "perspective(1200px) rotateX(87deg) translate3d(0, 16%, 0) scale(0.74)", offset: 0 },
      { opacity: 0, transform: "perspective(1200px) rotateX(87deg) translate3d(0, 16%, 0) scale(0.74)", offset: 0.14 },
      { opacity: 1, transform: "perspective(1200px) rotateX(70deg) translate3d(0, 10%, 0) scale(0.82)", offset: 0.19 },
      { opacity: 1, transform: "perspective(1200px) rotateX(30deg) translate3d(0, 5%, 0) scale(0.94)", offset: 0.25 },
      { opacity: 1, transform: "perspective(1200px) rotateX(0deg) translate3d(0, 0, 0) scale(1)", offset: 0.30 },
      { opacity: 1, transform: "perspective(1200px) rotateX(0deg) translate3d(0, 0, 0) scale(1)", offset: 1 }
    ],
    {
      duration: SCENE1_DURATION,
      easing: "cubic-bezier(.16,.85,.24,1)"
    }
  );

  /* 기본 우주선: 나타난 후 launch 전까지 정지 */
  createAnimation(
    rocketGroup,
    [
      { opacity: 0, transform: "translate3d(0, 26%, 0) scale(0.66) rotate(4deg)", offset: 0 },
      { opacity: 0, transform: "translate3d(0, 26%, 0) scale(0.66) rotate(4deg)", offset: 0.27 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)", offset: 0.35 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)", offset: 0.46 },

      /* launch 후 약 2초 정도는 천천히 이동 */
      { opacity: 1, transform: "translate3d(-8%, -8%, 0) scale(1) rotate(-5deg)", offset: 0.52 },
      { opacity: 1, transform: "translate3d(-20%, -24%, 0) scale(1) rotate(-11deg)", offset: 0.58 },
      { opacity: 1, transform: "translate3d(-42%, -54%, 0) scale(1) rotate(-22deg)", offset: 0.66 },

      /* 파란 화살표 지점 이후 가속 */
      { opacity: 1, transform: "translate3d(-110%, -92%, 0) scale(1) rotate(-34deg)", offset: 0.74 },
      { opacity: 1, transform: "translate3d(-250%, -140%, 0) scale(1) rotate(-46deg)", offset: 0.82 },
      { opacity: 1, transform: "translate3d(-430%, -188%, 0) scale(1) rotate(-56deg)", offset: 0.90 },
      { opacity: 1, transform: "translate3d(-650%, -220%, 0) scale(1) rotate(-64deg)", offset: 1 }
    ],
    {
      duration: SCENE1_DURATION,
      easing: "cubic-bezier(.4,.03,.28,1)"
    }
  );

  /* 기본 우주선 → 점화 우주선: 순간 전환 */
  createAnimation(
    rocketIdle,
    [
      { opacity: 1, offset: 0 },
      { opacity: 1, offset: 0.459 },
      { opacity: 0, offset: 0.460 },
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
      { opacity: 0, offset: 0.459 },
      { opacity: 1, offset: 0.460 },
      { opacity: 1, offset: 1 }
    ],
    {
      duration: SCENE1_DURATION,
      easing: "linear"
    }
  );

  /* 구름은 launch 전까지 절대 나타나지 않음 */
  createAnimation(
    cloudLeft,
    [
      { opacity: 0, transform: "translate3d(22%, 9%, 0) scale(0.34)", offset: 0 },
      { opacity: 0, transform: "translate3d(22%, 9%, 0) scale(0.34)", offset: 0.470 },
      { opacity: 0.96, transform: "translate3d(10%, 3%, 0) scale(0.60)", offset: 0.515 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(0.84)", offset: 0.60 },
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
      { opacity: 0, transform: "translate3d(-22%, 10%, 0) scale(0.34)", offset: 0 },
      { opacity: 0, transform: "translate3d(-22%, 10%, 0) scale(0.34)", offset: 0.470 },
      { opacity: 0.94, transform: "translate3d(-8%, 3%, 0) scale(0.60)", offset: 0.515 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(0.84)", offset: 0.60 },
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
      { opacity: 0, transform: "translate3d(10%, 10%, 0) scale(0.30)", offset: 0 },
      { opacity: 0, transform: "translate3d(10%, 10%, 0) scale(0.30)", offset: 0.478 },
      { opacity: 0.90, transform: "translate3d(0, 0, 0) scale(0.56)", offset: 0.525 },
      { opacity: 0.88, transform: "translate3d(-20%, 0, 0) scale(0.68)", offset: 0.61 },
      { opacity: 0.82, transform: "translate3d(-62%, 2%, 0) scale(0.92)", offset: 0.78 },
      { opacity: 0.72, transform: "translate3d(-96%, 4%, 0) scale(1.02)", offset: 1 }
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
      { opacity: 0, transform: `translate3d(${dx}, ${dy}, 0) scale(0.92)`, offset: 0.56 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 0.71 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 1 }
    ];

    if (element === ladyOnStar) {
      revealFrames = [
        { opacity: 0, transform: "translate3d(-4%, 2%, 0) scale(0.92)", offset: 0 },
        { opacity: 0, transform: "translate3d(-4%, 2%, 0) scale(0.92)", offset: 0.56 },
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 0.71 },
        { opacity: 1, transform: "translate3d(0, -1.3%, 0) scale(1)", offset: 0.82 },
        { opacity: 1, transform: "translate3d(0, 0.8%, 0) scale(1)", offset: 0.92 },
        { opacity: 1, transform: "translate3d(0, -0.6%, 0) scale(1)", offset: 1 }
      ];
    }

    if (element === deityFigure) {
      revealFrames = [
        { opacity: 0, transform: "translate3d(4%, 2%, 0) scale(0.92)", offset: 0 },
        { opacity: 0, transform: "translate3d(4%, 2%, 0) scale(0.92)", offset: 0.56 },
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 0.715 },
        { opacity: 1, transform: "translate3d(0, 1.0%, 0) scale(1)", offset: 0.83 },
        { opacity: 1, transform: "translate3d(0, -0.7%, 0) scale(1)", offset: 0.93 },
        { opacity: 1, transform: "translate3d(0, 0.5%, 0) scale(1)", offset: 1 }
      ];
    }

    createAnimation(element, revealFrames, {
      duration: SCENE1_DURATION,
      easing: "ease-out"
    });
  });

  scene1Clock = createAnimation(
    scene1Screen,
    [{ opacity: 1 }, { opacity: 1 }],
    { duration: SCENE1_DURATION, easing: "linear" }
  );

  try {
    await scene1Clock.finished;
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
