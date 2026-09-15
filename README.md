# Scene 2 + Scene 3 시작부 v7

이번 수정은 사용자가 요청한 아래 3가지를 반영한 버전입니다.

## 1) Scene 2 시작 은하수 배경
- 시작 구도를 현재 '화면에 딱 맞는 배치' 기준으로 유지한 뒤
- **좌측 하단을 고정점으로 1.15배 확대**
- 즉 왼쪽 아래는 고정되고, 이미지가 위/오른쪽 방향으로 커집니다.

설정:
- `MILKYWAY_BASE_SCALE = 1.15`
- anchor = `(0, 100)`

## 2) Scene 1 → Scene 2 전환
- 기존 약 0.9초 crossfade를 **약 2.2초**로 확장
- Scene 1이 더 오랫동안 천천히 희미해지고
- Scene 2 은하수가 동시에 서서히 드러나도록 조정
- 같은 은하수를 겹쳐 보고 있다는 느낌을 강화하기 위한 수정

## 3) Scene 3 전환
- 기존보다 더 명확하게
- **중앙 이동과 전체 줌아웃이 동시에** 진행되도록 정리
- `clusterZoomOutStart = clusterMatchStart = 10000`
- 즉 Scene 3 시작부에서 타깃 은하 중심 → 화면 중앙 이동과
  14배 → 1배 zoom out이 같은 타이밍에 시작

## Scene 2/3 주요 시간
Scene 2 시작 = 0초 기준

- 0.0~2.2s : Scene 1 → Milky Way 긴 crossfade
- 2.2~5.2s : Milky Way 시작 구도 유지
- 5.2~8.5s : Milky Way target Zoom In
- 6.7~8.5s : Closeup galaxy crossfade
- 8.5~10.0s : Closeup galaxy hold
- 10.0~11.1s : Closeup → Cluster match dissolve
- 10.0~13.8s : Cluster 중앙 이동 + Zoom Out 동시 진행
- 13.8~15.8s : Scene 3 도착 화면 hold

## 핵심 변경 파일
- `index.html`
- `js/mobile-scene23-v7.js`
- `README.md`

