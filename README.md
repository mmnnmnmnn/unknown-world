# Font Fix v18

이번 패치는 UnTaza 폰트가 실제 화면에서 적용되지 않는 문제를 보강합니다.

적용 내용:
- `@font-face` 별칭을 `UnTazaWeb`으로 새로 정의
- 400 / 500 / 700 weight를 같은 TTF에 명시적으로 매핑
- `:root` 상속에만 의존하지 않고 모바일 앱 UI 요소에 폰트를 명시적으로 강제 적용
- 개발용 debug badge만 system font 유지
- 폰트 URL에 `?v=18`을 붙여 폰트 파일 캐시도 무효화
- `<link rel="preload">`로 폰트를 페이지 로드 초기에 미리 요청
- CSS cache-busting도 `scene4-v18`로 갱신

중요:
기존 저장소의 아래 파일은 그대로 있어야 합니다.
`assets/fonts/UnTaza.ttf`

이 패치에는 폰트 파일을 다시 포함하지 않았습니다. 이미 업로드한 원본 UnTaza.ttf를 그대로 사용합니다.
