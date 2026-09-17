# unknown-world-clean-v22-scene4-5-bridge-image

변경 사항
- Scene 4 → 5 전환용 통로 이미지를 새 이미지로 교체했습니다.
- 기존 전환 로직/애니메이션은 유지했습니다.
- 브라우저 캐시로 이전 통로 이미지가 남지 않도록 파일명을 `scene4-5-bridge-v22.png`로 변경하고, `js/mobile.js`에서 해당 파일을 읽도록 수정했습니다.
- `index.html`의 캐시 버전 문자열도 `mobile-v22-scene4-5-bridge-image`로 갱신했습니다.

덮어쓰기 필요 파일
- `index.html`
- `js/mobile.js`
- `assets/scene05-future/scene4-5-bridge-v22.png`

비고
- 기존 `scene4-5-bridge.png`는 폴더에 남아 있어도 동작에는 문제 없습니다. 현재 코드는 `scene4-5-bridge-v22.png`만 사용합니다.


## Mobile v23 — 닉네임 → 이름 표기 변경
- 마지막 입력 페이지의 사용자 표기를 `닉네임`에서 `이름`으로 변경했습니다.
- 유효성 안내 문구도 `이름은 1~10자로 입력해주세요.`로 변경했습니다.
- 기존 Firebase 내부 필드명 `nickname`은 호환성을 위해 그대로 유지합니다.
