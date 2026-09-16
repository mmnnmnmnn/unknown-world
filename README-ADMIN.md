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
