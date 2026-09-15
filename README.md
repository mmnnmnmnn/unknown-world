# Scene 2 + Scene 3 시작부 v9

이번 버전은 v8에서 다음을 수정했습니다.

## 1. 은하 이미지 회전
- 기존: 0.10초
- 변경: **0.25초**
- 회전 시작: 11.20s
- 회전 정지: 11.45s
- 회전이 끝난 뒤에는 각도를 고정하고 더 이상 회전하지 않습니다.

## 2. 은하 이미지 Fade-out
- 기존: 약 1.5초
- 변경: **약 2.0초**
- 11.45s ~ 13.45s 동안 천천히 사라집니다.
- 이 구간에서는 은하 이미지의 회전이 멈춘 상태입니다.
- 은하단 이미지는 아래에서 같은 위치에 점차 나타납니다.
- 카메라 이동 / Zoom Out은 아직 시작하지 않습니다.

## 3. 은하단 Zoom Out
- closeup galaxy가 완전히 사라진 뒤인 13.45s부터 시작
- 13.45s ~ 17.25s 동안 중앙 이동 + Zoom Out
- 17.25s ~ 19.25s 은하단 전체 화면 유지

## 4. 글씨체 변경
- 기존 ACC Children Fall → **배달의민족 연성(BM YEONSUNG)**
- 파일: `assets/fonts/BMYEONSUNG.ttf`
- 모바일 웹 전체 기본 글꼴에 적용
- 개발용 debug badge는 식별성을 위해 system font 유지

## 변경 파일
- `index.html`
- `css/common.css`
- `js/mobile-scene23-v9.js`
- `assets/fonts/BMYEONSUNG.ttf`
