# Scene 4 — 닿을 수 없는 심해 v14

v13(Scene 1~3 완성본)에 Scene 4 전체 연출을 연결한 버전입니다.

## Scene 3 → Scene 4 전환
총 약 **1.4초**의 암흑 통로 전환을 사용합니다.

- Scene 3 은하단은 위쪽으로 밀려나며 blur / darken / fade
- 중간은 완전한 정지 암전이 아니라 아주 짙은 남청색 암흑 통로
- 후반에는 Scene 4 심해 상단이 아래쪽에서 흐릿하게 등장
- Scene 4는 `blur → sharp`로 점점 선명해짐
- 별도 이미지 asset 없이 CSS gradient로 통로 연출

## Scene 4 카메라
- 세로형 `deepsea-bg.png` 상단에서 시작
- `1.4s ~ 7.2s` : 카메라가 심해 바닥까지 하강
- `7.2s ~ 10.0s` : 바닥 부근 유지
- `10.0s ~ 14.5s` : 다시 상승
- 상승 종료 위치는 전체 배경의 약 중앙 부근

## 물고기 떼 A
- `2.2s` 등장
- 좌측 → 우측 하단 약 15° 방향
- 첫 **2초는 천천히**
- `4.2s`부터 가속
- `5.3s` 우측 하단 화면 밖으로 퇴장

## 물고기 떼 B
- 동일한 `fish-school.png`를 **좌우 반전**
- `3.9s` 등장
- 우측 → 좌측
- 첫 **2초는 천천히**
- `5.9s`부터 가속
- `7.0s` 좌측 화면 밖으로 퇴장

## 고래
- 심해 바닥 도달 후 `7.35s`부터 등장
- 왼쪽 → 오른쪽으로 천천히 유영
- 이동 중 위아래로 약하게 부유
- `11.5s`까지 진행

## 대왕오징어
- 카메라 상승과 함께 `10.15s`부터 오른쪽에서 등장
- 오른쪽 → 왼쪽 이동
- 이동하며 점차 작아짐
- 계속 위아래로 약하게 부유
- `13.2s` 중앙 부근에서 좌우 반전
- 이후 우측 상단으로 빠르게 퇴장
- `14.5s` 완전 퇴장

## 마지막 문구
- `14.9s ~ 15.6s` :
  **"닿을 수 없는 심해,"**
- 화면 중앙에서 `blur → sharp`로 등장
- `15.6s ~ 19.0s` : 3.4초 유지
- 현재는 Scene 5 개발 전이므로 이후 임시로 질문 입력 화면으로 이동

## Scene 4 assets
- `assets/scene04-deepsea/deepsea-bg.png`
- `assets/scene04-deepsea/fish-school.png`
- `assets/scene04-deepsea/giant-squid.png`
- `assets/shared/whale.png`

## 주요 변경 파일
- `index.html`
- `css/common.css`
- `js/mobile-scene4-v14.js`
- Scene 4 asset 4개
- `README.md`
