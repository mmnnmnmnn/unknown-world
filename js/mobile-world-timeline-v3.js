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
   - 배포 파일 버전이 섞였거나 예상치 못한 오류가 나면
     시작 화면에 오류를 표시해서 "멈춘 것처럼" 보이지 않게 합니다.
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

/* =======================================================
   Scene 1 설계 원칙
   -------------------------------------------------------
   1) star-chart-bg가 고정 WORLD 좌표계입니다.
   2) 모든 오브젝트 위치/경로는 WORLD의 0~100 좌표로 관리합니다.
   3) 각 요소 시간은 Scene 시작(0 ms) 기준 절대 시간입니다.
   4) 요소 타임라인은 서로 독립적입니다.
   5) CAMERA는 WORLD를 바라보는 시점만 제어합니다.
======================================================= */

const STORAGE_KEY = "unknown-world-submission-complete";
const LAST_RESPONSE_KEY = "unknown-world-last-response";

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

/* -------------------------------------------------------
   1. WORLD LAYOUT
   x/y = 배경 기준 0~100 좌표
   width = 배경 너비 대비 %
------------------------------------------------------- */
const WORLD_LAYOUT = {
  globe:       { x: 50.0, y: 80.5, width: 144 },
  observer:    { x: 28.0, y: 86.0, width: 26 },

  // 최초 모바일 화면 좌표계 기준
  // 기본 우주선과 점화 우주선은 서로 다른 좌표를 사용
  rocketIdle:  { x: 75.0, y: 73.0, width: 21 },
  rocketLaunch:{ x: 73.0, y: 79.0, width: 21 },

  cloudLeft:   { x: 60.0, y: 86.5, width: 50 },
  cloudRight:  { x: 84.0, y: 86.0, width: 46 },
  cloudSmall:  { x: 69.0, y: 83.5, width: 23 },

  ladyOnStar:  { x: 29.0, y: 18.0, width: 39 },
  deityFigure: { x: 79.0, y: 16.0, width: 33 },
  mothTop:     { x: 7.5,  y: 19.0, width: 13 },
  jupiter:     { x: 54.5, y: 37.0, width: 17 },
  planetGreen: { x: 80.0, y: 43.0, width: 24 },
  saturn:      { x: 25.0, y: 54.0, width: 41 },
  mothLower:   { x: 88.0, y: 50.0, width: 11 }
};

/* -------------------------------------------------------
   2. ELEMENT TIMELINE
   모든 값은 Scene 시작 기준 ms
   다른 요소 시간을 참조하지 않습니다.
------------------------------------------------------- */
const ELEMENT_TIMELINE = {
  globe: {
    appear: 800,
    settle: 1800
  },

  observer: {
    appear: 2800,
    upright: 5000
  },

  rocket: {
    appear: 7300,
    appearEnd: 7650,

    // 점화 전환
    ignite: 8900,

    // 점화된 우주선은 1초간 정지
    moveStart: 9900,

    // 천천히 이동하다가 가속
    accelerate: 11900,

    // 최종적으로 (10, 20)에서 점처럼 작아짐
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

/* -------------------------------------------------------
   3. CAMERA TIMELINE
   CAMERA도 Scene 시작 기준 절대 시간
------------------------------------------------------- */
const CAMERA_TIMELINE = {
  start:        { time: 0,     x: 50, y: 50, zoom: 1.00 },

  // 카메라 실제 이동/줌 구간을 이전보다 1.5배 느리게
  observerIn:   { time: 2400,  x: 30, y: 75, zoom: 1.00 },
  observerShot: { time: 3680,  x: 30, y: 75, zoom: 2.35 },

  observerHold: { time: 6130,  x: 30, y: 75, zoom: 2.35 },

  rocketPan:    { time: 7930,  x: 73, y: 75, zoom: 2.35 },
  rocketHold:   { time: 10530, x: 73, y: 75, zoom: 2.35 },

  zoomOutEnd:   { time: 13680, x: 50, y: 50, zoom: 1.00 },

  // 우주선이 먼 점이 된 뒤 2초간 전체 화면 유지
  wideHold:     { time: 15850, x: 50, y: 50, zoom: 1.00 }
};

/*
  점화 우주선 경로.
  x/y는 WORLD 좌표입니다.

  7.0~9.0초: 우측 영역에서 천천히 상승
  9.0초 이후: 파란 동선 의도처럼 왼쪽 위로 가속
  이전 버전처럼 화면 정중앙을 과도하게 관통하지 않도록
  초반 경로를 우측에 유지합니다.
*/
const ROCKET_PATH = [
  // 점화된 우주선은 8.9~9.9초 동안 (73,79)에서 완전 정지
  { time: 9900,  x: 73.0, y: 79.0, rotate: 0,   scale: 1.00 },

  // 약 2초 동안 천천히 이동
  { time: 10900, x: 74.0, y: 73.0, rotate: -4,  scale: 0.92 },
  { time: 11900, x: 73.0, y: 65.0, rotate: -10, scale: 0.82 },

  // 가속 + 우주 먼 곳으로 멀어지는 느낌
  { time: 12250, x: 68.0, y: 55.5, rotate: -16, scale: 0.66 },
  { time: 12600, x: 58.0, y: 45.0, rotate: -23, scale: 0.50 },
  { time: 12950, x: 45.0, y: 35.0, rotate: -30, scale: 0.34 },
  { time: 13250, x: 31.0, y: 28.0, rotate: -36, scale: 0.22 },
  { time: 13550, x: 19.0, y: 23.0, rotate: -40, scale: 0.13 },

  // 최종 좌표: 점처럼 보이는 우주선
  { time: 13850, x: 10.0, y: 20.0, rotate: -42, scale: 0.07 }
];

/* Scene 총 길이는 고정 상수가 아니라 마지막 이벤트로부터 계산 */
const SCENE1_END = Math.max(
  CAMERA_TIMELINE.wideHold.time,
  ELEMENT_TIMELINE.rocket.farPoint,
  ELEMENT_TIMELINE.clouds.smallEnd,
  ELEMENT_TIMELINE.upperObjects.ready
);

/* -------------------------------------------------------
   DOM
------------------------------------------------------- */
const startScreen = document.querySelector("#startScreen");
const scene1Screen = document.querySelector("#scene1Screen");
const scene14Screen = document.querySelector("#scene14Screen");

const enterButton = document.querySelector("#enterButton");
const loadStatus = document.querySelector("#loadStatus");
const revisitNotice = document.querySelector("#revisitNotice");
const sceneLoading = document.querySelector("#sceneLoading");

const sceneViewport = document.querySelector("#sceneViewport");
const sceneCamera = document.querySelector("#sceneCamera");

const globe = document.querySelector("#globe");
const observer = document.querySelector("#observer");

const rocketGroup = document.querySelector("#rocketGroup");
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
  mothTop,
  ladyOnStar,
  deityFigure,
  jupiter,
  planetGreen,
  saturn,
  mothLower
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
   WORLD layout 적용
------------------------------------------------------- */
function applyWorldPosition(element, config) {
  element.style.left = `${config.x}%`;
  element.style.top = `${config.y}%`;
  element.style.width = `${config.width}%`;
}

function applyWorldLayout() {
  applyWorldPosition(globe, WORLD_LAYOUT.globe);
  applyWorldPosition(observer, WORLD_LAYOUT.observer);
  applyWorldPosition(rocketGroup, WORLD_LAYOUT.rocketIdle);

  applyWorldPosition(cloudLeft, WORLD_LAYOUT.cloudLeft);
  applyWorldPosition(cloudRight, WORLD_LAYOUT.cloudRight);
  applyWorldPosition(cloudSmall, WORLD_LAYOUT.cloudSmall);

  applyWorldPosition(ladyOnStar, WORLD_LAYOUT.ladyOnStar);
  applyWorldPosition(deityFigure, WORLD_LAYOUT.deityFigure);
  applyWorldPosition(mothTop, WORLD_LAYOUT.mothTop);
  applyWorldPosition(jupiter, WORLD_LAYOUT.jupiter);
  applyWorldPosition(planetGreen, WORLD_LAYOUT.planetGreen);
  applyWorldPosition(saturn, WORLD_LAYOUT.saturn);
  applyWorldPosition(mothLower, WORLD_LAYOUT.mothLower);
}

/* -------------------------------------------------------
   에셋 로딩
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
   Animation helper
------------------------------------------------------- */
function createAnimation(element, keyframes, options = {}) {
  const animation = element.animate(keyframes, {
    fill: "both",
    easing: "linear",
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

  globe.style.opacity = "";
  observer.style.opacity = "";
  rocketIdle.style.opacity = "";
  rocketLaunch.style.opacity = "";

  cloudLeft.style.opacity = "";
  cloudRight.style.opacity = "";
  cloudSmall.style.opacity = "";

  decorativeElements.forEach((element) => {
    element.style.opacity = "";
  });

  applyWorldLayout();
}

/* -------------------------------------------------------
   CAMERA
   WORLD 좌표 (x,y)를 화면 중심으로 가져오는 matrix 계산
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

function buildCameraAnimation() {
  const shots = [
    { ...CAMERA_TIMELINE.start,        easing: "ease-in-out" },
    { ...CAMERA_TIMELINE.observerIn,   easing: "cubic-bezier(.22,.72,.27,1)" },
    { ...CAMERA_TIMELINE.observerShot, easing: "linear" },
    { ...CAMERA_TIMELINE.observerHold, easing: "cubic-bezier(.42,0,.2,1)" },
    { ...CAMERA_TIMELINE.rocketPan,    easing: "linear" },
    { ...CAMERA_TIMELINE.rocketHold,   easing: "cubic-bezier(.22,.72,.27,1)" },
    { ...CAMERA_TIMELINE.zoomOutEnd,   easing: "linear" },
    { ...CAMERA_TIMELINE.wideHold,     easing: "linear" }
  ];

  const duration = CAMERA_TIMELINE.wideHold.time;

  const keyframes = shots.map((shot) => ({
    offset: shot.time / duration,
    transform: cameraMatrix(shot.x, shot.y, shot.zoom),
    easing: shot.easing
  }));

  return createAnimation(sceneCamera, keyframes, {
    duration,
    easing: "linear"
  });
}

/* -------------------------------------------------------
   ELEMENT animations
------------------------------------------------------- */
function animateGlobe() {
  const { appear, settle } = ELEMENT_TIMELINE.globe;

  createAnimation(
    globe,
    [
      {
        opacity: 0,
        transform: "translate(-50%, -50%) translateY(9%) scale(.96)"
      },
      {
        opacity: 1,
        transform: "translate(-50%, -50%) translateY(0) scale(1)"
      }
    ],
    {
      delay: appear,
      duration: settle - appear,
      easing: "cubic-bezier(.2,.8,.25,1)"
    }
  );
}

function animateObserver() {
  const { appear, upright } = ELEMENT_TIMELINE.observer;

  createAnimation(
    observer,
    [
      {
        opacity: 0,
        transform:
          "translate(-50%, -100%) perspective(900px) rotateX(86deg) translateY(10%) scale(.76)"
      },
      {
        opacity: 1,
        transform:
          "translate(-50%, -100%) perspective(900px) rotateX(68deg) translateY(7%) scale(.82)",
        offset: 0.18
      },
      {
        opacity: 1,
        transform:
          "translate(-50%, -100%) perspective(900px) rotateX(30deg) translateY(3%) scale(.94)",
        offset: 0.58
      },
      {
        opacity: 1,
        transform:
          "translate(-50%, -100%) perspective(900px) rotateX(0deg) translateY(0) scale(1)"
      }
    ],
    {
      delay: appear,
      duration: upright - appear,
      easing: "cubic-bezier(.16,.82,.24,1)"
    }
  );
}

function animateRocketIdle() {
  const start = ELEMENT_TIMELINE.rocket.appear;
  const fadeEnd = ELEMENT_TIMELINE.rocket.appearEnd;
  const ignite = ELEMENT_TIMELINE.rocket.ignite;
  const duration = ignite - start;

  const fadeOffset = (fadeEnd - start) / duration;
  const cutOffset = Math.max(fadeOffset, 0.998);

  createAnimation(
    rocketIdle,
    [
      { opacity: 0, offset: 0 },
      { opacity: 1, offset: fadeOffset, easing: "ease-out" },
      { opacity: 1, offset: cutOffset },
      { opacity: 0, offset: 1 }
    ],
    {
      delay: start,
      duration,
      easing: "linear"
    }
  );
}

function animateRocketLaunchSwitch() {
  // 점화 순간에 그룹 좌표를 기본 우주선 (75,73)에서
  // 점화 우주선 기준 좌표 (73,79)로 즉시 변경.
  createAnimation(
    rocketGroup,
    [
      {
        left: `${WORLD_LAYOUT.rocketLaunch.x}%`,
        top: `${WORLD_LAYOUT.rocketLaunch.y}%`,
        transform: "translate(-50%, -50%) scale(1)"
      },
      {
        left: `${WORLD_LAYOUT.rocketLaunch.x}%`,
        top: `${WORLD_LAYOUT.rocketLaunch.y}%`,
        transform: "translate(-50%, -50%) scale(1)"
      }
    ],
    {
      delay: ELEMENT_TIMELINE.rocket.ignite,
      duration: 1,
      easing: "steps(1, end)",
      fill: "forwards"
    }
  );

  createAnimation(
    rocketLaunch,
    [
      { opacity: 0 },
      { opacity: 1 }
    ],
    {
      delay: ELEMENT_TIMELINE.rocket.ignite,
      duration: 1,
      easing: "steps(1, end)",
      fill: "forwards"
    }
  );
}

function animateRocketPath() {
  const start = ROCKET_PATH[0].time;
  const end = ROCKET_PATH[ROCKET_PATH.length - 1].time;
  const duration = end - start;

  const keyframes = ROCKET_PATH.map((point) => {
    const isSlowSection = point.time < ELEMENT_TIMELINE.rocket.accelerate;

    return {
      offset: (point.time - start) / duration,
      left: `${point.x}%`,
      top: `${point.y}%`,
      transform:
        `translate(-50%, -50%) rotate(${point.rotate}deg) scale(${point.scale})`,
      opacity: 1,
      easing: isSlowSection
        ? "cubic-bezier(.32,.08,.42,1)"
        : "cubic-bezier(.42,0,1,1)"
    };
  });

  createAnimation(
    rocketGroup,
    keyframes,
    {
      // 점화 후 1초 정지한 다음부터 실제 이동 시작
      delay: start,
      duration,
      easing: "linear",
      fill: "forwards"
    }
  );
}

function animateCloud(
  element,
  {
    start,
    end,
    fromX = 0,
    fromY = 0,
    toX = 0,
    toY = 0,
    startScale = 0.38,
    endScale = 1,
    peakOpacity = 1
  }
) {
  createAnimation(
    element,
    [
      {
        opacity: 0,
        transform:
          `translate(-50%, -50%) translate(${fromX}%, ${fromY}%) scale(${startScale})`
      },
      {
        opacity: peakOpacity,
        transform:
          `translate(-50%, -50%) translate(${toX}%, ${toY}%) scale(${endScale})`
      }
    ],
    {
      delay: start,
      duration: end - start,
      easing: "cubic-bezier(.16,.72,.28,1)"
    }
  );
}

function animateClouds() {
  /*
    중요:
    점화 = 7000 ms
    좌/우 구름 = 7400 ms
    작은 구름 = 7600 ms

    따라서 점화 이전에는 구름 애니메이션 자체가 시작되지 않습니다.
  */
  animateCloud(cloudLeft, {
    start: ELEMENT_TIMELINE.clouds.sideStart,
    end: ELEMENT_TIMELINE.clouds.sideEnd,
    fromX: 18,
    fromY: 8,
    toX: -8,
    toY: 0,
    startScale: 0.35,
    endScale: 1.02,
    peakOpacity: 1
  });

  animateCloud(cloudRight, {
    start: ELEMENT_TIMELINE.clouds.sideStart,
    end: ELEMENT_TIMELINE.clouds.sideEnd,
    fromX: -18,
    fromY: 8,
    toX: 8,
    toY: 0,
    startScale: 0.35,
    endScale: 1.02,
    peakOpacity: 1
  });

  animateCloud(cloudSmall, {
    start: ELEMENT_TIMELINE.clouds.smallStart,
    end: ELEMENT_TIMELINE.clouds.smallEnd,
    fromX: 8,
    fromY: 7,
    toX: -82,
    toY: 3,
    startScale: 0.30,
    endScale: 1.00,
    peakOpacity: 0.84
  });
}

function animateDecorative(element, { float = false, direction = 1 } = {}) {
  const start = ELEMENT_TIMELINE.upperObjects.create;
  const ready = ELEMENT_TIMELINE.upperObjects.ready;

  if (!float) {
    createAnimation(
      element,
      [
        {
          opacity: 0,
          transform: "translate(-50%, -50%) scale(.94)"
        },
        {
          opacity: 1,
          transform: "translate(-50%, -50%) scale(1)"
        }
      ],
      {
        delay: start,
        duration: ready - start,
        easing: "ease-out"
      }
    );

    return;
  }

  const duration = SCENE1_END - start;

  createAnimation(
    element,
    [
      {
        opacity: 0,
        transform: "translate(-50%, -50%) translateY(3%) scale(.94)",
        offset: 0
      },
      {
        opacity: 1,
        transform: "translate(-50%, -50%) translateY(0) scale(1)",
        offset: (ready - start) / duration
      },
      {
        opacity: 1,
        transform: `translate(-50%, -50%) translateY(${direction * -3.2}%) scale(1)`,
        offset: 0.46
      },
      {
        opacity: 1,
        transform: `translate(-50%, -50%) translateY(${direction * 2.6}%) scale(1)`,
        offset: 0.70
      },
      {
        opacity: 1,
        transform: `translate(-50%, -50%) translateY(${direction * -2.0}%) scale(1)`,
        offset: 0.86
      },
      {
        opacity: 1,
        transform: `translate(-50%, -50%) translateY(${direction * 1.2}%) scale(1)`,
        offset: 1
      }
    ],
    {
      delay: start,
      duration,
      easing: "ease-in-out"
    }
  );
}

function animateUpperObjects() {
  /*
    카메라는 이 시점에 우주선 근처를 확대해서 보고 있습니다.
    따라서 상단 오브젝트는 카메라 밖에서 생성이 끝나고,
    이후 Zoom Out 때 이미 존재하는 상태로 드러납니다.
  */
  animateDecorative(mothTop);
  animateDecorative(jupiter);
  animateDecorative(planetGreen);
  animateDecorative(saturn);
  animateDecorative(mothLower);

  animateDecorative(ladyOnStar, { float: true, direction: 1 });
  animateDecorative(deityFigure, { float: true, direction: -1 });
}

/* -------------------------------------------------------
   Scene 1 재생
------------------------------------------------------- */
async function playScene1() {
  cancelScene1();
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

  buildCameraAnimation();

  animateGlobe();
  animateObserver();

  animateRocketIdle();
  animateRocketLaunchSwitch();
  animateRocketPath();

  animateClouds();
  animateUpperObjects();

  scene1Clock = createAnimation(
    scene1Screen,
    [{ opacity: 1 }, { opacity: 1 }],
    {
      duration: SCENE1_END,
      easing: "linear"
    }
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
  loadStatus.textContent =
    scene1Ready ? "우주로 이동합니다…" : "장면을 불러오는 중입니다…";
  if (sceneLoading) sceneLoading.hidden = false;

  if (!scene1Ready) {
    await preloadScene1(true);
  }

  if (sceneLoading) sceneLoading.hidden = true;
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
applyWorldLayout();
renderStartScreen();
preloadScene1();
