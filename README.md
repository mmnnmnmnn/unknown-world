# clean v6 — Scene 5 영상 속도 복원

Scene 5 타임라인은 v5와 동일하게 유지하고,
타임랩스 영상 재생속도만 원래 속도인 1.0배로 복원했습니다.

- Scene 4 → 5 전환: 0.0~2.2초
- 타임랩스 시작: 2.2초
- 타임랩스 재생속도: 1.0배
- `아직 오지 않은 미래.` 등장 시작: 4.0초
- 문구 blur → sharp 완료: 4.8초
- Scene 5 종료: 8.2초

영상 1회 길이가 약 3.04초이므로,
2회차 영상이 완전히 끝나기 약 0.08초 전에 Scene 5가 종료됩니다.
따라서 마지막 프레임에서 정지한 채 기다리는 구간이 없습니다.


## v7 scene5 fallback fix
- Scene 5 fallback image replaced with the newly provided valley landscape image.
- Scene 5 debug badge updated to CLEAN V7.
- Cache-busting query strings updated so the latest HTML/CSS/JS load correctly.
