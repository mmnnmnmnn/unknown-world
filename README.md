# unknown-world — clean build v1

기준 기능: Scene 1~4의 v23 확정 동작 + UnTaza WOFF2 CSS 임베드 방식.

## 이번 clean build에서 한 일
- 활성 모바일 JS를 `js/mobile.js` 하나로 통합했습니다.
- 과거 버전 JS(`mobile-scene4-v15/v17/v20/v22/v23.js`)는 배포본에서 제거했습니다.
- 미사용 Scene 1 asset(`globe.png`, `moon.png`, `propulsion-beam.png`)을 제거했습니다.
- 미사용 Scene 2 이전 중간은하 이미지(`galaxy-closeup-transition.png`)를 제거했습니다.
- 과거 폰트 파일과 폰트 테스트 페이지를 제거했습니다.
- 과거 버전 README 파일을 제거했습니다.
- Scene 3 고해상도 은하단 이미지는 포함하지 않았습니다.
- `index.html`의 CSS/JS cache-busting 값을 `clean-v1`로 통일했습니다.

## 중요
애니메이션 로직 자체는 v23의 활성 JS를 그대로 `js/mobile.js`로 복사했습니다.
즉 clean build는 기능 변경이 아니라 파일 구조/배포 구조 정리입니다.

UnTaza 폰트는 현재 정상 동작이 확인된 방식을 유지하기 위해 `css/common.css` 내부 WOFF2 data URI로 임베드되어 있습니다.
