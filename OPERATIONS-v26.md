# v26 운영 체크리스트

1. Cloudflare Worker Preview 버전이 `2026-09-21-v9-conservative-final`인지 확인
2. Firebase Realtime Database Rules를 `database.rules.json` 기준으로 게시
3. GitHub Pages에 v26 파일 업로드
4. 모바일에서 정상 질문 1건 제출 → responses + publicResponses 확인
5. 차단 질문 1건 제출 → responses만 존재하는지 확인
6. 같은 브라우저에서 당일 재제출이 막히는지 확인
7. `/display/`에서 신규 질문 중앙 4초 강조 확인
8. `/admin/`에서 숨김 → display 즉시 제거 확인
9. `/admin/`에서 영구삭제 → responses/publicResponses 모두 제거 확인
10. CSV 다운로드 확인
11. display 브라우저 네트워크 끊기/복구 후 실시간 갱신 확인
12. 질문이 100개를 넘을 때 화면은 최신 100개만 유지되는지 확인

참고: 기존 `participationState`, `displayState` 데이터가 Firebase에 남아 있어도 v26 코드는 사용하지 않습니다.
원하면 운영 안정화 후 콘솔에서 수동 정리할 수 있습니다.
