# v19 Stylish 폰트 진단/적용본

이번 버전은 업로드한 `Stylish-Regular.ttf`를 사용합니다.

## 중요한 차이
폰트를 별도 경로에서 불러오지 않습니다.
TTF를 WOFF2로 변환한 뒤 `common.css` 안에 직접 임베드했습니다.

따라서 이 버전에서 폰트가 적용되지 않는다면 아래 원인들은 사실상 배제할 수 있습니다.
- `assets/fonts/...` 경로 오류
- GitHub Pages의 폰트 파일 404
- 폰트 파일 캐시
- 별도 폰트 파일 CORS 문제

## 적용 방식
- 폰트명: `StylishEmbedded`
- 모바일 앱 전체에 `font-family`를 명시적으로 강제 적용
- debug badge만 system font 유지
- CSS 캐시 버전: `font-v19-stylish`

## 진단 페이지
배포 후 메인 주소 뒤에 `/font-test.html`을 열어보세요.
예: `.../unknown-world/font-test.html`

페이지 하단에
`StylishEmbedded 폰트가 브라우저에 정상 로드되었습니다.`
라고 나오면 브라우저의 폰트 엔진은 정상입니다.

그 페이지에서는 Stylish 샘플과 시스템 폰트를 동시에 보여주므로 육안 비교도 가능합니다.
