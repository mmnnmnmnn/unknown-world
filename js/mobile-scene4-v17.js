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
  "./assets/scene02-milkyway/milkyway-bg.png",
  "./assets/scene02-milkyway/galaxy-closeup-rotating-v17.png",
  "./assets/scene03-galaxy-cluster/galaxy-cluster-bg-rotated-hires.webp"
];

const SCENE4_ASSETS = [
  "./assets/scene04-deepsea/deepsea-bg.png",
  "./assets/scene04-deepsea/fish-school.png",
  "./assets/scene04-deepsea/giant-squid.png",
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
   Scene 2 → Scene 3 시작부
   -------------------------------------------------------
   Scene 2
   - Scene 1 마지막 화면에서 은하수로 crossfade
   - 은하수 약 3초 유지
   - 밝은 은하수 영역으로 부드럽게 Zoom In
   - galaxy-closeup-transition 이미지로 Crossfade

   Scene 3 시작
   - 사용자가 표시한 은하단의 타깃 은하:
     원본 galaxy-cluster-bg 기준 약 (64.03, 31.92)
   - Closeup galaxy를 작게 만들며 target galaxy로 Match Dissolve
   - 해당 은하를 중심으로 은하단 전체까지 Zoom Out
======================================================= */

const SCENE23_TIMELINE = {
  // Scene 1 → Scene 2
  scene1ToMilkywayEnd: 2200,

  // Scene 2 : 은하수
  milkywayHoldEnd: 5200,

  // 확대 속도 향상: 4.5초 → 3.0초
  milkywayZoomEnd: 8200,

  // 은하수 → 중간 은하 이미지 전환: 1.5초
  // 확대 중간부터 나타나 확대 종료와 동시에 선명해짐
  closeupFadeStart: 6700,
  closeupReady: 8200,
  closeupHoldEnd: 9700,

  // Scene 2 → Scene 3
  closeupRotateStart: 9700,
  closeupRotateEnd: 10450,

  // 회전이 멈춘 뒤 천천히 사라짐
  closeupFadeOutStart: 10450,
  closeupFadeOutEnd: 12450,

  // 은하단 이미지는 같은 위치에서 아래에 나타나며 match
  clusterFadeStart: 9700,
  clusterFadeEnd: 12450,

  // closeup이 완전히 사라진 뒤 Zoom Out 시작
  clusterZoomOutStart: 12450,

  // 줌아웃 시작 후 0.5초 뒤 중앙 이동 시작
  clusterPanStart: 12950,
  clusterZoomOutEnd: 14983,

  // Scene 3 완료 텍스트
  scene3TitleStart: 15333,
  scene3TitleReady: 16083,

  // Scene 4 직전 장면 유지
  preScene4HoldEnd: 19483
};

const MILKYWAY_TARGET = {
  // 요청 좌표: 중앙이 아니라 (45,55) 위치로 확대
  x: 45.0,
  y: 55.0
};

const MILKYWAY_BASE_SCALE = 1.15;
// 좌측 하단 고정점으로 1.15배 확대.
// (현재 화면에 딱 맞는 상태를 기준으로 왼쪽 아래는 고정되고,
// 이미지가 오른쪽/위쪽으로 더 크게 펼쳐짐)
const MILKYWAY_BASE_ANCHOR = { x: 0, y: 100 };

const CLOSEUP_GALAXY_CENTER = {
  // galaxy-closeup-transition.png의 큰 은하 중심
  x: 49.5,
  y: 45.5
};

const CLUSTER_TARGET = {
  // 사용자가 노란 원으로 지정한 은하.
  // 주석 이미지의 노란 픽셀 중심을 원본 941×1672 비율로 환산한 값.
  x: 59.15,
  y: 33.60
};

const SCENE23_END = SCENE23_TIMELINE.preScene4HoldEnd;


/* =======================================================
   Scene 4 — 닿을 수 없는 심해 (v15)
   -------------------------------------------------------
   0.0~1.4s    : Scene 3 → Scene 4 암흑 통로
   1.4~7.2s    : 심해 상단 → 바닥 하강
   2.2~5.3s    : 물고기 떼 A 좌 → 우하단 (2초 slow 후 가속)
   3.9~7.0s    : 물고기 떼 B 우 → 좌하단 (2초 slow 후 가속)
   7.35~12.745s: 고래 더 크게 등장, 매우 느리게 이동하며 계속 잔류
   10.795~16.645s: 카메라 다시 상승 (기존 대비 1.3배 느림)
   10.99~14.955s : 대왕오징어 더 크게 등장, 우 → 좌 이동하며 축소
   14.955~16.645s: 좌우 반전 후 우상단 빠른 퇴장 (기존 대비 1.3배 느림)
   17.165~17.865s: "닿을 수 없는 심해," blur → sharp
   17.865~21.265s: 문구 유지 3.4초 (유지시간 그대로)
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

  whaleStart: 7350,
  whaleEnd: 21265,

  ascendStart: 10795,
  ascendEnd: 16645,

  squidStart: 10990,
  squidApproachEnd: 14955,
  squidExitEnd: 16645,

  titleStart: 17165,
  titleReady: 17865,

  preScene5HoldEnd: 21265
};

const SCENE4_END = SCENE4_TIMELINE.preScene5HoldEnd;

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
const scene14Screen = document.querySelector("#scene14Screen");

const scene23Viewport = document.querySelector("#scene23Viewport");
const milkywayLayer = document.querySelector("#milkywayLayer");
const closeupLayer = document.querySelector("#closeupLayer");
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
  scene14Screen.hidden = screen !== "scene14";
}

function renderStartScreen() {
  stopScene1();
  stopScene23();
  stopScene4();
  revisitNotice.hidden = !isCompletedBrowser();
  loadStatus.textContent = scene1Ready ? "준비 완료" : "장면을 준비하고 있습니다…";
  showOnly("start");
}

function renderScene14() {
  stopScene1();
  stopScene23();
  stopScene4();
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
          "Scene 2/3 일부 에셋 로딩 실패:",
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
   Scene 2 / Scene 3 camera helper
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

  // baseScale이 1이 아니면, 먼저 지정 anchor를 고정점으로 확대된 뒤
  // 그 좌표계 위에서 카메라 중심 이동을 수행합니다.
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

  // 회전은 closeup galaxy match용. 중심점은 화면 중앙에 유지.
  return (
    `translate(${width / 2}px, ${height / 2}px) ` +
    `translate(${anchorPxX * (1 - baseScale)}px, ${anchorPxY * (1 - baseScale)}px) ` +
    `rotate(${rotation}deg) scale(${effectiveZoom}) ` +
    `translate(${-((targetX / 100) * width)}px, ${-((targetY / 100) * height)}px)`
  );
}

function scene23Ease(time, start, end) {
  return easeSmooth(segmentProgress(time, start, end));
}

function resetScene23() {
  scene23Screen.style.opacity = "1";
  scene23Screen.style.filter = "blur(0px)";
  scene23Viewport.style.transform = "translate3d(0,0,0)";
  scene3EndTitle.style.filter = "blur(0px)";
  scene1Screen.style.filter = "blur(0px)";

  milkywayLayer.style.opacity = "0";
  milkywayLayer.style.filter = "blur(0px)";
  milkywayLayer.style.transform = scene23Matrix(
    50,
    50,
    1,
    0,
    {
      baseScale: MILKYWAY_BASE_SCALE,
      anchorX: MILKYWAY_BASE_ANCHOR.x,
      anchorY: MILKYWAY_BASE_ANCHOR.y
    }
  );

  closeupLayer.style.opacity = "0";
  closeupLayer.style.filter = "blur(10px)";
  closeupLayer.style.transform = scene23Matrix(
    CLOSEUP_GALAXY_CENTER.x,
    CLOSEUP_GALAXY_CENTER.y,
    1
  );

  clusterLayer.style.opacity = "0";
  clusterLayer.style.filter = "blur(0px)";
  clusterLayer.style.transform = scene23Matrix(
    CLUSTER_TARGET.x,
    CLUSTER_TARGET.y,
    14
  );

  scene3EndTitle.style.opacity = "0";
  scene3EndTitle.style.transform = "translate(-50%, calc(-50% + 10px))";
}

function renderScene23(time) {
  /* -----------------------------------------------------
     1. Scene 1 → Milky Way Crossfade
  ----------------------------------------------------- */
  const intro = scene23Ease(
    time,
    0,
    SCENE23_TIMELINE.scene1ToMilkywayEnd
  );

  scene23Screen.style.opacity = String(intro);

  // 이전 장면은 점점 흐려지고,
  // 다음 장면은 흐릿한 상태에서 점점 선명해짐.
  scene1Screen.style.filter = `blur(${lerp(0, 6, intro)}px)`;
  scene23Screen.style.filter = `blur(${lerp(10, 0, intro)}px)`;

  /* -----------------------------------------------------
     2. Milky Way
     - 좌측 하단 anchor 기준 1.15배 확대 상태로 시작
     - (45,55)를 향해 이전보다 빠르게 확대
     - 확대 중간부터 은하 중간 이미지가 1.5초 동안 등장
  ----------------------------------------------------- */
  let milkyZoom = 1;
  let milkyX = 50;
  let milkyY = 50;

  if (time >= SCENE23_TIMELINE.milkywayHoldEnd) {
    const p = scene23Ease(
      time,
      SCENE23_TIMELINE.milkywayHoldEnd,
      SCENE23_TIMELINE.milkywayZoomEnd
    );

    milkyZoom = lerp(1, 3.15, p);
    milkyX = lerp(50, MILKYWAY_TARGET.x, p);
    milkyY = lerp(50, MILKYWAY_TARGET.y, p);
  }

  const closeupFadeIn = scene23Ease(
    time,
    SCENE23_TIMELINE.closeupFadeStart,
    SCENE23_TIMELINE.closeupReady
  );

  milkywayLayer.style.opacity = String(1 - closeupFadeIn * 0.94);

  // 은하수는 전환되며 살짝 흐려지고,
  // 중간 은하 이미지는 blur → sharp로 선명해짐.
  milkywayLayer.style.filter = `blur(${lerp(0, 5, closeupFadeIn)}px)`;
  closeupLayer.style.filter = `blur(${lerp(10, 0, closeupFadeIn)}px)`;

  milkywayLayer.style.transform = scene23Matrix(
    milkyX,
    milkyY,
    milkyZoom,
    0,
    {
      baseScale: MILKYWAY_BASE_SCALE,
      anchorX: MILKYWAY_BASE_ANCHOR.x,
      anchorY: MILKYWAY_BASE_ANCHOR.y
    }
  );

  /* -----------------------------------------------------
     3. Closeup galaxy
     - 은하수 확대 중간부터 등장
     - 확대 종료 후 잠시 유지
  ----------------------------------------------------- */
  let closeupOpacity = closeupFadeIn;
  // 사용자가 0.8배 축소한 원본을 주었으므로, 화면에서는 더 확대해서 사용한다.
  // fade-in 동안 약간 안정되며, 이후에는 같은 배율을 유지한다.
  const closeupZoom = lerp(1.86, 1.38, closeupFadeIn);

  /* -----------------------------------------------------
     4. Scene 2 → Scene 3 Match
     - 중간 은하는 나타나는 순간부터 사라질 때까지
       계속 시계방향으로 아주 천천히 회전한다.
     - 총 노출 시간(5.75s) 동안 시계 한 칸 정도인
       약 30deg만 회전하도록 설정한다.
  ----------------------------------------------------- */
  const closeupLifeP = segmentProgress(
    time,
    SCENE23_TIMELINE.closeupFadeStart,
    SCENE23_TIMELINE.closeupFadeOutEnd
  );

  const MATCH_ROTATION_DEG = 30.0;
  const closeupRotation = MATCH_ROTATION_DEG * closeupLifeP;

  const closeupFadeOut = scene23Ease(
    time,
    SCENE23_TIMELINE.closeupFadeOutStart,
    SCENE23_TIMELINE.closeupFadeOutEnd
  );

  if (time >= SCENE23_TIMELINE.closeupFadeOutStart) {
    closeupOpacity = 1 - closeupFadeOut;
  }

  closeupLayer.style.opacity = String(clamp(closeupOpacity));
  closeupLayer.style.transform = scene23Matrix(
    CLOSEUP_GALAXY_CENTER.x,
    CLOSEUP_GALAXY_CENTER.y,
    closeupZoom,
    closeupRotation
  );

  /* -----------------------------------------------------
     5. Cluster layer
     - closeup이 사라지는 동안 같은 자리에 정지 상태로 나타남
  ----------------------------------------------------- */
  const clusterFade = scene23Ease(
    time,
    SCENE23_TIMELINE.clusterFadeStart,
    SCENE23_TIMELINE.clusterFadeEnd
  );

  let clusterZoom = 14;
  let clusterX = CLUSTER_TARGET.x;
  let clusterY = CLUSTER_TARGET.y;

  /* -----------------------------------------------------
     6. Closeup이 완전히 사라진 뒤
        a) Zoom Out 먼저 시작
        b) 0.5초 뒤 중앙 이동 시작
  ----------------------------------------------------- */
  if (time >= SCENE23_TIMELINE.clusterZoomOutStart) {
    const zoomOut = scene23Ease(
      time,
      SCENE23_TIMELINE.clusterZoomOutStart,
      SCENE23_TIMELINE.clusterZoomOutEnd
    );

    // 고배율 → 저배율 전환이 자연스럽도록 로그 보간
    clusterZoom = Math.exp(
      lerp(
        Math.log(14),
        Math.log(1),
        zoomOut
      )
    );

    const panProgress = scene23Ease(
      time,
      SCENE23_TIMELINE.clusterPanStart,
      SCENE23_TIMELINE.clusterZoomOutEnd
    );

    clusterX = lerp(CLUSTER_TARGET.x, 50, panProgress);
    clusterY = lerp(CLUSTER_TARGET.y, 50, panProgress);
  }

  clusterLayer.style.opacity = String(clusterFade);
  clusterLayer.style.transform = scene23Matrix(
    clusterX,
    clusterY,
    clusterZoom
  );

  /* -----------------------------------------------------
     7. Scene 3 마무리 텍스트
     - Scene 4 직전 장면
  ----------------------------------------------------- */
  const titleP = scene23Ease(
    time,
    SCENE23_TIMELINE.scene3TitleStart,
    SCENE23_TIMELINE.scene3TitleReady
  );

  scene3EndTitle.style.opacity = String(titleP);
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

    // 현재 개발 단계에서는 Scene 4 완료 후
    // Scene 5 대신 임시로 입력 화면으로 이동.
    renderScene14();
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

  // 긴 crossfade가 충분히 진행된 뒤 Scene 1을 숨깁니다.
  if (
    time >= SCENE23_TIMELINE.scene1ToMilkywayEnd &&
    !scene1Screen.hidden
  ) {
    scene1Screen.hidden = true;
    scene1Screen.style.filter = "blur(0px)";
    scene23Screen.style.filter = "blur(0px)";
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
      console.error("Scene 2/3 핵심 에셋을 불러오지 못했습니다.");
      renderScene14();
      return;
    }
  }

  if (token !== activeSceneToken) return;

  resetScene23();

  // Scene 1 마지막 프레임 위에 Scene 2를 겹쳐서 crossfade.
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
  // Scene 1 / Scene 2-3 / Scene 4 모두 절대시간 기반이므로
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
