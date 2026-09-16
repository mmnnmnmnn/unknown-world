# unknown-world — clean build v2 / Scene 5

기준 기능: clean build v1의 Scene 1~4 + UnTaza + 새 Scene 5.

## Scene 5
- 문구: `아직 오지 않은 미래.`
- 영상: `assets/scene05-future/future-timelapse.mp4`
- 영상 길이: 약 3.04초 / 400×736 / H.264
- 영상은 반복하지 않고 한 번 재생한 뒤 마지막 프레임에서 멈춥니다.
- 영상 재생 실패 시 `future-fallback.jpg`로 자동 대체합니다.

## Scene 4 → 5 전환
- 총 2.2초
- Scene 3 → 4의 1.4초 전환보다 길게 설정
- Scene 4가 왼쪽으로 밀리며 blur + darkening
- Scene 5가 오른쪽에서 들어오며 blur → sharp
- 중간에 어두운 이동 띠를 짧게 사용해 두 장면을 연결

## Scene 5 타임라인
- 0.00~2.20s: Scene 4 → 5 전환 + 타임랩스 재생
- 약 3.04s: 타임랩스 재생 종료, 마지막 프레임 유지
- 3.20~4.00s: `아직 오지 않은 미래.` 등장
- 4.00~7.40s: 문구 완전 표시 3.4초
- 7.40s: 현재 개발 단계에서는 Scene 14 입력 화면으로 임시 이동

## 유지된 기능
- Scene 1~4 clean build v1 동작 유지
- Scene 3 저해상도 은하단 롤백 유지
- UnTaza WOFF2 CSS 임베드 유지
- Firebase 및 제출 기능 유지
