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

const SCENE1_DURATION = 12000;
const SCENE1_ASSETS = [
  "./assets/scene01-space/star-chart-bg.png",
  "./assets/scene01-space/globe.png",
  "./assets/scene01-space/telescope-observer.png",
  "./assets/scene01-space/rocket-idle.png",
  "./assets/scene01-space/rocket-launch.png",
  "./assets/scene01-space/propulsion-beam.png",
  "./assets/scene01-space/cloud-left.png",
  "./assets/scene01-space/cloud-right.png",
  "./assets/scene01-space/cloud-small.png",
  "./assets/scene01-space/lady-on-star.png",
  "./assets/scene01-space/deity-figure.png",
  "./assets/scene01-space/moth.png",
  "./assets/scene01-space/moon.png",
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
const propulsionBeam = document.querySelector("#propulsionBeam");
const cloudLeft = document.querySelector("#cloudLeft");
const cloudRight = document.querySelector("#cloudRight");
const cloudSmall = document.querySelector("#cloudSmall");
const decorativeElements = [
  document.querySelector("#mothTop"),
  document.querySelector("#ladyOnStar"),
  document.querySelector("#deityFigure"),
  document.querySelector("#moon"),
  document.querySelector("#saturn"),
  document.querySelector("#mothLower")
];

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
let sceneClock = null;
let sceneRunId = 0;

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

function preloadScene1() {
  if (scene1LoadingPromise) {
    return scene1LoadingPromise;
  }

  scene1LoadingPromise = Promise.all(SCENE1_ASSETS.map(preloadImage))
    .then((results) => {
      const failed = results.filter((item) => !item.ok);

      if (failed.length) {
        console.warn("Scene 1 일부 에셋 로딩 실패:", failed);
      }

      // 핵심 배경/지구본/로켓이 준비된 경우 재생 가능 처리.
      const critical = new Set([
        "./assets/scene01-space/star-chart-bg.png",
        "./assets/scene01-space/globe.png",
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
   Web Animations API 헬퍼
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
  sceneRunId += 1;

  scene1Animations.forEach((animation) => {
    try {
      animation.cancel();
    } catch {}
  });

  scene1Animations = [];
  sceneClock = null;
}

function resetScene1Elements() {
  // WAAPI가 남긴 효과는 cancelScene1에서 제거됨.
  // 인라인 스타일은 최소한으로 초기화.
  sceneCamera.style.transform = "";
  backgroundDrift.style.transform = "";
  globe.style.opacity = "";
  observer.style.opacity = "";
  rocketGroup.style.opacity = "";
  rocketIdle.style.opacity = "";
  rocketLaunch.style.opacity = "";
  propulsionBeam.style.opacity = "";

  [cloudLeft, cloudRight, cloudSmall, ...decorativeElements].forEach((el) => {
    el.style.opacity = "";
  });
}

/* -------------------------------------------------------
   Scene 1 타임라인
   총 12초
   ① 지구본 등장
   ② 카메라 하단 이동·확대
   ③ 관측자 기립
   ④ 우주선 등장·점화
   ⑤ 구름 확산
   ⑥ 줌아웃 + 전체 콜라주
   ⑦ 우주선 곡선 이동 + 카메라 추적
   ⑧ 중앙 복귀
   ⑨ Scene 2 전환용 기준 상태
------------------------------------------------------- */
async function playScene1() {
  const thisRun = ++sceneRunId;
  cancelScene1();
  // cancelScene1이 runId를 올리므로 현재 실행 ID를 다시 확보
  const runId = ++sceneRunId;

  resetScene1Elements();
  showOnly("scene1");

  if (!scene1Ready) {
    sceneLoading.hidden = false;
    enterButton.classList.add("is-loading");
    enterButton.disabled = true;

    // 실패한 적이 있더라도 다시 새로 시도할 수 있게 promise 초기화.
    scene1LoadingPromise = null;
    const ready = await preloadScene1();

    sceneLoading.hidden = true;
    enterButton.classList.remove("is-loading");
    enterButton.disabled = false;

    if (!ready) {
      // 핵심 에셋이 없으면 빈 화면에서 멈추지 않고 Scene 14로 이동.
      console.error("Scene 1 핵심 에셋을 불러오지 못했습니다.");
      renderScene14();
      return;
    }
  }

  if (runId !== sceneRunId) {
    return;
  }

  /* 배경 부유 — 카메라와 독립 */
  createAnimation(
    backgroundDrift,
    [
      { transform: "translate3d(-1.2%, 0.7%, 0) scale(1.035)", offset: 0 },
      { transform: "translate3d(1.1%, -0.5%, 0) scale(1.055)", offset: 0.36 },
      { transform: "translate3d(-0.4%, -1.1%, 0) scale(1.045)", offset: 0.72 },
      { transform: "translate3d(0.5%, -1.8%, 0) scale(1.06)", offset: 1 }
    ],
    {
      duration: SCENE1_DURATION,
      easing: "ease-in-out"
    }
  );

  /* 카메라 */
  createAnimation(
    sceneCamera,
    [
      { transform: "translate3d(0, 0, 0) scale(1)", offset: 0 },
      // globe 이후 하단으로 이동·확대
      { transform: "translate3d(0, -10%, 0) scale(1.28)", offset: 0.17 },
      { transform: "translate3d(0, -10%, 0) scale(1.28)", offset: 0.39 },
      // 전체 콜라주 공개
      { transform: "translate3d(0, 1.5%, 0) scale(0.86)", offset: 0.56 },
      // 로켓을 느슨하게 따라감
      { transform: "translate3d(-3%, 6%, 0) scale(0.96)", offset: 0.69 },
      { transform: "translate3d(4%, 10%, 0) scale(1.03)", offset: 0.81 },
      // 중앙 복귀
      { transform: "translate3d(0, 0, 0) scale(1)", offset: 0.94 },
      // Scene 2 match-cut 준비용 anchor position
      { transform: "translate3d(0, -2%, 0) scale(1.025)", offset: 1 }
    ],
    {
      duration: SCENE1_DURATION,
      easing: "cubic-bezier(0.45, 0.05, 0.18, 1)"
    }
  );

  /* 지구본 */
  createAnimation(
    globe,
    [
      { opacity: 0, transform: "translate3d(0, 33%, 0) scale(0.94)", offset: 0 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 0.09 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 1 }
    ],
    { duration: SCENE1_DURATION, easing: "cubic-bezier(.2,.8,.25,1)" }
  );

  /* 관측자 */
  createAnimation(
    observer,
    [
      { opacity: 0, transform: "translate3d(0, 28%, 0) scale(0.94)", offset: 0 },
      { opacity: 0, transform: "translate3d(0, 28%, 0) scale(0.94)", offset: 0.17 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 0.25 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 1 }
    ],
    { duration: SCENE1_DURATION, easing: "cubic-bezier(.16,.82,.28,1)" }
  );

  /* 로켓 그룹: 등장 → 점화 후 곡선 비행 */
  createAnimation(
    rocketGroup,
    [
      { opacity: 0, transform: "translate3d(0, 28%, 0) rotate(4deg) scale(.82)", offset: 0 },
      { opacity: 0, transform: "translate3d(0, 28%, 0) rotate(4deg) scale(.82)", offset: 0.245 },
      { opacity: 1, transform: "translate3d(0, 0, 0) rotate(1deg) scale(1)", offset: 0.32 },
      { opacity: 1, transform: "translate3d(0, 0, 0) rotate(1deg) scale(1)", offset: 0.53 },
      // 우상향
      { opacity: 1, transform: "translate3d(85%, -95%, 0) rotate(18deg) scale(.98)", offset: 0.62 },
      { opacity: 1, transform: "translate3d(115%, -220%, 0) rotate(8deg) scale(.94)", offset: 0.70 },
      // 곡선 상단 회전
      { opacity: 1, transform: "translate3d(55%, -340%, 0) rotate(-28deg) scale(.88)", offset: 0.77 },
      { opacity: 1, transform: "translate3d(-130%, -405%, 0) rotate(-52deg) scale(.80)", offset: 0.85 },
      // 좌측으로 비행하며 퇴장
      { opacity: 1, transform: "translate3d(-365%, -380%, 0) rotate(-68deg) scale(.70)", offset: 0.93 },
      { opacity: 0, transform: "translate3d(-500%, -350%, 0) rotate(-74deg) scale(.64)", offset: 1 }
    ],
    {
      duration: SCENE1_DURATION,
      easing: "cubic-bezier(.45,.02,.28,1)"
    }
  );

  /* 우주선 idle → launch 이미지 전환 */
  createAnimation(
    rocketIdle,
    [
      { opacity: 1, offset: 0 },
      { opacity: 1, offset: 0.34 },
      { opacity: 0, offset: 0.37 },
      { opacity: 0, offset: 1 }
    ],
    { duration: SCENE1_DURATION, easing: "linear" }
  );

  createAnimation(
    rocketLaunch,
    [
      { opacity: 0, offset: 0 },
      { opacity: 0, offset: 0.345 },
      { opacity: 1, offset: 0.37 },
      { opacity: 1, offset: 1 }
    ],
    { duration: SCENE1_DURATION, easing: "linear" }
  );

  createAnimation(
    propulsionBeam,
    [
      { opacity: 0, transform: "scaleY(.65)", offset: 0 },
      { opacity: 0, transform: "scaleY(.65)", offset: 0.345 },
      { opacity: 0.8, transform: "scaleY(.92)", offset: 0.37 },
      { opacity: 1, transform: "scaleY(1.08)", offset: 0.43 },
      { opacity: 0.72, transform: "scaleY(.93)", offset: 0.49 },
      { opacity: 0.92, transform: "scaleY(1.03)", offset: 0.58 },
      { opacity: 0.82, transform: "scaleY(.97)", offset: 0.88 },
      { opacity: 0, transform: "scaleY(.8)", offset: 1 }
    ],
    { duration: SCENE1_DURATION, easing: "ease-in-out" }
  );

  /* 발사 구름 */
  createAnimation(
    cloudLeft,
    [
      { opacity: 0, transform: "translate3d(20%, 18%, 0) scale(.7)", offset: 0 },
      { opacity: 0, transform: "translate3d(20%, 18%, 0) scale(.7)", offset: 0.35 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 0.45 },
      { opacity: 1, transform: "translate3d(-5%, 1%, 0) scale(1.05)", offset: 0.58 },
      { opacity: 1, transform: "translate3d(-7%, 2%, 0) scale(1.07)", offset: 1 }
    ],
    { duration: SCENE1_DURATION, easing: "cubic-bezier(.16,.74,.3,1)" }
  );

  createAnimation(
    cloudRight,
    [
      { opacity: 0, transform: "translate3d(-18%, 16%, 0) scale(.7)", offset: 0 },
      { opacity: 0, transform: "translate3d(-18%, 16%, 0) scale(.7)", offset: 0.35 },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 0.45 },
      { opacity: 1, transform: "translate3d(5%, 0, 0) scale(1.05)", offset: 0.58 },
      { opacity: 1, transform: "translate3d(7%, 1%, 0) scale(1.07)", offset: 1 }
    ],
    { duration: SCENE1_DURATION, easing: "cubic-bezier(.16,.74,.3,1)" }
  );

  createAnimation(
    cloudSmall,
    [
      { opacity: 0, transform: "translate3d(0, 16%, 0) scale(.65)", offset: 0 },
      { opacity: 0, transform: "translate3d(0, 16%, 0) scale(.65)", offset: 0.36 },
      { opacity: 0.95, transform: "translate3d(0, 0, 0) scale(1)", offset: 0.46 },
      { opacity: 0.85, transform: "translate3d(-6%, -1%, 0) scale(1.03)", offset: 1 }
    ],
    { duration: SCENE1_DURATION, easing: "ease-out" }
  );

  /* 전체 콜라주 장식 오브젝트 */
  decorativeElements.forEach((element, index) => {
    const dx = index % 2 === 0 ? "-4%" : "4%";
    const dy = index % 3 === 0 ? "-3%" : "3%";

    createAnimation(
      element,
      [
        { opacity: 0, transform: `translate3d(${dx}, ${dy}, 0) scale(.92)`, offset: 0 },
        { opacity: 0, transform: `translate3d(${dx}, ${dy}, 0) scale(.92)`, offset: 0.43 },
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 0.56 + index * 0.008 },
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", offset: 1 }
      ],
      { duration: SCENE1_DURATION, easing: "ease-out" }
    );
  });

  /* Scene Clock: visibilitychange 시 다른 애니메이션과 함께 pause/resume 된다. */
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

  if (runId !== sceneRunId) {
    return;
  }

  // Stage 3에서는 Scene 2가 아직 없으므로 Scene 14로 임시 연결.
  // Scene 2 구현 시 이 한 줄을 Scene 2 진입 함수로 교체한다.
  renderScene14();
}

/* -------------------------------------------------------
   앱 백그라운드 처리
------------------------------------------------------- */
document.addEventListener("visibilitychange", () => {
  if (scene1Screen.hidden) {
    return;
  }

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

  if (!scene1Ready) {
    scene1LoadingPromise = null;
    await preloadScene1();
  }

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
