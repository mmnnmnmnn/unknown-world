# v21 UnTaza WOFF2 진단본

v20에서 UnTaza는 raw TTF를 CSS data URI로 임베드했습니다.
Stylish가 성공한 v19는 WOFF2로 변환한 뒤 CSS에 임베드했습니다.

v21은 이 차이를 제거했습니다.
- UnTaza.ttf → WOFF2 변환
- Stylish와 동일하게 WOFF2 data URI로 common.css 내부 임베드
- static font이므로 font-weight를 400으로 명시
- Scene 3 v20 수정사항은 그대로 유지
- CSS cache key: untaza-woff2-v21

추가 진단 페이지:
`font-test-untaza.html`

이 페이지에서 UnTaza 샘플과 시스템 폰트를 비교할 수 있고,
브라우저 FontFaceSet API의 로드 결과도 함께 표시합니다.
