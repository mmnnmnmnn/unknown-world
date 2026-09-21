# Admin v26 — 상시 질문 관리

주소:
`https://<GitHub사용자명>.github.io/unknown-world/admin/`

관리자 로그인은 기존과 동일합니다.
- Firebase Authentication Email/Password
- 관리자 이메일: `admin@unknown-world.app`
- 비밀번호는 GitHub 코드에 저장되지 않습니다.

## 기능
- 전체/승인/차단/보류/숨김 통계
- 상태 필터
- KST 시작일/종료일 필터
- 질문·판정 사유 검색
- 현재 필터 목록 CSV 다운로드
- `숨김`: 원본은 보존하고 대형 화면에서만 제거
- `영구삭제`: 원본과 공개 데이터를 모두 삭제
- `전체 질문 영구삭제`: `전체삭제` 확인 문구 필요

## 제거된 기능
- 이름/닉네임
- 테스트 질문 생성
- 추첨/당첨 이력
- 참여 라운드 초기화

## Firebase Rules
`database.rules.json`을 Firebase Console → Realtime Database → Rules에 게시합니다.
- 일반 브라우저 Firebase 직접 쓰기 차단
- Worker 계정(`worker@unknown-world.app`)이 원본 저장/검열 갱신/승인 질문 공개
- 관리자 계정이 조회/숨김/삭제
- 대형 화면은 `publicResponses`만 공개 읽기
