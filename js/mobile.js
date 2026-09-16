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
   Runtime diagnostic
------------------------------------------------------- */
window.addEventListener("error", (event) => {
  console.error("Scene runtime error:", event.error || event.message);
  const status = document.querySelector("#loadStatus");
  const button = document.querySelector("#enterButton");
  if (status && !document.querySelector("#startScreen")?.hidden) {
    status.textContent = "장면 실행 오류가 발생했습니다. 페이지를 새로고침해주세요.";
  }
  if (button) {
    button.disabled = false;
    button.classList.remove("is-loading");
  }
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  const status = document.querySelector("#loadStatus");
  const button = document.querySelector("#enterButton");
  if (status && !document.querySelector("#startScreen")?.hidden) {
    status.textContent = "장면 실행 오류가 발생했습니다. 페이지를 새로고침해주세요.";
  }
  if (button) {
    button.disabled = false;
    button.classList.remove("is-loading");
  }
});

const STORAGE_KEY = "unknown-world-submission-complete";
const LAST_RESPONSE_KEY = "unknown-world-last-response";

const SCENE23_ASSETS = [
  "./assets/scene03-galaxy-cluster/galaxy-cluster-bg.png"
];

const SCENE4_ASSETS = [
  "./assets/scene04-deepsea/deepsea-bg.png",
  "./assets/scene04-deepsea/fish-school.png",
  "./assets/scene04-deepsea/giant-squid.png",
  "./assets/shared/whale.png"
];

const SCENE5_VIDEO_SRC = "./assets/scene05-future/future-timelapse.mp4";
const SCENE5_FALLBACK_SRC = "./assets/scene05-future/future-fallback.jpg";

const SCENE6_ASSETS = [
  "./assets/scene06-14/bg-teal.png",
  "./assets/scene06-14/future-animal.png",
  "./assets/scene06-14/alien.png",
  "./assets/scene06-14/jesus.png",
  "./assets/scene01-space/planet-jupiter.png",
  "./assets/scene01-space/planet-green.png",
  "./assets/shared/whale.png"
];

const SCENE1_ASSETS = [
  "./assets/scene01-space/star-chart-bg.png",
  "./assets/scene01-space/globe-full-v4.png",
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

/*
  좌표계 = Scene 시작 시의 9:16 모바일 화면
  (0,0) 좌상단 / (100,100) 우하단
*/
const WORLD_LAYOUT = {
  globe:       { x: 50.0, y: 136.0, width: 200.0 },
  observer:    { x: 28.0, y: 86.0, width: 26.0 },

  rocketIdle:   { x: 75.0, y: 73.0, width: 21.0 },
  rocketLaunch: { x: 70.0, y: 77.0, width: 21.0 },

  cloudLeft:   { x: 60.0, y: 86.5, width: 50.0 },
  cloudRight:  { x: 84.0, y: 86.0, width: 46.0 },
  cloudSmall:  { x: 69.0, y: 83.5, width: 23.0 },

  ladyOnStar:  { x: 29.0, y: 18.0, width: 39.0 },
  deityFigure: { x: 79.0, y: 16.0, width: 33.0 },
  mothTop:     { x: 7.5,  y: 19.0, width: 13.0 },
  jupiter:     { x: 54.5, y: 37.0, width: 17.0 },
  planetGreen: { x: 80.0, y: 43.0, width: 24.0 },
  saturn:      { x: 25.0, y: 54.0, width: 41.0 },
  mothLower:   { x: 88.0, y: 50.0, width: 11.0 }
};

const ELEMENT_TIMELINE = {
  globe: { appear: 800, settle: 1800 },
  observer: { appear: 2800, upright: 5000 },
  rocket: {
    appear: 7300,
    appearEnd: 7650,
    ignite: 8900,      // 기본 우주선 숨김 + 점화 우주선 표시
    moveStart: 9900,   // 점화 후 1초 정지
    accelerate: 11900,
    farPoint: 13850
  },
  clouds: {
    sideStart: 9300,
    sideEnd: 11400,
    smallStart: 9500,
    smallEnd: 12000
  },
  upperObjects: {
    create: 9500,
    ready: 10200
  }
};

const CAMERA_KEYS = [
  { time: 0,     x: 50, y: 50, zoom: 1.00, ease: "smooth" },
  { time: 2400,  x: 30, y: 75, zoom: 1.00, ease: "smooth" },
  { time: 3680,  x: 30, y: 75, zoom: 2.35, ease: "smooth" },
  { time: 6130,  x: 30, y: 75, zoom: 2.35, ease: "hold" },
  { time: 7930,  x: 73, y: 75, zoom: 2.35, ease: "smooth" },
  { time: 10530, x: 73, y: 75, zoom: 2.35, ease: "hold" },
  { time: 13680, x: 50, y: 50, zoom: 1.00, ease: "smooth" },
  { time: 16850, x: 50, y: 50, zoom: 1.00, ease: "hold" }
];

const ROCKET_PATH_POINTS = [
  // 점화 후 1초 정지한 뒤, 하나의 연속 곡선으로 이동
  { x: 70.0, y: 77.0 },
  { x: 71.0, y: 71.0 },
  { x: 70.0, y: 63.0 },
  { x: 66.0, y: 54.0 },
  { x: 58.0, y: 44.0 },
  { x: 48.0, y: 34.0 },
  { x: 38.0, y: 25.0 },
  { x: 28.0, y: 17.0 },

  // 최종 좌표
  { x: 20.0, y: 10.0 }
];

const SCENE1_END = 16850;


/* =======================================================
   Scene 1 → Scene 3 직접 전환 (v16)
   -------------------------------------------------------
   ※ 기존 Scene 번호는 유지한다.
      Scene 2와 중간 은하 장면만 재생에서 제거하고,
      기존 Scene 3은 계속 "Scene 3"으로 부른다.

   0.00~0.95s : Scene 1의 (25,30) 부근으로 빠르게 Zoom In
   0.72~1.02s : 확대 상태를 유지하며 Scene 3 은하단으로 blur/crossfade
   1.02~2.20s : Scene 3에서 빠르게 Zoom Out + 중앙 이동
   2.20~3.20s : 전체 화면 상태 1초 유지
   3.20~3.85s : "보이지 않는 우주," blur → sharp
   3.85~7.25s : 문구 완전 표시 3.4초
======================================================= */

const SCENE23_TIMELINE = {
  scene1ZoomEnd: 950,

  clusterFadeStart: 720,
  clusterFadeEnd: 1020,

  clusterZoomOutStart: 1020,
  clusterZoomOutEnd: 2200,

  fullFrameHoldEnd: 3200,

  scene3TitleStart: 3200,
  scene3TitleReady: 3850,

  preScene4HoldEnd: 7250
};

const SCENE1_GALAXY_TARGET = {
  // 요청 좌표: 여인 아래 은하수 부근
  x: 25.0,
  y: 30.0,
  zoom: 5.2
};

const CLUSTER_TARGET = {
  // 기존 Scene 3 저해상도 은하단 이미지의 타깃 은하 좌표
  x: 64.03,
  y: 31.92,
  zoom: 14
};

const SCENE23_END = SCENE23_TIMELINE.preScene4HoldEnd;


/* =======================================================
   Scene 4 — 닿을 수 없는 심해 (v16)
   -------------------------------------------------------
   0.0~1.4s    : Scene 3 → Scene 4 암흑 통로
   1.4~7.2s    : 심해 상단 → 바닥 하강
   2.2~5.3s    : 물고기 떼 A 좌 → 우하단
   3.9~7.0s    : 물고기 떼 B 우 → 좌하단
   7.20s       : 바닥 도달과 동시에 고래 등장 시작
   10.645s     : 카메라 다시 상승
   10.84s      : 대왕오징어 등장 시작
   14.805~16.495s: 오징어 좌우 반전 후 우상단 퇴장
   17.015~17.715s: "닿을 수 없는 심해," blur → sharp
   17.715~21.115s: 문구 유지 3.4초
======================================================= */

const SCENE4_TIMELINE = {
  transitionEnd: 1400,

  descendStart: 1400,
  descendEnd: 7200,

  fishAStart: 2200,
  fishASlowEnd: 4200,
  fishAEnd: 5300,

  fishBStart: 3900,
  fishBSlowEnd: 5900,
  fishBEnd: 7000,

  // 바닥 도달 즉시 고래 등장
  whaleStart: 7200,
  whaleEnd: 21115,

  // 이후 흐름도 기존 대비 150ms 앞당김
  ascendStart: 10645,
  ascendEnd: 16495,

  squidStart: 10840,
  squidApproachEnd: 14805,
  squidExitEnd: 16495,

  titleStart: 17015,
  titleReady: 17715,

  preScene5HoldEnd: 21115
};

const SCENE4_END = SCENE4_TIMELINE.preScene5HoldEnd;


/* =======================================================
   Scene 5 — 아직 오지 않은 미래
   -------------------------------------------------------
   0.0~2.2s : Scene 4 → Scene 5 우측 슬라이드 + blur 전환
              (이 구간은 fallback 정지 이미지로 전환)
   2.2s     : Scene 5 전환 완료 → 타임랩스 재생 시작
   2.2~8.2s : 타임랩스 총 2회 재생
              (2회 재생이 8.2초에 정확히 끝나도록 약 1.014배 재생)
   4.0~4.8s : "아직 오지 않은 미래." blur → sharp
   4.8~8.2s : 문구 완전 표시 3.4초
======================================================= */
const SCENE5_TIMELINE = {
  transitionEnd: 2200,
  videoStart: 2200,
  titleStart: 4000,
  titleReady: 4800,
  end: 8200
};

const SCENE5_END = SCENE5_TIMELINE.end;

/* =======================================================
   Scene 6~13 — 질문 시퀀스
   모든 일반 텍스트/이미지: 아래에서 위로 등장 → 위로 퇴장 + blur
   Scene 7만 실제 타이핑 효과 사용
======================================================= */
const SCENE6_TIMELINE = {
  transitionEnd: 1400,

  // v17: 긴 Scene 6 문장 완전 표시 시간을 추가로 0.5초 연장.
  scene6InStart: 1400, scene6InEnd: 2000, scene6OutStart: 5300, scene6OutEnd: 5900,

  // Scene 7 이후 전체 흐름도 0.5초씩 뒤로 이동해 각 장면 길이는 유지.
  scene7Start: 5900,
  scene7Line1Start: 6200, scene7Line1End: 7200,
  scene7PauseEnd: 7800,
  scene7Line2Start: 7800, scene7Line2End: 9300,
  scene7OutStart: 10200, scene7OutEnd: 10800,

  scene8InStart: 10800, scene8InEnd: 11400, scene8OutStart: 13400, scene8OutEnd: 14000,
  scene9InStart: 14000, scene9InEnd: 14600, scene9OutStart: 16600, scene9OutEnd: 17200,
  scene10InStart: 17200, scene10InEnd: 17800, scene10OutStart: 19800, scene10OutEnd: 20400,
  scene11InStart: 20400, scene11InEnd: 21000, scene11OutStart: 22600, scene11OutEnd: 23200,
  scene12InStart: 23200, scene12InEnd: 23800, scene12OutStart: 25400, scene12OutEnd: 26000,

  scene13Q1Start: 26000, scene13Q1End: 26500,
  scene13Q2Start: 26800, scene13Q2End: 27300,
  scene13Q3Start: 27600, scene13Q3End: 28100,
  scene13OutStart: 30000, scene13OutEnd: 30600,

  end: 30600
};

const SCENE6_END = SCENE6_TIMELINE.end;

const SCENE14_INTRO = {
  kickerInStart: 0,
  kickerInEnd: 600,
  typingStart: 800,
  typingEnd: 2000,
  cursorHoldEnd: 2700,
  formReady: 3000
};

// deepsea-bg.png 원본 비율: 793 × 1983
const DEEPSEA_BG_ASPECT = 1983 / 793;
const SCENE4_ASCEND_FINAL_PROGRESS = 0.48;



/* -------------------------------------------------------
   DOM
------------------------------------------------------- */
const startScreen = document.querySelector("#startScreen");
const scene1Screen = document.querySelector("#scene1Screen");
const scene23Screen = document.querySelector("#scene23Screen");
const scene4Screen = document.querySelector("#scene4Screen");
const scene5Screen = document.querySelector("#scene5Screen");
const scene6Screen = document.querySelector("#scene6Screen");
const scene14Screen = document.querySelector("#scene14Screen");

const scene23Viewport = document.querySelector("#scene23Viewport");
const clusterLayer = document.querySelector("#clusterLayer");
const scene3EndTitle = document.querySelector("#scene3EndTitle");

const scene4Viewport = document.querySelector("#scene4Viewport");
const scene4Camera = document.querySelector("#scene4Camera");
const deepseaBg = document.querySelector("#deepseaBg");
const fishSchoolA = document.querySelector("#fishSchoolA");
const fishSchoolB = document.querySelector("#fishSchoolB");
const scene4Whale = document.querySelector("#scene4Whale");
const scene4Squid = document.querySelector("#scene4Squid");
const scene4Corridor = document.querySelector("#scene4Corridor");
const scene4Title = document.querySelector("#scene4Title");

const scene5Viewport = document.querySelector("#scene5Viewport");
const futureTimelapse = document.querySelector("#futureTimelapse");
const futureFallback = document.querySelector("#futureFallback");
const scene5TransitionVeil = document.querySelector("#scene5TransitionVeil");
const scene5Title = document.querySelector("#scene5Title");

const scene6Viewport = document.querySelector("#scene6Viewport");
const scene6Bg = document.querySelector(".scene6-bg");
const scene6Corridor = document.querySelector("#scene6Corridor");
const seqScene6 = document.querySelector("#seqScene6");
const seqScene7 = document.querySelector("#seqScene7");
const seqScene8 = document.querySelector("#seqScene8");
const seqScene9 = document.querySelector("#seqScene9");
const seqScene10 = document.querySelector("#seqScene10");
const scene10Jesus = document.querySelector(".scene10-jesus");
const scene10Alien = document.querySelector(".scene10-alien");
const scene10CaptionLeft = document.querySelector("#scene10CaptionLeft");
const scene10CaptionRight = document.querySelector("#scene10CaptionRight");
const seqScene11 = document.querySelector("#seqScene11");
const seqScene12 = document.querySelector("#seqScene12");
const seqScene13 = document.querySelector("#seqScene13");
const scene7Line1 = document.querySelector("#scene7Line1");
const scene7Line2 = document.querySelector("#scene7Line2");
const scene7Cursor1 = document.querySelector("#scene7Cursor1");
const scene7Cursor2 = document.querySelector("#scene7Cursor2");
const scene13Q1 = document.querySelector("#scene13Q1");
const scene13Q2 = document.querySelector("#scene13Q2");
const scene13Q3 = document.querySelector("#scene13Q3");

const scene14Intro = document.querySelector("#scene14Intro");
const scene14Kicker = document.querySelector("#scene14Kicker");
const scene14TypedText = document.querySelector("#scene14TypedText");
const scene14Cursor = document.querySelector("#scene14Cursor");
const questionStage = document.querySelector("#questionStage");

const enterButton = document.querySelector("#enterButton");
const loadStatus = document.querySelector("#loadStatus");
const revisitNotice = document.querySelector("#revisitNotice");
const sceneLoading = document.querySelector("#sceneLoading");

const sceneViewport = document.querySelector("#sceneViewport");
const sceneCamera = document.querySelector("#sceneCamera");

const globe = document.querySelector("#globe");
const observer = document.querySelector("#observer");
const rocketIdle = document.querySelector("#rocketIdle");
const rocketLaunch = document.querySelector("#rocketLaunch");
const cloudLeft = document.querySelector("#cloudLeft");
const cloudRight = document.querySelector("#cloudRight");
const cloudSmall = document.querySelector("#cloudSmall");
const mothTop = document.querySelector("#mothTop");
const ladyOnStar = document.querySelector("#ladyOnStar");
const deityFigure = document.querySelector("#deityFigure");
const jupiter = document.querySelector("#jupiter");
const planetGreen = document.querySelector("#planetGreen");
const saturn = document.querySelector("#saturn");
const mothLower = document.querySelector("#mothLower");

const decorativeElements = [
  mothTop, ladyOnStar, deityFigure, jupiter, planetGreen, saturn, mothLower
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
let sceneRafId = 0;
let sceneStartTime = 0;
let sceneRunning = false;
let activeSceneToken = 0;

let scene23Ready = false;
let scene23LoadingPromise = null;
let scene23RafId = 0;
let scene23Running = false;
let scene23StartTime = 0;

let scene4Ready = false;
let scene4LoadingPromise = null;
let scene4RafId = 0;
let scene4Running = false;
let scene4StartTime = 0;

let scene5Ready = false;
let scene5LoadingPromise = null;
let scene5RafId = 0;
let scene5Running = false;
let scene5StartTime = 0;
let scene5UseFallback = false;
let scene5VideoReady = false;
let scene5VideoStarted = false;
let scene5VideoPlayCount = 0;

let scene6Ready = false;
let scene6LoadingPromise = null;
let scene6RafId = 0;
let scene6Running = false;
let scene6StartTime = 0;

let scene14IntroRafId = 0;
let scene14IntroRunning = false;
let scene14IntroStartTime = 0;

/* -------------------------------------------------------
   Util
------------------------------------------------------- */
function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeSmooth(t) {
  return 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - clamp(t), 3);
}

function easeInCubic(t) {
  return Math.pow(clamp(t), 3);
}

function segmentProgress(time, start, end) {
  if (time <= start) return 0;
  if (time >= end) return 1;
  return (time - start) / (end - start);
}

function setWorldRect(element, rect) {
  element.style.left = `${rect.x}%`;
  element.style.top = `${rect.y}%`;
  element.style.width = `${rect.width}%`;
}

function setCenterTransform(element, extra = "") {
  element.style.transform = `translate(-50%, -50%) ${extra}`.trim();
}

function setFootTransform(element, extra = "") {
  element.style.transform = `translate(-50%, -100%) ${extra}`.trim();
}

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
  } catch {
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
  scene23Screen.hidden = screen !== "scene23";
  scene4Screen.hidden = screen !== "scene4";
  scene5Screen.hidden = screen !== "scene5";
  scene6Screen.hidden = screen !== "scene6";
  scene14Screen.hidden = screen !== "scene14";
}

function renderStartScreen() {
  stopScene1();
  stopScene23();
  stopScene4();
  stopScene5();
  stopScene6();
  stopScene14Intro();
  revisitNotice.hidden = !isCompletedBrowser();
  loadStatus.textContent = scene1Ready ? "준비 완료" : "장면을 준비하고 있습니다…";
  showOnly("start");
}

function prepareScene14Ready({ focusQuestion = false } = {}) {
  scene14Kicker.style.opacity = "1";
  scene14Kicker.style.filter = "blur(0px)";
  scene14Kicker.style.transform = "translate(-50%, -50%)";
  scene14TypedText.textContent = "내가 알고 싶은 것은";
  scene14Cursor.style.display = "none";
  form.classList.add("is-ready");

  if (focusQuestion && !isCompletedBrowser()) {
    window.setTimeout(() => {
      try { questionInput.focus({ preventScroll: true }); } catch { questionInput.focus(); }
    }, 80);
  }
}

function renderScene14() {
  stopScene1();
  stopScene23();
  stopScene4();
  stopScene5();
  stopScene6();
  stopScene14Intro();
  showOnly("scene14");

  if (isCompletedBrowser()) {
    scene14Intro.hidden = true;
    showCompletedPanel("이미 참여가 완료된 브라우저입니다.");
  } else {
    scene14Intro.hidden = false;
    completedState.hidden = true;
    form.hidden = false;
    formMessage.textContent = "";
    submitButton.disabled = !db;
    prepareScene14Ready();
  }
}

function showCompletedPanel(title = "제출이 완료되었습니다.") {
  completedTitle.textContent = title;
  scene14Intro.hidden = true;
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
   Asset preload
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
  if (scene1LoadingPromise && !force) return scene1LoadingPromise;

  scene1LoadingPromise = Promise.all(SCENE1_ASSETS.map(preloadImage)).then((results) => {
    const critical = new Set([
      "./assets/scene01-space/star-chart-bg.png",
      "./assets/scene01-space/globe-full-v4.png",
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


function preloadScene23(force = false) {
  if (scene23LoadingPromise && !force) return scene23LoadingPromise;

  scene23LoadingPromise = Promise.all(SCENE23_ASSETS.map(preloadImage))
    .then((results) => {
      scene23Ready = results.every((item) => item.ok);

      if (!scene23Ready) {
        console.warn(
          "Scene 3 에셋 로딩 실패:",
          results.filter((item) => !item.ok)
        );
      }

      return scene23Ready;
    });

  return scene23LoadingPromise;
}


function preloadScene4(force = false) {
  if (scene4LoadingPromise && !force) return scene4LoadingPromise;

  scene4LoadingPromise = Promise.all(SCENE4_ASSETS.map(preloadImage))
    .then((results) => {
      scene4Ready = results.every((item) => item.ok);

      if (!scene4Ready) {
        console.warn(
          "Scene 4 일부 에셋 로딩 실패:",
          results.filter((item) => !item.ok)
        );
      }

      return scene4Ready;
    });

  return scene4LoadingPromise;
}


function preloadVideoElement(video, src, timeoutMs = 8000) {
  return new Promise((resolve) => {
    let settled = false;
    let timeoutId = 0;

    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("error", onError);
      resolve({ src, ok });
    };

    const onReady = () => finish(true);
    const onError = () => finish(false);

    if (video.readyState >= 2) {
      finish(true);
      return;
    }

    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("canplay", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });

    if (video.getAttribute("src") !== src) {
      video.src = src;
    }
    video.load();

    timeoutId = window.setTimeout(() => finish(false), timeoutMs);
  });
}

function preloadScene5(force = false) {
  if (scene5LoadingPromise && !force) return scene5LoadingPromise;

  scene5LoadingPromise = Promise.all([
    preloadVideoElement(futureTimelapse, SCENE5_VIDEO_SRC),
    preloadImage(SCENE5_FALLBACK_SRC)
  ]).then(([videoResult, fallbackResult]) => {
    scene5VideoReady = videoResult.ok;
    scene5UseFallback = !scene5VideoReady;
    scene5Ready = scene5VideoReady || fallbackResult.ok;

    if (!videoResult.ok) {
      console.warn("Scene 5 동영상 로딩 실패 — fallback 이미지 사용");
    }

    if (!scene5Ready) {
      console.error("Scene 5 동영상과 fallback 이미지 모두 로딩 실패");
    }

    return scene5Ready;
  });

  return scene5LoadingPromise;
}

function preloadScene6(force = false) {
  if (scene6LoadingPromise && !force) return scene6LoadingPromise;

  scene6LoadingPromise = Promise.all(SCENE6_ASSETS.map(preloadImage))
    .then((results) => {
      scene6Ready = results.every((item) => item.ok);
      if (!scene6Ready) {
        console.warn(
          "Scene 6~13 일부 에셋 로딩 실패:",
          results.filter((item) => !item.ok)
        );
      }
      return scene6Ready;
    });

  return scene6LoadingPromise;
}

/* -------------------------------------------------------
   Camera
------------------------------------------------------- */
function cameraMatrix(targetX, targetY, zoom) {
  const width = sceneViewport.clientWidth;
  const height = sceneViewport.clientHeight;

  const targetPxX = (targetX / 100) * width;
  const targetPxY = (targetY / 100) * height;

  const tx = width / 2 - targetPxX * zoom;
  const ty = height / 2 - targetPxY * zoom;

  return `matrix(${zoom}, 0, 0, ${zoom}, ${tx}, ${ty})`;
}

function interpolateKeys(keys, time) {
  if (time <= keys[0].time) return keys[0];
  if (time >= keys[keys.length - 1].time) return keys[keys.length - 1];

  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i];
    const b = keys[i + 1];
    if (time >= a.time && time <= b.time) {
      const rawT = segmentProgress(time, a.time, b.time);
      const t = a.ease === "hold" ? rawT : easeSmooth(rawT);

      return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        zoom: lerp(a.zoom, b.zoom, t)
      };
    }
  }

  return keys[keys.length - 1];
}

function applyCamera(time) {
  const camera = interpolateKeys(CAMERA_KEYS, time);
  sceneCamera.style.transform = cameraMatrix(camera.x, camera.y, camera.zoom);
}

/* -------------------------------------------------------
   Smooth rocket path
   - Catmull-Rom spline
   - arc-length lookup으로 경유점 사이 속도 불균형 완화
   - 비행 전체에 하나의 가속 곡선만 적용
------------------------------------------------------- */
function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    ),
    y: 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    )
  };
}

function sampleSpline(points, samplesPerSegment = 48) {
  const samples = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let j = 0; j < samplesPerSegment; j += 1) {
      const t = j / samplesPerSegment;
      samples.push(catmullRom(p0, p1, p2, p3, t));
    }
  }

  samples.push(points[points.length - 1]);

  let total = 0;
  const lookup = [{ ...samples[0], distance: 0 }];

  for (let i = 1; i < samples.length; i += 1) {
    const dx = samples[i].x - samples[i - 1].x;
    const dy = samples[i].y - samples[i - 1].y;
    total += Math.hypot(dx, dy);
    lookup.push({ ...samples[i], distance: total });
  }

  return { lookup, total };
}

const ROCKET_SPLINE = sampleSpline(ROCKET_PATH_POINTS);

function pointAtPathProgress(progress) {
  const p = clamp(progress);
  const target = ROCKET_SPLINE.total * p;
  const lookup = ROCKET_SPLINE.lookup;

  let low = 0;
  let high = lookup.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (lookup[mid].distance < target) low = mid + 1;
    else high = mid;
  }

  const bIndex = Math.max(1, low);
  const a = lookup[bIndex - 1];
  const b = lookup[bIndex];
  const span = Math.max(0.000001, b.distance - a.distance);
  const t = clamp((target - a.distance) / span);

  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t)
  };
}

function rocketMotionProgress(time) {
  if (time <= ELEMENT_TIMELINE.rocket.moveStart) return 0;
  if (time >= ELEMENT_TIMELINE.rocket.farPoint) return 1;

  const u = segmentProgress(
    time,
    ELEMENT_TIMELINE.rocket.moveStart,
    ELEMENT_TIMELINE.rocket.farPoint
  );

  // 하나의 연속적인 가속 곡선.
  // 초반 약 2초는 천천히, 후반으로 갈수록 지속적으로 빨라집니다.
  const strength = 2.6;
  return (Math.exp(strength * u) - 1) / (Math.exp(strength) - 1);
}

function rocketRotationAtProgress(progress) {
  const back = pointAtPathProgress(Math.max(0, progress - 0.006));
  const front = pointAtPathProgress(Math.min(1, progress + 0.006));

  const dx = front.x - back.x;
  const dy = front.y - back.y;

  // 이미지의 0deg를 위쪽 진행 방향으로 보고 좌우 기울기를 계산
  return Math.atan2(dx, -dy) * (180 / Math.PI);
}

/* -------------------------------------------------------
   Rocket path
------------------------------------------------------- */
function interpolateRocket(time) {
  const progress = rocketMotionProgress(time);
  const point = pointAtPathProgress(progress);

  return {
    x: point.x,
    y: point.y,
    rotate: rocketRotationAtProgress(progress),

    // 화면 깊숙한 곳으로 날아가는 느낌을 위해
    // 전체 비행 진행도에 따라 연속적으로 축소
    scale: lerp(1.0, 0.055, easeSmooth(progress))
  };
}

/* -------------------------------------------------------
   Scene state reset
------------------------------------------------------- */
function applyStaticLayout() {
  setWorldRect(globe, WORLD_LAYOUT.globe);
  setWorldRect(observer, WORLD_LAYOUT.observer);

  setWorldRect(rocketIdle, WORLD_LAYOUT.rocketIdle);
  setWorldRect(rocketLaunch, WORLD_LAYOUT.rocketLaunch);

  setWorldRect(cloudLeft, WORLD_LAYOUT.cloudLeft);
  setWorldRect(cloudRight, WORLD_LAYOUT.cloudRight);
  setWorldRect(cloudSmall, WORLD_LAYOUT.cloudSmall);

  setWorldRect(ladyOnStar, WORLD_LAYOUT.ladyOnStar);
  setWorldRect(deityFigure, WORLD_LAYOUT.deityFigure);
  setWorldRect(mothTop, WORLD_LAYOUT.mothTop);
  setWorldRect(jupiter, WORLD_LAYOUT.jupiter);
  setWorldRect(planetGreen, WORLD_LAYOUT.planetGreen);
  setWorldRect(saturn, WORLD_LAYOUT.saturn);
  setWorldRect(mothLower, WORLD_LAYOUT.mothLower);
}

function resetScene1Elements() {
  applyStaticLayout();

  // Scene 1 → 2 전환에서 적용했던 blur를 재생 시 초기화
  scene1Screen.style.filter = "blur(0px)";
  scene1Screen.style.opacity = "1";
  sceneCamera.style.transform = cameraMatrix(50, 50, 1);

  globe.style.opacity = "0";
  setCenterTransform(globe);

  observer.style.opacity = "0";
  setFootTransform(observer);

  rocketIdle.style.opacity = "0";
  setCenterTransform(rocketIdle);

  rocketLaunch.style.opacity = "0";
  setCenterTransform(rocketLaunch);

  cloudLeft.style.opacity = "0";
  setCenterTransform(cloudLeft);

  cloudRight.style.opacity = "0";
  setCenterTransform(cloudRight);

  cloudSmall.style.opacity = "0";
  setCenterTransform(cloudSmall);

  decorativeElements.forEach((element) => {
    element.style.opacity = "0";
    setCenterTransform(element);
  });
}

function stopScene1() {
  activeSceneToken += 1;
  sceneRunning = false;
  if (sceneRafId) cancelAnimationFrame(sceneRafId);
  sceneRafId = 0;
}

/* -------------------------------------------------------
   Per-frame render
------------------------------------------------------- */
function renderGlobe(time) {
  const p = easeOutCubic(segmentProgress(time, ELEMENT_TIMELINE.globe.appear, ELEMENT_TIMELINE.globe.settle));
  globe.style.opacity = String(p);
  const translateY = lerp(8, 0, p);
  const scale = lerp(0.96, 1.0, p);
  setCenterTransform(globe, `translateY(${translateY}%) scale(${scale})`);
}

function renderObserver(time) {
  const p = easeOutCubic(segmentProgress(time, ELEMENT_TIMELINE.observer.appear, ELEMENT_TIMELINE.observer.upright));
  observer.style.opacity = String(p);
  const rotateX = lerp(86, 0, p);
  const translateY = lerp(10, 0, p);
  const scale = lerp(0.76, 1.0, p);
  setFootTransform(observer, `perspective(900px) rotateX(${rotateX}deg) translateY(${translateY}%) scale(${scale})`);
}

function renderRocketIdle(time) {
  if (time < ELEMENT_TIMELINE.rocket.appear) {
    rocketIdle.style.opacity = "0";
    return;
  }
  if (time >= ELEMENT_TIMELINE.rocket.ignite) {
    rocketIdle.style.opacity = "0";
    return;
  }

  const p = segmentProgress(time, ELEMENT_TIMELINE.rocket.appear, ELEMENT_TIMELINE.rocket.appearEnd);
  const opacity = time < ELEMENT_TIMELINE.rocket.appearEnd ? easeOutCubic(p) : 1;
  rocketIdle.style.opacity = String(opacity);
  setCenterTransform(rocketIdle, `scale(1)`);
}

function renderRocketLaunch(time) {
  if (time < ELEMENT_TIMELINE.rocket.ignite) {
    rocketLaunch.style.opacity = "0";
    return;
  }

  rocketLaunch.style.opacity = "1";

  // 기준 위치는 항상 점화 위치 (70,77)에 고정.
  // 이후 실제 비행은 transform: translate3d()만 변경합니다.
  rocketLaunch.style.left = `${WORLD_LAYOUT.rocketLaunch.x}%`;
  rocketLaunch.style.top = `${WORLD_LAYOUT.rocketLaunch.y}%`;

  let state;

  if (time < ELEMENT_TIMELINE.rocket.moveStart) {
    // 점화 후 1초간 완전 정지
    state = {
      x: WORLD_LAYOUT.rocketLaunch.x,
      y: WORLD_LAYOUT.rocketLaunch.y,
      rotate: 0,
      scale: 1
    };
  } else {
    state = interpolateRocket(time);
  }

  const dxWorld = state.x - WORLD_LAYOUT.rocketLaunch.x;
  const dyWorld = state.y - WORLD_LAYOUT.rocketLaunch.y;

  const dxPx = (dxWorld / 100) * sceneViewport.clientWidth;
  const dyPx = (dyWorld / 100) * sceneViewport.clientHeight;

  // 점화 우주선 기본 크기 1.5배 × 원거리 축소 비율
  const visualScale = 1.5 * state.scale;

  rocketLaunch.style.transform =
    `translate(-50%, -50%) translate3d(${dxPx}px, ${dyPx}px, 0) ` +
    `rotate(${state.rotate}deg) scale(${visualScale})`;
}

function renderClouds(time) {
  const sideP = easeOutCubic(segmentProgress(time, ELEMENT_TIMELINE.clouds.sideStart, ELEMENT_TIMELINE.clouds.sideEnd));
  const smallP = easeOutCubic(segmentProgress(time, ELEMENT_TIMELINE.clouds.smallStart, ELEMENT_TIMELINE.clouds.smallEnd));

  cloudLeft.style.opacity = String(sideP);
  setCenterTransform(
    cloudLeft,
    `translate(${lerp(18, -8, sideP)}%, ${lerp(8, 0, sideP)}%) scale(${lerp(0.35, 1.02, sideP)})`
  );

  cloudRight.style.opacity = String(sideP);
  setCenterTransform(
    cloudRight,
    `translate(${lerp(-18, 8, sideP)}%, ${lerp(8, 0, sideP)}%) scale(${lerp(0.35, 1.02, sideP)})`
  );

  cloudSmall.style.opacity = String(0.84 * smallP);
  setCenterTransform(
    cloudSmall,
    `translate(${lerp(8, -82, smallP)}%, ${lerp(7, 3, smallP)}%) scale(${lerp(0.30, 1.00, smallP)})`
  );
}

function renderDecorativeStatic(element, time) {
  const p = easeOutCubic(segmentProgress(time, ELEMENT_TIMELINE.upperObjects.create, ELEMENT_TIMELINE.upperObjects.ready));
  element.style.opacity = String(p);
  setCenterTransform(element, `scale(${lerp(0.94, 1.0, p)})`);
}

function renderDecorativeFloating(element, time, direction = 1) {
  const p = easeOutCubic(segmentProgress(time, ELEMENT_TIMELINE.upperObjects.create, ELEMENT_TIMELINE.upperObjects.ready));
  element.style.opacity = String(p);

  let floatY = 0;
  if (time > ELEMENT_TIMELINE.upperObjects.ready) {
    const t = (time - ELEMENT_TIMELINE.upperObjects.ready) / 1000;
    floatY = Math.sin(t * 1.6) * 3.2 * direction;
  }

  setCenterTransform(element, `translateY(${floatY}%) scale(${lerp(0.94, 1.0, p)})`);
}

function renderUpperObjects(time) {
  renderDecorativeStatic(mothTop, time);
  renderDecorativeStatic(jupiter, time);
  renderDecorativeStatic(planetGreen, time);
  renderDecorativeStatic(saturn, time);
  renderDecorativeStatic(mothLower, time);

  renderDecorativeFloating(ladyOnStar, time, 1);
  renderDecorativeFloating(deityFigure, time, -1);
}

function renderSceneFrame(time) {
  applyCamera(time);
  renderGlobe(time);
  renderObserver(time);
  renderRocketIdle(time);
  renderRocketLaunch(time);
  renderClouds(time);
  renderUpperObjects(time);
}


/* -------------------------------------------------------
   Scene 1 → Scene 3 direct transition helper
   -------------------------------------------------------
   함수/화면 ID는 기존 SCENE23 명칭을 유지하지만,
   실제 재생에서는 Scene 2와 중간 은하가 존재하지 않는다.
------------------------------------------------------- */
function scene23Matrix(
  targetX,
  targetY,
  zoom,
  rotation = 0,
  options = {}
) {
  const width = scene23Viewport.clientWidth;
  const height = scene23Viewport.clientHeight;

  const {
    baseScale = 1,
    anchorX = 0,
    anchorY = 0
  } = options;

  const anchorPxX = (anchorX / 100) * width;
  const anchorPxY = (anchorY / 100) * height;

  const targetPxX =
    anchorPxX + (((targetX / 100) * width) - anchorPxX) * baseScale;
  const targetPxY =
    anchorPxY + (((targetY / 100) * height) - anchorPxY) * baseScale;

  const effectiveZoom = zoom * baseScale;

  const tx = width / 2 - targetPxX * zoom;
  const ty = height / 2 - targetPxY * zoom + anchorPxY * (1 - baseScale);

  if (Math.abs(rotation) < 0.001) {
    return `matrix(${effectiveZoom}, 0, 0, ${effectiveZoom}, ${tx}, ${ty})`;
  }

  return (
    `translate(${width / 2}px, ${height / 2}px) ` +
    `translate(${anchorPxX * (1 - baseScale)}px, ${anchorPxY * (1 - baseScale)}px) ` +
    `rotate(${rotation}deg) scale(${effectiveZoom}) ` +
    `translate(${-((targetX / 100) * width)}px, ${-((targetY / 100) * height)}px)`
  );
}

function resetScene23() {
  scene23Screen.style.opacity = "0";
  scene23Screen.style.filter = "blur(0px)";
  scene23Viewport.style.transform = "translate3d(0,0,0)";
  scene1Screen.style.opacity = "1";
  scene1Screen.style.filter = "blur(0px)";

  clusterLayer.style.opacity = "1";
  clusterLayer.style.filter = "blur(10px)";
  clusterLayer.style.transform = scene23Matrix(
    CLUSTER_TARGET.x,
    CLUSTER_TARGET.y,
    CLUSTER_TARGET.zoom
  );

  scene3EndTitle.style.opacity = "0";
  scene3EndTitle.style.filter = "blur(8px)";
  scene3EndTitle.style.transform = "translate(-50%, calc(-50% + 10px))";
}

function renderScene23(time) {
  /* -----------------------------------------------------
     1. Scene 1: (25,30) 부근으로 빠른 Zoom In
     - 기존 ease-in-out보다 즉각적으로 속도가 붙도록 easeOutCubic
  ----------------------------------------------------- */
  const zoomInP = easeOutCubic(
    segmentProgress(time, 0, SCENE23_TIMELINE.scene1ZoomEnd)
  );

  const scene1X = lerp(50, SCENE1_GALAXY_TARGET.x, zoomInP);
  const scene1Y = lerp(50, SCENE1_GALAXY_TARGET.y, zoomInP);
  const scene1Zoom = Math.exp(
    lerp(
      Math.log(1),
      Math.log(SCENE1_GALAXY_TARGET.zoom),
      zoomInP
    )
  );

  sceneCamera.style.transform = cameraMatrix(
    scene1X,
    scene1Y,
    scene1Zoom
  );

  /* -----------------------------------------------------
     2. 확대 상태에서 Scene 3 은하단으로 빠른 blur/crossfade
     - 양쪽의 확대 초점을 화면 중앙에 맞춰 장면 전환 지점을 연결
  ----------------------------------------------------- */
  const clusterFadeP = easeOutCubic(
    segmentProgress(
      time,
      SCENE23_TIMELINE.clusterFadeStart,
      SCENE23_TIMELINE.clusterFadeEnd
    )
  );

  scene23Screen.style.opacity = String(clusterFadeP);
  scene1Screen.style.opacity = String(1 - clusterFadeP);
  scene1Screen.style.filter =
    `blur(${lerp(0, 7, clusterFadeP)}px) brightness(${lerp(1, 0.64, clusterFadeP)})`;
  clusterLayer.style.filter =
    `blur(${lerp(10, 0, clusterFadeP)}px)`;

  /* -----------------------------------------------------
     3. Scene 3: 빠르게 Zoom Out + 동시에 중앙 이동
     - 14× → 1× 로그 보간
     - target 은하 좌표 → 화면 중앙(50,50)
     - 끝부분에서만 살짝 감속하는 easeOutCubic
  ----------------------------------------------------- */
  const zoomOutP = easeOutCubic(
    segmentProgress(
      time,
      SCENE23_TIMELINE.clusterZoomOutStart,
      SCENE23_TIMELINE.clusterZoomOutEnd
    )
  );

  const clusterZoom = Math.exp(
    lerp(
      Math.log(CLUSTER_TARGET.zoom),
      Math.log(1),
      zoomOutP
    )
  );

  const clusterX = lerp(CLUSTER_TARGET.x, 50, zoomOutP);
  const clusterY = lerp(CLUSTER_TARGET.y, 50, zoomOutP);

  clusterLayer.style.transform = scene23Matrix(
    clusterX,
    clusterY,
    clusterZoom
  );

  /* -----------------------------------------------------
     4. 전체 화면 도달 후 정확히 1초 뒤 타이틀 시작
  ----------------------------------------------------- */
  const titleP = easeOutCubic(
    segmentProgress(
      time,
      SCENE23_TIMELINE.scene3TitleStart,
      SCENE23_TIMELINE.scene3TitleReady
    )
  );

  scene3EndTitle.style.opacity = String(titleP);
  scene3EndTitle.style.filter = `blur(${lerp(8, 0, titleP)}px)`;
  scene3EndTitle.style.transform =
    `translate(-50%, calc(-50% + ${lerp(10, 0, titleP)}px))`;
}


/* -------------------------------------------------------
   Scene 4 helper
------------------------------------------------------- */
function scene4BgTravelPx() {
  const width = scene4Viewport.clientWidth;
  const height = scene4Viewport.clientHeight;
  const renderedBgHeight = width * DEEPSEA_BG_ASPECT;
  return Math.max(0, renderedBgHeight - height);
}

function scene4CameraProgress(time) {
  if (time <= SCENE4_TIMELINE.descendStart) return 0;

  if (time <= SCENE4_TIMELINE.descendEnd) {
    return easeSmooth(
      segmentProgress(
        time,
        SCENE4_TIMELINE.descendStart,
        SCENE4_TIMELINE.descendEnd
      )
    );
  }

  if (time < SCENE4_TIMELINE.ascendStart) return 1;

  if (time <= SCENE4_TIMELINE.ascendEnd) {
    const p = easeSmooth(
      segmentProgress(
        time,
        SCENE4_TIMELINE.ascendStart,
        SCENE4_TIMELINE.ascendEnd
      )
    );

    return lerp(1, SCENE4_ASCEND_FINAL_PROGRESS, p);
  }

  return SCENE4_ASCEND_FINAL_PROGRESS;
}

function setScene4Creature(
  element,
  {
    x,
    y,
    scale = 1,
    rotate = 0,
    flipX = 1,
    opacity = 1
  }
) {
  element.style.left = `${x}%`;
  element.style.top = `${y}%`;
  element.style.opacity = String(clamp(opacity));
  element.style.transform =
    `translate(-50%, -50%) rotate(${rotate}deg) ` +
    `scale(${scale}) scaleX(${flipX})`;
}

function resetScene4() {
  scene4Screen.style.opacity = "1";
  scene4Screen.style.filter = "none";

  scene4Camera.style.opacity = "0";
  scene4Camera.style.filter = "blur(14px) brightness(0.48)";
  scene4Camera.style.transform = "translate3d(0, 7vh, 0)";

  scene4Corridor.style.opacity = "0";
  scene4Corridor.style.transform = "translate3d(0, 0, 0) scale(1)";

  [fishSchoolA, fishSchoolB, scene4Whale, scene4Squid].forEach((element) => {
    element.style.opacity = "0";
  });

  scene4Title.style.opacity = "0";
  scene4Title.style.filter = "blur(8px)";
  scene4Title.style.transform =
    "translate(-50%, calc(-50% + 10px))";

  // Scene 3 최종 화면에서 전환을 시작할 수 있도록 초기화
  scene23Screen.style.opacity = "1";
  scene23Screen.style.filter = "blur(0px) brightness(1)";
  scene23Viewport.style.transform = "translate3d(0,0,0)";
  scene3EndTitle.style.opacity = "1";
  scene3EndTitle.style.filter = "blur(0px)";
}

function renderScene4Transition(time) {
  const transitionP = easeSmooth(
    segmentProgress(time, 0, SCENE4_TIMELINE.transitionEnd)
  );

  // Scene 3는 카메라가 아래로 내려가는 것처럼 위쪽으로 밀려나며
  // blur + darken + fade.
  const scene3Exit = easeSmooth(
    segmentProgress(time, 0, 850)
  );

  scene23Viewport.style.transform =
    `translate3d(0, ${lerp(0, -18, scene3Exit)}vh, 0) ` +
    `scale(${lerp(1, 1.018, scene3Exit)})`;

  scene23Screen.style.filter =
    `blur(${lerp(0, 12, scene3Exit)}px) ` +
    `brightness(${lerp(1, 0.16, scene3Exit)})`;

  scene23Screen.style.opacity = String(1 - scene3Exit);

  const oldTitleFade = easeSmooth(segmentProgress(time, 0, 360));
  scene3EndTitle.style.opacity = String(1 - oldTitleFade);
  scene3EndTitle.style.filter =
    `blur(${lerp(0, 5, oldTitleFade)}px)`;

  // 중간 암흑 통로:
  // 초반 빠르게 어두워지고, 후반 심해가 나타나며 다시 걷힘.
  let corridorOpacity;
  if (time <= 760) {
    corridorOpacity = lerp(
      0,
      0.98,
      easeSmooth(segmentProgress(time, 120, 760))
    );
  } else {
    corridorOpacity = lerp(
      0.98,
      0,
      easeSmooth(
        segmentProgress(
          time,
          760,
          SCENE4_TIMELINE.transitionEnd
        )
      )
    );
  }

  scene4Corridor.style.opacity = String(clamp(corridorOpacity));
  scene4Corridor.style.transform =
    `translate3d(0, ${lerp(3, -2, transitionP)}vh, 0) ` +
    `scale(${lerp(1.03, 1, transitionP)})`;

  // 후반부부터 심해 상단이 아래에서 흐릿하게 등장 → sharp.
  const deepseaEnter = easeSmooth(
    segmentProgress(time, 720, SCENE4_TIMELINE.transitionEnd)
  );

  scene4Camera.style.opacity = String(deepseaEnter);
  scene4Camera.style.filter =
    `blur(${lerp(14, 0, deepseaEnter)}px) ` +
    `brightness(${lerp(0.48, 1, deepseaEnter)})`;

  const entryShift = lerp(
    scene4Viewport.clientHeight * 0.075,
    0,
    deepseaEnter
  );

  scene4Camera.style.transform =
    `translate3d(0, ${entryShift}px, 0)`;
}

function renderFishSchoolA(time) {
  if (
    time < SCENE4_TIMELINE.fishAStart ||
    time > SCENE4_TIMELINE.fishAEnd
  ) {
    fishSchoolA.style.opacity = "0";
    return;
  }

  let x;
  let y;

  if (time <= SCENE4_TIMELINE.fishASlowEnd) {
    const p = easeSmooth(
      segmentProgress(
        time,
        SCENE4_TIMELINE.fishAStart,
        SCENE4_TIMELINE.fishASlowEnd
      )
    );

    // 처음 2초는 화면을 천천히 가로지름.
    x = lerp(-58, 8, p);
    y = lerp(18, 28, p);
  } else {
    const p = easeInCubic(
      segmentProgress(
        time,
        SCENE4_TIMELINE.fishASlowEnd,
        SCENE4_TIMELINE.fishAEnd
      )
    );

    // 이후 빠르게 가속하여 우측 하단 화면 밖으로 퇴장.
    x = lerp(8, 142, p);
    y = lerp(28, 49, p);
  }

  const fadeIn = easeSmooth(
    segmentProgress(
      time,
      SCENE4_TIMELINE.fishAStart,
      SCENE4_TIMELINE.fishAStart + 260
    )
  );

  setScene4Creature(fishSchoolA, {
    x,
    y,
    scale: 0.86,
    rotate: 15,
    flipX: 1,
    opacity: fadeIn
  });
}

function renderFishSchoolB(time) {
  if (
    time < SCENE4_TIMELINE.fishBStart ||
    time > SCENE4_TIMELINE.fishBEnd
  ) {
    fishSchoolB.style.opacity = "0";
    return;
  }

  let x;
  let y;

  if (time <= SCENE4_TIMELINE.fishBSlowEnd) {
    const p = easeSmooth(
      segmentProgress(
        time,
        SCENE4_TIMELINE.fishBStart,
        SCENE4_TIMELINE.fishBSlowEnd
      )
    );

    // 머리는 살짝 아래를 향하고, 이동 경로도 우 → 좌하단 대각선.
    x = lerp(145, 78, p);
    y = lerp(35, 46, p);
  } else {
    const p = easeInCubic(
      segmentProgress(
        time,
        SCENE4_TIMELINE.fishBSlowEnd,
        SCENE4_TIMELINE.fishBEnd
      )
    );

    x = lerp(78, -65, p);
    y = lerp(46, 63, p);
  }

  const fadeIn = easeSmooth(
    segmentProgress(
      time,
      SCENE4_TIMELINE.fishBStart,
      SCENE4_TIMELINE.fishBStart + 260
    )
  );

  // 같은 asset을 좌우 반전하여 두 번째 물고기 떼로 사용.
  setScene4Creature(fishSchoolB, {
    x,
    y,
    scale: 0.68,
    rotate: 12,
    flipX: -1,
    opacity: fadeIn * 0.92
  });
}

function renderWhale(time) {
  if (
    time < SCENE4_TIMELINE.whaleStart ||
    time > SCENE4_TIMELINE.whaleEnd
  ) {
    scene4Whale.style.opacity = "0";
    return;
  }

  const p = easeSmooth(
    segmentProgress(
      time,
      SCENE4_TIMELINE.whaleStart,
      SCENE4_TIMELINE.whaleEnd
    )
  );

  // 이전보다 훨씬 느리게, 화면 안에 남는 정도만 이동.
  const x = lerp(-46, 28, p);
  const bob = Math.sin(
    (time - SCENE4_TIMELINE.whaleStart) / 420
  ) * 1.8;

  const fadeIn = easeSmooth(
    segmentProgress(
      time,
      SCENE4_TIMELINE.whaleStart,
      SCENE4_TIMELINE.whaleStart + 720
    )
  );

  setScene4Creature(scene4Whale, {
    x,
    y: 63 + bob,
    scale: 1.38,
    rotate: -2,
    flipX: 1,
    opacity: fadeIn
  });
}

function renderSquid(time) {
  if (
    time < SCENE4_TIMELINE.squidStart ||
    time > SCENE4_TIMELINE.squidExitEnd
  ) {
    scene4Squid.style.opacity = "0";
    return;
  }

  const bob = Math.sin(
    (time - SCENE4_TIMELINE.squidStart) / 300
  ) * 1.45;

  if (time <= SCENE4_TIMELINE.squidApproachEnd) {
    const p = easeSmooth(
      segmentProgress(
        time,
        SCENE4_TIMELINE.squidStart,
        SCENE4_TIMELINE.squidApproachEnd
      )
    );

    const fadeIn = easeSmooth(
      segmentProgress(
        time,
        SCENE4_TIMELINE.squidStart,
        SCENE4_TIMELINE.squidStart + 480
      )
    );

    // 더 큰 크기로 등장 → 왼쪽으로 이동하면서 점점 작아짐.
    setScene4Creature(scene4Squid, {
      x: lerp(136, 48, p),
      y: lerp(56, 45, p) + bob,
      scale: lerp(1.6, 0.92, p),
      rotate: lerp(3, -4, p),
      flipX: 1,
      opacity: fadeIn
    });

    return;
  }

  // 중앙 부근에서 좌우 반전한 뒤 우상단으로 빠르게 퇴장.
  const exitP = easeInCubic(
    segmentProgress(
      time,
      SCENE4_TIMELINE.squidApproachEnd,
      SCENE4_TIMELINE.squidExitEnd
    )
  );

  const fadeOut = 1 - easeSmooth(
    segmentProgress(
      time,
      SCENE4_TIMELINE.squidExitEnd - 420,
      SCENE4_TIMELINE.squidExitEnd
    )
  );

  setScene4Creature(scene4Squid, {
    x: lerp(48, 124, exitP),
    y: lerp(45, -14, exitP) + bob,
    scale: lerp(0.92, 0.52, exitP),
    rotate: lerp(-4, -18, exitP),
    flipX: -1,
    opacity: fadeOut
  });
}

function renderScene4(time) {
  /* -----------------------------------------------------
     1. Scene 3 → Scene 4 암흑 통로
  ----------------------------------------------------- */
  if (time <= SCENE4_TIMELINE.transitionEnd) {
    renderScene4Transition(time);
  } else {
    scene4Corridor.style.opacity = "0";
    scene4Camera.style.opacity = "1";
    scene4Camera.style.filter = "blur(0px) brightness(1)";
  }

  /* -----------------------------------------------------
     2. 심해 배경 카메라
     상단 → 바닥 → 다시 중앙 부근으로 상승
  ----------------------------------------------------- */
  const cameraProgress = scene4CameraProgress(time);
  const bgTravel = scene4BgTravelPx();
  const cameraY = -bgTravel * cameraProgress;

  if (time > SCENE4_TIMELINE.transitionEnd) {
    scene4Camera.style.transform =
      `translate3d(0, ${cameraY}px, 0)`;
  }

  /* -----------------------------------------------------
     3. 하강 중 물고기 떼
  ----------------------------------------------------- */
  renderFishSchoolA(time);
  renderFishSchoolB(time);

  /* -----------------------------------------------------
     4. 바닥 부근 고래
  ----------------------------------------------------- */
  renderWhale(time);

  /* -----------------------------------------------------
     5. 상승 중 대왕오징어
  ----------------------------------------------------- */
  renderSquid(time);

  /* -----------------------------------------------------
     6. Scene 4 마무리 문구
  ----------------------------------------------------- */
  const titleP = easeSmooth(
    segmentProgress(
      time,
      SCENE4_TIMELINE.titleStart,
      SCENE4_TIMELINE.titleReady
    )
  );

  scene4Title.style.opacity = String(titleP);
  scene4Title.style.filter =
    `blur(${lerp(8, 0, titleP)}px)`;
  scene4Title.style.transform =
    `translate(-50%, calc(-50% + ${lerp(10, 0, titleP)}px))`;
}

function stopScene4() {
  scene4Running = false;

  if (scene4RafId) {
    cancelAnimationFrame(scene4RafId);
  }

  scene4RafId = 0;
}

function scene4Loop(now, token) {
  if (!scene4Running || token !== activeSceneToken) return;

  const elapsed = now - scene4StartTime;
  const time = Math.min(elapsed, SCENE4_END);

  renderScene4(time);

  // 암흑 통로 전환이 끝나면 Scene 3 화면을 실제로 숨김.
  if (
    time >= SCENE4_TIMELINE.transitionEnd &&
    !scene23Screen.hidden
  ) {
    scene23Screen.hidden = true;
    scene23Screen.style.opacity = "1";
    scene23Screen.style.filter = "blur(0px) brightness(1)";
    scene23Viewport.style.transform = "translate3d(0,0,0)";
  }

  if (elapsed >= SCENE4_END) {
    scene4Running = false;

    playScene5();
    return;
  }

  scene4RafId = requestAnimationFrame(
    (nextNow) => scene4Loop(nextNow, token)
  );
}

async function playScene4() {
  stopScene4();

  const token = activeSceneToken;

  if (!scene4Ready) {
    const ready = await preloadScene4(true);

    if (!ready) {
      console.error("Scene 4 핵심 에셋을 불러오지 못했습니다.");
      renderScene14();
      return;
    }
  }

  if (token !== activeSceneToken) return;

  // Scene 4가 재생되는 동안 Scene 5 동영상을 미리 준비해 전환 지연을 줄임.
  preloadScene5();

  resetScene4();

  // Scene 3의 마지막 프레임을 그대로 남겨둔 채
  // Scene 4 레이어를 위에 겹쳐 1.4초 암흑 통로 전환.
  scene4Screen.hidden = false;

  scene4Running = true;
  scene4StartTime = performance.now();

  scene4RafId = requestAnimationFrame(
    (now) => scene4Loop(now, token)
  );
}


/* -------------------------------------------------------
   Scene 5 — 아직 오지 않은 미래
------------------------------------------------------- */
function resetScene5() {
  // Scene 4 마지막 화면 위에 Scene 5를 겹쳐 올리되,
  // 전환이 시작되는 순간 검은 화면이 덮이지 않도록 screen 배경은 투명하게 시작한다.
  scene5Screen.style.background = "rgba(3, 7, 13, 0)";

  scene5Viewport.style.opacity = "0";
  scene5Viewport.style.transform = "translate3d(100%, 0, 0)";
  scene5Viewport.style.filter = "blur(12px) brightness(0.64)";

  scene5TransitionVeil.style.opacity = "0";
  scene5TransitionVeil.style.transform = "translate3d(25%, 0, 0) skewX(-7deg)";

  scene5Title.style.opacity = "0";
  scene5Title.style.filter = "blur(8px)";
  scene5Title.style.transform = "translate(-50%, calc(-50% + 10px))";

  // Scene 4 → 5 전환 중에는 반드시 fallback 정지 이미지만 보여준다.
  // 영상은 Scene 5 전환이 완전히 끝난 뒤 시작한다.
  futureFallback.style.opacity = "1";
  futureTimelapse.style.opacity = "0";

  scene5VideoStarted = false;
  scene5VideoPlayCount = 0;

  futureTimelapse.pause();
  futureTimelapse.loop = false;
  futureTimelapse.playbackRate = 1;
  futureTimelapse.onended = null;
  try {
    futureTimelapse.currentTime = 0;
  } catch {
    // 일부 브라우저는 metadata 로드 전 currentTime 설정을 거부할 수 있음.
  }
}

function renderScene5Transition(time) {
  const p = easeSmooth(
    segmentProgress(time, 0, SCENE5_TIMELINE.transitionEnd)
  );

  // Scene 4 마지막 프레임 자체가 그대로 왼쪽으로 이동하며 Scene 5를 드러낸다.
  // 별도의 검은 중간 화면을 만들지 않는다.
  scene4Viewport.style.transform =
    `translate3d(${lerp(0, -42, p)}%, 0, 0)`;
  scene4Viewport.style.filter =
    `blur(${lerp(0, 8, p)}px) brightness(${lerp(1, 0.58, p)})`;
  scene4Viewport.style.opacity = String(lerp(1, 0.20, p));

  // Scene 5는 오른쪽에서 들어오며 blur → sharp.
  scene5Viewport.style.transform =
    `translate3d(${lerp(100, 0, p)}%, 0, 0)`;
  scene5Viewport.style.filter =
    `blur(${lerp(12, 0, p)}px) brightness(${lerp(0.64, 1, p)})`;
  scene5Viewport.style.opacity = String(lerp(0.62, 1, p));

  // Scene 5 screen 자체의 배경은 전환 후반에만 서서히 생긴다.
  // 초반에는 완전히 투명하므로 Scene 4의 마지막 프레임이 그대로 이어져 보인다.
  const backdropP = easeSmooth(segmentProgress(p, 0.72, 1));
  scene5Screen.style.background =
    `rgba(3, 7, 13, ${lerp(0, 1, backdropP)})`;

  // 두 장면 사이를 지나가는 어두운 띠. 평면적인 검정 화면 대신 연결감을 준다.
  const veilOpacity = Math.sin(Math.PI * clamp(p)) * 0.72;
  scene5TransitionVeil.style.opacity = String(veilOpacity);
  scene5TransitionVeil.style.transform =
    `translate3d(${lerp(28, -20, p)}%, 0, 0) skewX(-7deg)`;
}

function startScene5Video(token) {
  if (scene5VideoStarted || scene5UseFallback || !scene5VideoReady) return;

  scene5VideoStarted = true;
  scene5VideoPlayCount = 1;

  // video의 poster가 fallback과 동일하므로, 전환 완료 순간 video를 올려도
  // 첫 프레임이 준비되기 전 검은 화면이 끼지 않는다.
  futureTimelapse.style.opacity = "1";
  futureFallback.style.opacity = "1";

  futureTimelapse.onended = async () => {
    if (token !== activeSceneToken || !scene5Running) return;

    if (scene5VideoPlayCount < 2) {
      scene5VideoPlayCount += 1;
      try {
        futureTimelapse.currentTime = 0;
        await futureTimelapse.play();
      } catch (error) {
        console.warn("Scene 5 두 번째 타임랩스 재생 실패 — 마지막 프레임 유지", error);
      }
      return;
    }

    // 두 번째 재생 종료 후 마지막 프레임을 유지한다.
    futureTimelapse.pause();
  };

  try {
    futureTimelapse.currentTime = 0;
    const playPromise = futureTimelapse.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch((error) => {
        console.warn("Scene 5 동영상 재생 실패 — fallback 이미지 유지", error);
        scene5UseFallback = true;
        futureTimelapse.pause();
        futureTimelapse.style.opacity = "0";
        futureFallback.style.opacity = "1";
      });
    }
  } catch (error) {
    console.warn("Scene 5 동영상 재생 실패 — fallback 이미지 유지", error);
    scene5UseFallback = true;
    futureTimelapse.pause();
    futureTimelapse.style.opacity = "0";
    futureFallback.style.opacity = "1";
  }
}

function renderScene5(time) {
  if (time <= SCENE5_TIMELINE.transitionEnd) {
    renderScene5Transition(time);
  } else {
    scene5Screen.style.background = "#03070d";
    scene5Viewport.style.transform = "translate3d(0, 0, 0)";
    scene5Viewport.style.filter = "blur(0px) brightness(1)";
    scene5Viewport.style.opacity = "1";
    scene5TransitionVeil.style.opacity = "0";
  }

  const titleP = easeSmooth(
    segmentProgress(
      time,
      SCENE5_TIMELINE.titleStart,
      SCENE5_TIMELINE.titleReady
    )
  );

  scene5Title.style.opacity = String(titleP);
  scene5Title.style.filter = `blur(${lerp(8, 0, titleP)}px)`;
  scene5Title.style.transform =
    `translate(-50%, calc(-50% + ${lerp(10, 0, titleP)}px))`;
}

function stopScene5() {
  scene5Running = false;

  if (scene5RafId) {
    cancelAnimationFrame(scene5RafId);
  }

  scene5RafId = 0;
  futureTimelapse.pause();
  futureTimelapse.onended = null;
  scene5VideoStarted = false;
  scene5VideoPlayCount = 0;
}

function scene5Loop(now, token) {
  if (!scene5Running || token !== activeSceneToken) return;

  const elapsed = now - scene5StartTime;
  const time = Math.min(elapsed, SCENE5_END);

  renderScene5(time);

  // 2.2초 전환이 끝나면 Scene 4를 숨기고 스타일을 원복해 replay에 대비.
  if (
    time >= SCENE5_TIMELINE.transitionEnd &&
    !scene4Screen.hidden
  ) {
    scene4Screen.hidden = true;
    scene4Viewport.style.transform = "translate3d(0, 0, 0)";
    scene4Viewport.style.filter = "none";
    scene4Viewport.style.opacity = "1";
  }

  // 전환 중에는 fallback 정지 이미지를 유지하고,
  // Scene 5가 화면을 완전히 채운 뒤에만 타임랩스를 시작한다.
  if (
    time >= SCENE5_TIMELINE.videoStart &&
    !scene5VideoStarted
  ) {
    startScene5Video(token);
  }

  if (elapsed >= SCENE5_END) {
    scene5Running = false;
    futureTimelapse.pause();
    playScene6Sequence();
    return;
  }

  scene5RafId = requestAnimationFrame(
    (nextNow) => scene5Loop(nextNow, token)
  );
}

async function playScene5() {
  stopScene5();

  const token = activeSceneToken;

  // 모바일 브라우저가 초기 preload를 보류했을 수 있으므로,
  // 실제 재생 직전에 동영상 로딩을 한 번 더 확인한다.
  if (!scene5Ready || !scene5VideoReady) {
    const ready = await preloadScene5(true);

    if (!ready) {
      console.error("Scene 5 핵심 에셋을 불러오지 못했습니다.");
      renderScene14();
      return;
    }
  }

  if (token !== activeSceneToken) return;

  // Scene 5 재생 중 Scene 6~13 에셋을 미리 준비한다.
  preloadScene6();

  resetScene5();
  scene5Screen.hidden = false;

  // 여기서는 영상을 재생하지 않는다.
  // Scene 4 → 5 전환은 fallback 정지 이미지로 완료하고,
  // scene5Loop가 transitionEnd에 도달한 순간 타임랩스를 시작한다.
  if (token !== activeSceneToken) return;

  scene5Running = true;
  scene5StartTime = performance.now();

  scene5RafId = requestAnimationFrame(
    (now) => scene5Loop(now, token)
  );
}



/* -------------------------------------------------------
   Scene 6~13 — 질문 시퀀스
------------------------------------------------------- */
function setPanelHidden(panel) {
  panel.style.opacity = "0";
  panel.style.filter = "blur(7px)";
  panel.style.transform = "translate3d(0, 18px, 0)";
}

function resetScene6Sequence() {
  // Scene 5 마지막 프레임을 가리지 않도록 Scene 6의 외곽/viewport 배경은
  // 전환 시작 시 완전히 투명하게 둔다. 배경 이미지만 후반부에 아래에서 등장한다.
  scene6Screen.style.opacity = "1";
  scene6Screen.style.background = "transparent";
  scene6Viewport.style.opacity = "1";
  scene6Viewport.style.background = "transparent";
  scene6Viewport.style.filter = "none";
  scene6Viewport.style.transform = "translate3d(0, 0, 0)";

  scene6Bg.style.opacity = "0";
  scene6Bg.style.filter = "blur(14px) brightness(0.48)";
  scene6Bg.style.transform = "translate3d(0, 7vh, 0)";

  scene6Corridor.style.opacity = "0";
  scene6Corridor.style.transform = "translate3d(0, 3vh, 0) scale(1.03)";

  [seqScene6, seqScene7, seqScene8, seqScene9, seqScene10, seqScene11, seqScene12, seqScene13]
    .forEach(setPanelHidden);

  scene7Line1.textContent = "";
  scene7Line2.textContent = "";
  scene7Cursor1.style.display = "inline-block";
  scene7Cursor2.style.display = "none";

  [scene10Jesus, scene10Alien, scene10CaptionLeft, scene10CaptionRight].forEach((el) => {
    if (!el) return;
    el.style.opacity = "0";
    el.style.filter = "blur(7px)";
    el.style.transform = "";
  });

  [scene13Q1, scene13Q2, scene13Q3].forEach((el) => {
    el.style.opacity = "0";
    el.style.filter = "blur(7px)";
    el.style.transform = "translate3d(0, 16px, 0)";
  });

  // Scene 5 마지막 프레임을 전환 출발점으로 복구.
  scene5Screen.style.opacity = "1";
  scene5Screen.style.filter = "blur(0px) brightness(1)";
  scene5Viewport.style.transform = "translate3d(0,0,0)";
  scene5Viewport.style.filter = "blur(0px) brightness(1)";
  scene5Title.style.opacity = "1";
  scene5Title.style.filter = "blur(0px)";
  scene5Title.style.transform = "translate(-50%, -50%)";
}

function renderScene6Transition(time) {
  const p = easeSmooth(segmentProgress(time, 0, SCENE6_TIMELINE.transitionEnd));
  const oldExit = easeSmooth(segmentProgress(time, 0, 850));

  // Scene 3→4와 동일한 방식:
  // Scene 5 마지막 프레임 자체가 먼저 위로 이동하면서 blur + darken + fade 된다.
  // Scene 6의 불투명 배경은 이 단계에서 Scene 5를 미리 덮지 않는다.
  scene5Viewport.style.transform =
    `translate3d(0, ${lerp(0, -18, oldExit)}vh, 0) scale(${lerp(1, 1.018, oldExit)})`;
  scene5Screen.style.filter =
    `blur(${lerp(0, 12, oldExit)}px) brightness(${lerp(1, 0.16, oldExit)})`;
  scene5Screen.style.opacity = String(1 - oldExit);

  const titleFade = easeSmooth(segmentProgress(time, 0, 520));
  scene5Title.style.opacity = String(1 - titleFade);
  scene5Title.style.filter = `blur(${lerp(0, 6, titleFade)}px)`;
  scene5Title.style.transform =
    `translate(-50%, calc(-50% + ${lerp(0, -12, titleFade)}px))`;

  // Scene 5 위에 암흑 통로가 겹쳐지고,
  // 후반부에는 청록 배경이 아래에서 blur → sharp로 등장한다.
  let corridorOpacity;
  if (time <= 760) {
    corridorOpacity = lerp(0, 0.98, easeSmooth(segmentProgress(time, 120, 760)));
  } else {
    corridorOpacity = lerp(
      0.98,
      0,
      easeSmooth(segmentProgress(time, 760, SCENE6_TIMELINE.transitionEnd))
    );
  }
  scene6Corridor.style.opacity = String(clamp(corridorOpacity));
  scene6Corridor.style.transform =
    `translate3d(0, ${lerp(3, -2, p)}vh, 0) scale(${lerp(1.03, 1, p)})`;

  const enter = easeSmooth(segmentProgress(time, 720, SCENE6_TIMELINE.transitionEnd));
  scene6Bg.style.opacity = String(enter);
  scene6Bg.style.filter =
    `blur(${lerp(14, 0, enter)}px) brightness(${lerp(0.48, 1, enter)})`;
  scene6Bg.style.transform =
    `translate3d(0, ${lerp(7, 0, enter)}vh, 0)`;

  // 전환 말미에만 바깥 배경을 청록색으로 채워 데스크톱 여백에서도 끊김이 없게 한다.
  const backdropP = easeSmooth(segmentProgress(time, 1080, SCENE6_TIMELINE.transitionEnd));
  scene6Screen.style.background =
    `rgba(18, 39, 38, ${backdropP})`;
}

function renderUpPanel(panel, time, inStart, inEnd, outStart, outEnd) {
  const inP = easeSmooth(segmentProgress(time, inStart, inEnd));
  const outP = easeSmooth(segmentProgress(time, outStart, outEnd));

  if (time < inStart || time >= outEnd) {
    setPanelHidden(panel);
    return;
  }

  panel.style.opacity = String(clamp(inP * (1 - outP)));
  panel.style.filter = `blur(${lerp(7, 0, inP) + lerp(0, 7, outP)}px)`;
  panel.style.transform =
    `translate3d(0, ${lerp(18, 0, inP) + lerp(0, -18, outP)}px, 0)`;
}

function renderScene10(time) {
  const inStart = SCENE6_TIMELINE.scene10InStart;
  const inEnd = SCENE6_TIMELINE.scene10InEnd;
  const outStart = SCENE6_TIMELINE.scene10OutStart;
  const outEnd = SCENE6_TIMELINE.scene10OutEnd;

  if (time < inStart || time >= outEnd) {
    setPanelHidden(seqScene10);
    [scene10Jesus, scene10Alien, scene10CaptionLeft, scene10CaptionRight].forEach((el) => {
      if (!el) return;
      el.style.opacity = "0";
      el.style.filter = "blur(7px)";
    });
    return;
  }

  // Parent stays fixed. Images and text use independent motion paths.
  seqScene10.style.opacity = "1";
  seqScene10.style.filter = "none";
  seqScene10.style.transform = "none";

  const inP = easeSmooth(segmentProgress(time, inStart, inEnd));
  const outP = easeSmooth(segmentProgress(time, outStart, outEnd));
  const opacity = clamp(inP * (1 - outP));
  const blur = lerp(7, 0, inP) + lerp(0, 7, outP);
  const imageY = lerp(18, 0, inP) + lerp(0, -18, outP);

  // Images: keep existing bottom→top entrance and top exit.
  [scene10Jesus, scene10Alien].forEach((el) => {
    el.style.opacity = String(opacity);
    el.style.filter = `blur(${blur}px)`;
    el.style.transform = `translate3d(0, ${imageY}px, 0)`;
  });

  // Text 1: left → right, converging to its final position.
  const leftX = lerp(-12, 0, inP);
  const textY = lerp(0, -18, outP);
  scene10CaptionLeft.style.opacity = String(opacity);
  scene10CaptionLeft.style.filter = `blur(${blur}px)`;
  scene10CaptionLeft.style.transform =
    `translate(-50%, -50%) translate3d(${leftX}vw, ${textY}px, 0)`;

  // Text 2: right → left, converging to its final position.
  const rightX = lerp(12, 0, inP);
  scene10CaptionRight.style.opacity = String(opacity);
  scene10CaptionRight.style.filter = `blur(${blur}px)`;
  scene10CaptionRight.style.transform =
    `translate(-50%, -50%) translate3d(${rightX}vw, ${textY}px, 0)`;
}

function typedSlice(text, progress) {
  const chars = Array.from(text);
  const count = Math.floor(clamp(progress) * chars.length);
  return chars.slice(0, count).join("");
}

function renderScene7(time) {
  const visible = time >= SCENE6_TIMELINE.scene7Start && time < SCENE6_TIMELINE.scene7OutEnd;
  if (!visible) {
    setPanelHidden(seqScene7);
    return;
  }

  seqScene7.style.opacity = "1";
  seqScene7.style.filter = "blur(0px)";
  seqScene7.style.transform = "translate3d(0,0,0)";

  const line1 = "당신이 알고 싶은";
  const line2 = "미지의 세계는 어디인가요?";

  const secondLinePhase = time >= SCENE6_TIMELINE.scene7Line2Start;
  scene7Cursor1.style.display = secondLinePhase ? "none" : "inline-block";
  scene7Cursor2.style.display = secondLinePhase ? "inline-block" : "none";

  if (time < SCENE6_TIMELINE.scene7Line1Start) {
    scene7Line1.textContent = "";
    scene7Line2.textContent = "";
  } else if (time <= SCENE6_TIMELINE.scene7Line1End) {
    scene7Line1.textContent = typedSlice(
      line1,
      segmentProgress(time, SCENE6_TIMELINE.scene7Line1Start, SCENE6_TIMELINE.scene7Line1End)
    );
    scene7Line2.textContent = "";
  } else if (time < SCENE6_TIMELINE.scene7Line2Start) {
    scene7Line1.textContent = line1;
    scene7Line2.textContent = "";
  } else if (time <= SCENE6_TIMELINE.scene7Line2End) {
    scene7Line1.textContent = line1;
    scene7Line2.textContent = typedSlice(
      line2,
      segmentProgress(time, SCENE6_TIMELINE.scene7Line2Start, SCENE6_TIMELINE.scene7Line2End)
    );
  } else {
    scene7Line1.textContent = line1;
    scene7Line2.textContent = line2;
  }

  if (time >= SCENE6_TIMELINE.scene7OutStart) {
    const outP = easeSmooth(
      segmentProgress(time, SCENE6_TIMELINE.scene7OutStart, SCENE6_TIMELINE.scene7OutEnd)
    );
    seqScene7.style.opacity = String(1 - outP);
    seqScene7.style.filter = `blur(${lerp(0, 7, outP)}px)`;
    seqScene7.style.transform = `translate3d(0, ${lerp(0, -18, outP)}px, 0)`;
  }
}

function renderScene13Question(el, time, start, end) {
  const p = easeSmooth(segmentProgress(time, start, end));
  const outP = easeSmooth(
    segmentProgress(time, SCENE6_TIMELINE.scene13OutStart, SCENE6_TIMELINE.scene13OutEnd)
  );
  el.style.opacity = String(clamp(p * (1 - outP)));
  el.style.filter = `blur(${lerp(7, 0, p) + lerp(0, 7, outP)}px)`;
  el.style.transform =
    `translate3d(0, ${lerp(16, 0, p) + lerp(0, -18, outP)}px, 0)`;
}

function renderScene6Sequence(time) {
  if (time <= SCENE6_TIMELINE.transitionEnd) {
    renderScene6Transition(time);
  } else {
    scene6Screen.style.background = "#122726";
    scene6Viewport.style.opacity = "1";
    scene6Viewport.style.background = "#122726";
    scene6Viewport.style.filter = "none";
    scene6Viewport.style.transform = "translate3d(0,0,0)";
    scene6Bg.style.opacity = "1";
    scene6Bg.style.filter = "blur(0px) brightness(1)";
    scene6Bg.style.transform = "translate3d(0,0,0)";
    scene6Corridor.style.opacity = "0";
  }

  renderUpPanel(
    seqScene6, time,
    SCENE6_TIMELINE.scene6InStart, SCENE6_TIMELINE.scene6InEnd,
    SCENE6_TIMELINE.scene6OutStart, SCENE6_TIMELINE.scene6OutEnd
  );

  renderScene7(time);

  renderUpPanel(
    seqScene8, time,
    SCENE6_TIMELINE.scene8InStart, SCENE6_TIMELINE.scene8InEnd,
    SCENE6_TIMELINE.scene8OutStart, SCENE6_TIMELINE.scene8OutEnd
  );
  renderUpPanel(
    seqScene9, time,
    SCENE6_TIMELINE.scene9InStart, SCENE6_TIMELINE.scene9InEnd,
    SCENE6_TIMELINE.scene9OutStart, SCENE6_TIMELINE.scene9OutEnd
  );
  renderScene10(time);
  renderUpPanel(
    seqScene11, time,
    SCENE6_TIMELINE.scene11InStart, SCENE6_TIMELINE.scene11InEnd,
    SCENE6_TIMELINE.scene11OutStart, SCENE6_TIMELINE.scene11OutEnd
  );
  renderUpPanel(
    seqScene12, time,
    SCENE6_TIMELINE.scene12InStart, SCENE6_TIMELINE.scene12InEnd,
    SCENE6_TIMELINE.scene12OutStart, SCENE6_TIMELINE.scene12OutEnd
  );

  const scene13Visible = time >= SCENE6_TIMELINE.scene13Q1Start && time < SCENE6_TIMELINE.scene13OutEnd;
  seqScene13.style.opacity = scene13Visible ? "1" : "0";
  seqScene13.style.filter = "none";
  seqScene13.style.transform = "none";
  renderScene13Question(scene13Q1, time, SCENE6_TIMELINE.scene13Q1Start, SCENE6_TIMELINE.scene13Q1End);
  renderScene13Question(scene13Q2, time, SCENE6_TIMELINE.scene13Q2Start, SCENE6_TIMELINE.scene13Q2End);
  renderScene13Question(scene13Q3, time, SCENE6_TIMELINE.scene13Q3Start, SCENE6_TIMELINE.scene13Q3End);
}

function stopScene6() {
  scene6Running = false;
  if (scene6RafId) cancelAnimationFrame(scene6RafId);
  scene6RafId = 0;
}

function scene6Loop(now, token) {
  if (!scene6Running || token !== activeSceneToken) return;
  const elapsed = now - scene6StartTime;
  const time = Math.min(elapsed, SCENE6_END);
  renderScene6Sequence(time);

  if (time >= SCENE6_TIMELINE.transitionEnd && !scene5Screen.hidden) {
    scene5Screen.hidden = true;
    scene5Screen.style.opacity = "1";
    scene5Screen.style.filter = "none";
    scene5Viewport.style.transform = "translate3d(0,0,0)";
    scene5Viewport.style.filter = "blur(0px) brightness(1)";
  }

  if (elapsed >= SCENE6_END) {
    scene6Running = false;
    playScene14Intro();
    return;
  }

  scene6RafId = requestAnimationFrame((nextNow) => scene6Loop(nextNow, token));
}

async function playScene6Sequence() {
  stopScene6();
  const token = activeSceneToken;

  if (!scene6Ready) {
    const ready = await preloadScene6(true);
    if (!ready) {
      console.error("Scene 6~13 핵심 에셋을 불러오지 못했습니다.");
      renderScene14();
      return;
    }
  }
  if (token !== activeSceneToken) return;

  resetScene6Sequence();
  scene6Screen.hidden = false;
  scene6Running = true;
  scene6StartTime = performance.now();
  scene6RafId = requestAnimationFrame((now) => scene6Loop(now, token));
}

/* -------------------------------------------------------
   Scene 14 — 실제 입력 화면 intro
------------------------------------------------------- */
function resetScene14Intro() {
  scene14Intro.hidden = false;
  scene14Kicker.style.opacity = "0";
  scene14Kicker.style.filter = "blur(7px)";
  scene14Kicker.style.transform = "translate(-50%, calc(-50% + 16px))";
  scene14TypedText.textContent = "";
  scene14Cursor.style.display = "inline-block";
  form.classList.remove("is-ready");
  completedState.hidden = true;
  form.hidden = false;
  formMessage.textContent = "";
  submitButton.disabled = !db;
}

function renderScene14Intro(time) {
  const kickerP = easeSmooth(
    segmentProgress(time, SCENE14_INTRO.kickerInStart, SCENE14_INTRO.kickerInEnd)
  );
  scene14Kicker.style.opacity = String(kickerP);
  scene14Kicker.style.filter = `blur(${lerp(7, 0, kickerP)}px)`;
  scene14Kicker.style.transform =
    `translate(-50%, calc(-50% + ${lerp(16, 0, kickerP)}px))`;

  const phrase = "내가 알고 싶은 것은";
  if (time < SCENE14_INTRO.typingStart) {
    scene14TypedText.textContent = "";
  } else if (time <= SCENE14_INTRO.typingEnd) {
    scene14TypedText.textContent = typedSlice(
      phrase,
      segmentProgress(time, SCENE14_INTRO.typingStart, SCENE14_INTRO.typingEnd)
    );
  } else {
    scene14TypedText.textContent = phrase;
  }

  if (time >= SCENE14_INTRO.cursorHoldEnd) {
    scene14Cursor.style.display = "none";
    form.classList.add("is-ready");
  }
}

function stopScene14Intro() {
  scene14IntroRunning = false;
  if (scene14IntroRafId) cancelAnimationFrame(scene14IntroRafId);
  scene14IntroRafId = 0;
}

function scene14IntroLoop(now, token) {
  if (!scene14IntroRunning || token !== activeSceneToken) return;
  const elapsed = now - scene14IntroStartTime;
  renderScene14Intro(elapsed);

  if (elapsed >= SCENE14_INTRO.formReady) {
    scene14IntroRunning = false;
    prepareScene14Ready({ focusQuestion: true });
    return;
  }

  scene14IntroRafId = requestAnimationFrame((nextNow) => scene14IntroLoop(nextNow, token));
}

function playScene14Intro() {
  stopScene14Intro();
  stopScene6();
  const token = activeSceneToken;

  scene14Screen.hidden = false;
  scene6Screen.hidden = true;

  if (isCompletedBrowser()) {
    renderScene14();
    return;
  }

  resetScene14Intro();
  scene14IntroRunning = true;
  scene14IntroStartTime = performance.now();
  scene14IntroRafId = requestAnimationFrame((now) => scene14IntroLoop(now, token));
}

function stopScene23() {
  scene23Running = false;

  if (scene23RafId) {
    cancelAnimationFrame(scene23RafId);
  }

  scene23RafId = 0;
}

function scene23Loop(now, token) {
  if (!scene23Running || token !== activeSceneToken) return;

  const elapsed = now - scene23StartTime;
  const time = Math.min(elapsed, SCENE23_END);

  renderScene23(time);

  // Scene 1 → Scene 3 crossfade가 끝나면 Scene 1을 숨긴다.
  if (
    time >= SCENE23_TIMELINE.clusterFadeEnd &&
    !scene1Screen.hidden
  ) {
    scene1Screen.hidden = true;
    scene1Screen.style.opacity = "1";
    scene1Screen.style.filter = "blur(0px)";
  }

  if (elapsed >= SCENE23_END) {
    scene23Running = false;
    playScene4();
    return;
  }

  scene23RafId = requestAnimationFrame(
    (nextNow) => scene23Loop(nextNow, token)
  );
}

async function playScene23() {
  stopScene23();

  const token = activeSceneToken;

  if (!scene23Ready) {
    const ready = await preloadScene23(true);

    if (!ready) {
      console.error("Scene 3 핵심 에셋을 불러오지 못했습니다.");
      renderScene14();
      return;
    }
  }

  if (token !== activeSceneToken) return;

  resetScene23();

  // Scene 1 마지막 프레임 위에 Scene 3 은하단을 겹쳐서 직접 전환.
  scene23Screen.hidden = false;
  scene23Screen.style.opacity = "0";

  scene23Running = true;
  scene23StartTime = performance.now();

  scene23RafId = requestAnimationFrame(
    (now) => scene23Loop(now, token)
  );
}


function sceneLoop(now, token) {
  if (!sceneRunning || token !== activeSceneToken) return;

  const elapsed = now - sceneStartTime;
  const time = Math.min(elapsed, SCENE1_END);

  renderSceneFrame(time);

  if (elapsed >= SCENE1_END) {
    sceneRunning = false;
    playScene23();
    return;
  }

  sceneRafId = requestAnimationFrame((nextNow) => sceneLoop(nextNow, token));
}

/* -------------------------------------------------------
   Scene play
------------------------------------------------------- */
async function playScene1() {
  stopScene1();
  const token = activeSceneToken;

  resetScene1Elements();
  showOnly("scene1");

  if (!scene1Ready) {
    if (sceneLoading) sceneLoading.hidden = false;
    const ready = await preloadScene1(true);
    if (sceneLoading) sceneLoading.hidden = true;

    if (!ready) {
      console.error("Scene 1 핵심 에셋을 불러오지 못했습니다.");
      renderScene14();
      return;
    }
  }

  if (token !== activeSceneToken) return;

  sceneRunning = true;
  sceneStartTime = performance.now();
  sceneRafId = requestAnimationFrame((now) => sceneLoop(now, token));
}

/* -------------------------------------------------------
   Background tab handling
------------------------------------------------------- */
document.addEventListener("visibilitychange", () => {
  // requestAnimationFrame은 백그라운드 탭에서 자연스럽게 정지합니다.
  // Scene 1 / Scene 3 / Scene 4 / Scene 5 / Scene 6~14 모두 절대시간 기반이므로
  // 별도 애니메이션 객체 동기화가 필요하지 않습니다.
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
    if (!responseId) throw new Error("responseId 생성 실패");

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
    formMessage.textContent = "저장에 실패했습니다. 입력 내용은 유지됩니다. 다시 제출해주세요.";
    submitButton.disabled = false;
  }
});

/* -------------------------------------------------------
   Events
------------------------------------------------------- */
enterButton.addEventListener("click", async () => {
  enterButton.classList.add("is-loading");
  enterButton.disabled = true;
  loadStatus.textContent = scene1Ready ? "우주로 이동합니다…" : "장면을 불러오는 중입니다…";
  if (sceneLoading) sceneLoading.hidden = false;

  if (!scene1Ready) {
    await preloadScene1(true);
  }

  // Scene 1 재생 중 이후 장면 에셋도 미리 준비
  preloadScene23();
  preloadScene4();
  preloadScene5();
  preloadScene6();

  if (sceneLoading) sceneLoading.hidden = true;
  enterButton.classList.remove("is-loading");
  enterButton.disabled = false;

  await playScene1();
});

replayButton.addEventListener("click", () => {
  renderStartScreen();
});

/* -------------------------------------------------------
   Init
------------------------------------------------------- */
initializeFirebase();
applyStaticLayout();
renderStartScreen();
preloadScene1();
preloadScene23();
preloadScene4();
preloadScene5();
preloadScene6();
