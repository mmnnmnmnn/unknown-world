# Scene 2 + Scene 3 시작부 v6

이번 버전은 기존 Scene 1 v5 뒤에 다음 장면을 연결합니다.

## Scene 2
1. Scene 1 마지막 전체 화면에서 은하수 이미지로 약 0.9초 Crossfade
2. 은하수 전체 화면 약 3초 유지
3. 밝은 밀집 영역을 향해 부드럽게 Zoom In
4. 확대 과정에서 `galaxy-closeup-transition.png`로 Crossfade
5. 확대된 은하를 잠시 유지

## Scene 2 → Scene 3
사용자가 노란 원으로 지정한 은하를 Scene 3의 기준점으로 사용합니다.

- 원본 `galaxy-cluster-bg.png` 기준 타깃 좌표:
  - x ≈ 64.03
  - y ≈ 31.92

이 값은 사용자가 표시한 900×1601 주석 이미지에서
노란 표시의 중심을 계산하여 원본 941×1672 이미지 좌표로 환산한 값입니다.

전환:
1. closeup galaxy가 회전·축소
2. 같은 화면 중앙에 Scene 3 타깃 은하가 나타나도록 Crossfade
3. `galaxy-cluster-bg.png`는 타깃을 중심으로 약 14배 확대된 상태에서 시작
4. 약 3.6초 동안 빠르게 Zoom Out
5. 최종적으로 은하단 전체 화면에 도착
6. 약 2초간 Scene 3 도착 화면 유지

현재 개발 단계에서는 그 뒤 임시로 Scene 14 입력 화면으로 이동합니다.

## 주요 시간
Scene 2/3 타임라인은 Scene 2 시작 = 0초 기준:

- 0.0~0.9s : Scene 1 → Milky Way Crossfade
- 0.9~3.9s : Milky Way 전체 유지
- 3.9~7.0s : Milky Way Zoom In
- 5.2~7.0s : Closeup galaxy Crossfade
- 7.0~8.4s : Closeup galaxy 유지
- 8.4~9.4s : Closeup → Cluster target Match Dissolve
- 9.0~12.6s : Cluster target → 전체 은하단 Zoom Out
- 12.6~14.6s : Scene 3 도착 화면 유지

## 새 에셋
- `assets/scene02-milkyway/milkyway-bg.png`
- `assets/scene02-milkyway/galaxy-closeup-transition.png`
- `assets/scene03-galaxy-cluster/galaxy-cluster-bg.png`

## GitHub 반영
ZIP 전체를 저장소 루트에 덮어쓰기 하는 것을 권장합니다.

주요 파일:
- `index.html`
- `css/common.css`
- `js/mobile-scene23-v6.js`
- 위 Scene 2/3 asset 3개
