# Admin v1

관리자 페이지 주소:

`https://<GitHub사용자명>.github.io/unknown-world/admin/`

## 최초 1회 Firebase 설정

관리자 비밀번호는 GitHub 코드에 저장하지 않습니다.
Firebase Authentication이 서버에서 비밀번호를 검증합니다.

### 1. Firebase Authentication 활성화
Firebase Console → Authentication → Sign-in method → Email/Password 활성화

### 2. 관리자 계정 생성
Firebase Console → Authentication → Users → Add user

- Email: `admin@unknown-world.app`
- Password: 원하는 관리자 비밀번호

관리자 화면에는 이메일 입력란이 없고 비밀번호만 입력합니다.
코드에는 관리자 이메일만 공개되어 있으며, 비밀번호는 포함되지 않습니다.

### 3. Realtime Database Rules 교체
프로젝트의 `database.rules.json` 내용을 Firebase Console → Realtime Database → Rules에 붙여넣고 Publish 합니다.

새 규칙은:
- 모바일 사용자의 신규 질문 제출 허용
- `publicResponses` 공개 읽기 허용
- `responses`의 닉네임/전체 정보는 관리자 계정만 읽기 허용
- 응답 삭제/수정, 테스트 데이터 생성, 추첨 상태 변경은 관리자 계정만 허용

## 관리자 기능
- 전체/실제/테스트/당첨 응답 수
- 응답 검색 및 필터
- 개별 삭제
- 테스트 질문 10 / 50 / 100개 생성
- 테스트 데이터만 전체 삭제
- 실제 응답만 기본 추첨
- 필요 시 테스트 응답 포함 추첨
- 당첨 질문을 `/display/`에 15초간 표시
- 시각화 즉시 복귀
- 당첨 이력 초기화
- 전체 응답 삭제: `전체삭제` 문구 재입력 필요

## 테스트 데이터
테스트 응답에는 `isTest: true`가 저장되므로 실제 응답과 구분하여 삭제할 수 있습니다.


## Admin v2 — 전체 응답 삭제 오류 수정
기존 전체 삭제는 `/responses`와 `/publicResponses` 부모 노드를 한 번에 삭제하려 해
현재 Firebase Rules와 권한 경로가 맞지 않을 수 있었습니다.

수정본은 관리자 화면에 로드된 각 응답 ID별로
`responses/{id}`와 `publicResponses/{id}`를 동시에 삭제합니다.

따라서 기존 Firebase Rules를 다시 수정하거나 게시할 필요가 없습니다.


## Admin v3 — 전체 참여 제한 초기화
- `전체 참여 제한 초기화` 버튼을 추가했습니다.
- 누르면 `participationState/version`이 1 증가합니다.
- 기존 `responses` / `publicResponses` 데이터는 삭제되지 않습니다.
- 참여했던 브라우저는 새 라운드를 감지하면 다시 질문을 제출할 수 있습니다.
- 새 기능을 사용하려면 이번 `database.rules.json`으로 Realtime Database Rules를 다시 게시해야 합니다.
