# Unknown World v26 — 상시운영형 통합본

`v25-hide-debug-badges`를 기준으로 상시 전시 운영 구조로 개편한 버전입니다.
기존 Scene 1~14 애니메이션, Scene 7 건너뛰기 진입, Scene 14 키보드 안정화 로직은 유지했습니다.

## 모바일 `/`
- 이름 입력 제거: 질문만 익명 제출
- 질문 최대 35자
- 제출 경로: 브라우저 → Cloudflare Worker `/submit` → Firebase
- 브라우저당 KST 기준 하루 1회 참여
  - Firebase `.info/serverTimeOffset`을 이용해 서버 시간 기준을 우선 사용
  - 서버 시간 확인 실패 시 기기 KST로 폴백
- 안내 문구: `부적절한 내용이 포함된 질문은 표시되지 않을 수 있습니다.`
- 승인/차단/보류 여부와 관계없이 질문이 서버에 정상 접수되면 해당 브라우저는 그날 참여 완료 처리
- 다음 날 KST 00:00 이후 자동으로 다시 참여 가능

Worker URL:
`https://unknown-world-moderation.oja34.workers.dev/submit`

## 대형 화면 `/display/`
- 추첨/당첨자 기능 완전 제거
- `publicResponses` 중 `createdAt` 기준 최신 100개만 실시간 구독
- 101번째 질문이 추가되면 가장 오래된 질문은 화면 DOM에서 자동 제외되며 원본 DB에는 남음
- 신규 질문은 기존처럼 중앙에서 약 4초간 크게 표시된 뒤 질문장에 합류
- Firebase 재연결은 SDK 실시간 listener가 자동 처리
- 화면 DOM은 최대 100개 질문으로 제한
- 중앙 하단 고정 문구: `관람객이 남기고 간 질문들`
  - Windows `Gungsuh/궁서` 우선, 없으면 `Batang/바탕`, serif 폴백

## 관리자 `/admin/`
- 추첨/테스트데이터/참여라운드 기능 제거
- 전체 질문 원본 조회
- 승인 / 차단 / 보류 / 관리자 숨김 통계 및 필터
- 날짜 범위, 질문·판정 사유 검색
- 숨김: `responses/{id}/hidden = true`, `publicResponses/{id}`만 제거
- 영구삭제: `responses`와 `publicResponses` 모두 삭제
- 숨김 복원 기능 없음
- 현재 필터 결과 CSV 다운로드
- CSV 수식 실행 위험을 줄이기 위해 `=`, `+`, `-`, `@`로 시작하는 셀은 안전 처리

## Firebase 데이터 구조
### `responses/{id}`
모든 제출 원본과 검열 상태를 저장합니다.

주요 필드:
- `question`
- `createdAt`
- `kstDate`
- `moderationStatus`: `approved | blocked | pending`
- `moderationReasonCode`
- `moderationReason`
- `moderationSource`
- `moderatedAt`
- `hidden`

### `publicResponses/{id}`
검열 통과 + 관리자 숨김이 아닌 질문만 존재합니다.
- `question`
- `createdAt`

## 배포
GitHub 저장소 루트에 이 폴더의 **내용물**을 업로드/덮어쓰기 합니다.
폴더 자체를 한 단계 더 중첩해 올리지 마세요.

`database.rules.json`은 GitHub Pages가 자동 적용하지 않습니다.
Firebase Console → Realtime Database → Rules에서 별도로 게시해야 합니다.
