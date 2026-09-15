# Scene 2 + Scene 3 마무리 v11

이번 버전 변경사항:

## 1. Scene 3 텍스트 위치 변경
- `"보이지 않는 우주,"` 텍스트를 하단 영역에서
  **화면 중앙**으로 이동
- 기존: `bottom: 14%`
- 변경: `left: 50%`, `top: 50%`, `translate(-50%, -50%)`
- 기존과 동일하게 살짝 아래에서 올라오며 페이드인

## 2. 기본 글꼴 변경
- 기존: BM YEONSUNG
- 변경: **MaruBuri Bold**
- 파일: `assets/fonts/MaruBuri-Bold.ttf`
- 전체 기본 UI 텍스트와 Scene 3 타이틀에 적용
- 디버그 배지는 가독성을 위해 system font 유지

## 변경 파일
- `index.html`
- `css/common.css`
- `js/mobile-scene23-v11.js`
- `assets/fonts/MaruBuri-Bold.ttf`
- `README.md`
