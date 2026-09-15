# 개막식 참여형 웹콘텐츠 — 2단계

이 폴더는 전체 프로젝트의 **2단계 모바일 입력/완료 흐름 구현 코드**입니다.

## 이번 단계에서 구현한 범위

- 시작 화면(입장하기 버튼)
- 시작 화면 → 입력 화면(Scene 14) 연결
- Scene 14 최종 입력 화면 UI
- 닉네임 1~10자 / 질문 1~20자 검증
- Firebase Realtime Database 저장
- `responses` / `publicResponses` 데이터 분리 유지
- 동일 브라우저 1회 제출 제한(localStorage)
- 제출 완료 상태 UI
- 제출 완료 후 별 애니메이션
- `[애니메이션 다시 보기]` 버튼
- 이미 참여한 브라우저의 재입장 시 재제출 차단
- 대형 모니터 임시 페이지는 1단계 기능 유지

## 아직 구현하지 않은 것

- Scene 1~13 실제 애니메이션
- 시작 화면 이후의 본격적인 타임라인 애니메이션
- visibilitychange 기반 일시정지/복원
- 관리자 페이지
- 관리자 비밀번호 인증
- 추첨 및 displayState
- 대형 모니터 별자리형 배치 / Star-only Mode

## 현재 사용자 흐름

1. 시작 화면에서 `[입장하기]`
2. 2단계용 연결 화면(짧은 전환)
3. Scene 14 입력 화면
4. 제출 성공 시 완료 상태 및 별 애니메이션
5. `[애니메이션 다시 보기]` 또는 `[처음 화면으로]`
6. 다시 입장할 수는 있지만 같은 브라우저에서는 재제출 불가

## 변경된 주요 파일

- `index.html`
- `css/common.css`
- `js/mobile.js`

대형 모니터용 `display/index.html`, `js/display.js`, `database.rules.json`은 1단계 구조를 유지합니다.

## GitHub 반영 방법

기존 저장소에 아래 파일만 덮어써도 됩니다.

- `index.html`
- `css/common.css`
- `js/mobile.js`
- `README.md`

업로드 후 GitHub Pages는 잠시 뒤 자동 반영됩니다.
