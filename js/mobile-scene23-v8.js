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
  "./assets/scene02-milkyway/galaxy-closeup-transition.png",
  "./assets/scene03-galaxy-cluster/galaxy-cluster-bg.png"
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

  // 이전보다 확대 시간을 더 길게
  milkywayZoomEnd: 9700,

  // 확대 중간부터 은하 중간 이미지가 서서히 나타남
  closeupFadeStart: 7200,
  closeupReady: 9700,
  closeupHoldEnd: 11200,

  // Scene 2 → Scene 3
  // 회전은 시작 후 0.1초까지만
  closeupRotateStart: 11200,
  closeupRotateEnd: 11300,

  // 회전이 멈춘 뒤 천천히 사라짐
  closeupFadeOutStart: 11300,
  closeupFadeOutEnd: 12800,

  // 은하단 이미지는 같은 위치에서 아래에 나타나며 match
  clusterFadeStart: 11200,
  clusterFadeEnd: 12800,

  // closeup이 완전히 사라진 뒤에만
  // 중앙 이동 + Zoom Out 시작
  clusterZoomOutStart: 12800,
  clusterZoomOutEnd: 16600,

  // Scene 3 도착 후 유지
  scene3ArrivalHoldEnd: 18600
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
  x: 64.03,
  y: 31.92
};

const SCENE23_END = SCENE23_TIMELINE.scene3ArrivalHoldEnd;


/* -------------------------------------------------------
   DOM
------------------------------------------------------- */
const startScreen = document.querySelector("#startScreen");
const scene1Screen = document.querySelector("#scene1Screen");
const scene23Screen = document.querySelector("#scene23Screen");
const scene14Screen = document.querySelector("#scene14Screen");

const scene23Viewport = document.querySelector("#scene23Viewport");
const milkywayLayer = document.querySelector("#milkywayLayer");
const closeupLayer = document.querySelector("#closeupLayer");
const clusterLayer = document.querySelector("#clusterLayer");

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
  scene14Screen.hidden = screen !== "scene14";
}

function renderStartScreen() {
  stopScene1();
  stopScene23();
  revisitNotice.hidden = !isCompletedBrowser();
  loadStatus.textContent = scene1Ready ? "준비 완료" : "장면을 준비하고 있습니다…";
  showOnly("start");
}

function renderScene14() {
  stopScene1();
  stopScene23();
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

  milkywayLayer.style.opacity = "0";
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
  closeupLayer.style.transform = scene23Matrix(
    CLOSEUP_GALAXY_CENTER.x,
    CLOSEUP_GALAXY_CENTER.y,
    1
  );

  clusterLayer.style.opacity = "0";
  clusterLayer.style.transform = scene23Matrix(
    CLUSTER_TARGET.x,
    CLUSTER_TARGET.y,
    14
  );
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

  /* -----------------------------------------------------
     2. Milky Way
     - 좌측 하단 anchor 기준 1.15배 확대 상태로 시작
     - (45,55)를 향해 이전보다 천천히 확대
     - 확대량도 이전보다 줄임
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

    // 기존 4.4배 → 3.15배로 축소
    milkyZoom = lerp(1, 3.15, p);
    milkyX = lerp(50, MILKYWAY_TARGET.x, p);
    milkyY = lerp(50, MILKYWAY_TARGET.y, p);
  }

  const closeupFadeIn = scene23Ease(
    time,
    SCENE23_TIMELINE.closeupFadeStart,
    SCENE23_TIMELINE.closeupReady
  );

  // closeup 전환 전까지 Milky Way 유지,
  // 중간 이미지가 나타나는 만큼 서서히 희미해짐
  milkywayLayer.style.opacity = String(1 - closeupFadeIn * 0.94);
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
     - 11.2초까지 유지
  ----------------------------------------------------- */
  let closeupOpacity = closeupFadeIn;
  let closeupZoom = lerp(1.48, 1.10, closeupFadeIn);
  let closeupRotation = 0;

  /* -----------------------------------------------------
     4. Scene 2 → Scene 3 Match
     A) 11.2~11.3초: 딱 0.1초만 회전
     B) 11.3초 이후: 회전 정지
     C) 11.3~12.8초: 회전한 상태 그대로 천천히 fade out
  ----------------------------------------------------- */
  const rotateP = scene23Ease(
    time,
    SCENE23_TIMELINE.closeupRotateStart,
    SCENE23_TIMELINE.closeupRotateEnd
  );

  // 이전 버전에서 회전 시작 약 0.1초 후 겹친 각도를 보존.
  // 약 1도 정도에서 정지.
  const MATCH_ROTATION_DEG = 1.0;

  if (time >= SCENE23_TIMELINE.closeupRotateStart) {
    closeupRotation = MATCH_ROTATION_DEG * rotateP;
  }

  if (time >= SCENE23_TIMELINE.closeupRotateEnd) {
    closeupRotation = MATCH_ROTATION_DEG;
  }

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
     - 이 구간에는 camera 이동/zoom 없음
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
        중앙 이동 + Zoom Out 동시 진행
  ----------------------------------------------------- */
  if (time >= SCENE23_TIMELINE.clusterZoomOutStart) {
    const zoomOut = scene23Ease(
      time,
      SCENE23_TIMELINE.clusterZoomOutStart,
      SCENE23_TIMELINE.clusterZoomOutEnd
    );

    // Zoom은 선형보다는 지수형에 가까운 보간으로
    // 고배율 → 저배율 전환이 더 자연스럽게 느껴지게 함.
    clusterZoom = Math.exp(
      lerp(
        Math.log(14),
        Math.log(1),
        zoomOut
      )
    );

    // 같은 진행률로 target → 화면 중앙 이동
    clusterX = lerp(CLUSTER_TARGET.x, 50, zoomOut);
    clusterY = lerp(CLUSTER_TARGET.y, 50, zoomOut);
  }

  clusterLayer.style.opacity = String(clusterFade);
  clusterLayer.style.transform = scene23Matrix(
    clusterX,
    clusterY,
    clusterZoom
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
  }

  if (elapsed >= SCENE23_END) {
    scene23Running = false;

    // 현재 개발 단계에서는 Scene 3 도착 화면을 잠깐 보여준 후
    // 임시로 질문 입력 화면으로 이동.
    renderScene14();
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
  // Scene 1 / Scene 2-3 모두 절대시간 기반이므로 별도 애니메이션 객체
  // 동기화가 필요하지 않습니다.
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

  // Scene 1 재생 중 Scene 2/3 에셋도 미리 준비
  preloadScene23();

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
