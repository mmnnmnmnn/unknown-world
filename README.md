# 개막식 참여형 웹콘텐츠 — 3단계 (Scene 1)

이번 버전은 **Scene 1: 우주 탐험**을 실제 에셋으로 구현한 테스트 버전입니다.

## 구현된 흐름

`시작 화면 → [입장하기] → Scene 1 약 12초 → Scene 14`

Scene 2는 아직 만들지 않았기 때문에 Scene 1 종료 후 **임시로 Scene 14로 연결**됩니다.
다음 단계에서 Scene 2를 제작하면 `renderScene14()` 호출을 Scene 2 진입으로 교체합니다.

## Scene 1 구현 내용

1. 지구본 등장
2. 카메라 하단 이동·확대
3. 망원경 관측자 등장
4. 우주선 등장
5. 우주선 점화(Idle → Launch)
6. 좌·우·소형 구름 확산
7. 카메라 Zoom Out + 전체 콜라주 공개
8. 우주선 곡선 비행
9. 카메라가 우주선 이동을 느슨하게 추적
10. 카메라 중앙 복귀
11. Scene 2 Match Cut을 위한 Anchor 상태로 정리

## 기술 구조

- `sceneCamera`: 가상 카메라 이동/확대
- `backgroundDrift`: 우주 배경 자체의 느린 부유
- 개별 오브젝트: 서로 독립된 transform / opacity
- Web Animations API 사용
- Scene 전체 길이: `12000ms`
- `visibilitychange` 감지:
  - 다른 앱/탭으로 이동 시 Scene 1 일시정지
  - 복귀 시 이어서 재생
- 시작 화면에서 Scene 1 에셋 사전 로딩
- 핵심 에셋 로딩 실패 시 빈 화면에서 멈추지 않고 Scene 14로 이동

## 추가된 에셋

```text
assets/
├─ fonts/
│  └─ acc-children-fall.ttf
└─ scene01-space/
   ├─ star-chart-bg.png
   ├─ globe.png
   ├─ telescope-observer.png
   ├─ rocket-idle.png
   ├─ rocket-launch.png
   ├─ propulsion-beam.png
   ├─ cloud-left.png
   ├─ cloud-right.png
   ├─ cloud-small.png
   ├─ lady-on-star.png
   ├─ deity-figure.png
   ├─ moth.png
   ├─ moon.png
   └─ saturn.png
```

## GitHub에 반영할 것

이번에는 기존 코드만 교체하는 것이 아니라 **assets 폴더도 새로 추가**해야 합니다.

가장 안전한 방법:

1. ZIP 압축 해제
2. 기존 GitHub 저장소에서
   - `index.html`
   - `css/common.css`
   - `js/mobile.js`
   - `README.md`
   를 새 버전으로 교체
3. `assets/` 폴더 전체를 저장소 루트에 추가
4. `display/`, `js/display.js`, `js/firebase-config.js`, `database.rules.json`은 기존 버전을 유지해도 됩니다.

ZIP 전체를 저장소 루트에 그대로 덮어 올려도 됩니다.

## 테스트 체크리스트

### 첫 진입
- 시작 화면이 별자리 우주 배경으로 표시되는가
- `입장하기`를 누르면 Scene 1이 시작되는가
- 약 12초 후 Scene 14로 자동 이동하는가

### Scene 1
- 지구본 → 관측자 → 로켓 순으로 등장하는가
- 로켓이 Idle 이미지에서 점화 이미지로 전환되는가
- 점화 시 구름이 퍼지는가
- 중반부에 카메라가 Zoom Out되며 장식 오브젝트가 나타나는가
- 로켓이 화면 아래 우측에서 위쪽으로 날아간 뒤 좌측 방향으로 이동하는가
- 마지막에 카메라가 중앙으로 복귀하는가

### 앱 전환
- Scene 1 재생 중 홈 화면/다른 앱으로 이동
- 복귀 시 Scene 1이 건너뛰지 않고 이어서 재생되는가

### 참여 완료 브라우저
- 애니메이션은 다시 재생 가능한가
- Scene 14 도달 시 재제출은 제한되는가

## 조정 예정

Scene 1의 오브젝트 위치·속도·카메라 배율은 **실제 스마트폰에서 시각적으로 확인한 뒤 수정하는 단계**입니다.
현재는 개발요청서의 순서와 장면 참고 이미지에 맞춘 1차 구현입니다.
