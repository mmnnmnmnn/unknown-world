# 개막식 참여형 웹콘텐츠 — 1단계

이 폴더는 전체 프로젝트의 **1단계 데이터 연결 검증용 코드**입니다.

현재 구현 범위:

- GitHub Pages에서 동작하는 모바일 임시 입력 페이지
- Firebase Realtime Database 저장
- `responses` / `publicResponses` 데이터 분리
- Firebase 서버 타임스탬프 사용
- 동일 브라우저 1회 제출 제한(localStorage)
- 대형 모니터 임시 페이지의 실시간 질문 수신
- 질문 추가/변경/삭제 실시간 반영을 위한 리스너
- 1단계용 Realtime Database Security Rules

아직 구현하지 않은 것:

- 모바일 Scene 1~14 애니메이션
- 실제 대형 모니터 별자리 배치/Star-only Mode
- 관리자 비밀번호 인증
- 관리자 목록·삭제·전체삭제
- 추첨 및 `displayState`
- 최종 관리자 권한 Rules
- 실제 행사 디자인/에셋 적용

---

## 폴더 구조

```text
opening-web-stage1/
├─ index.html
├─ display/
│  └─ index.html
├─ css/
│  └─ common.css
├─ js/
│  ├─ firebase-config.js
│  ├─ mobile.js
│  └─ display.js
├─ database.rules.json
└─ README.md
```

---

# A. Firebase 프로젝트 만들기

## 1) 프로젝트 생성

Firebase Console에 로그인한 뒤 새 프로젝트를 생성합니다.

프로젝트 이름은 자유롭게 정할 수 있습니다.
예: `unknown-world-opening`

Google Analytics는 이 프로젝트의 핵심 기능에 필요하지 않으므로,
원하지 않으면 생성 단계에서 사용하지 않아도 됩니다.

## 2) 웹 앱 등록

프로젝트 개요에서 **웹(</>) 아이콘**을 선택하여 웹 앱을 등록합니다.

앱 닉네임 예:
`opening-web`

Firebase Hosting 설정은 현재 사용하지 않습니다.
이 프로젝트의 정적 웹페이지는 GitHub Pages에서 서비스할 예정입니다.

등록을 완료하면 Firebase가 아래 형태의 설정값을 보여줍니다.

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Realtime Database를 만든 뒤에는 `databaseURL`도 필요합니다.

## 3) Realtime Database 생성

Firebase Console에서:

**Build → Realtime Database → Create Database**

를 선택합니다.

데이터베이스 위치를 선택한 뒤 생성합니다.

처음 만들 때는 가능하면 잠금 상태(locked mode)로 시작하고,
아래 `database.rules.json`의 규칙을 직접 붙여넣어 사용합니다.

Database 화면 상단에 표시되는 URL도 확인합니다.

예:

```text
https://PROJECT_ID-default-rtdb.REGION.firebasedatabase.app
```

실제 URL은 선택한 위치에 따라 달라질 수 있습니다.

---

# B. firebase-config.js 입력

`js/firebase-config.js`를 열고 Firebase Console이 제공한 실제 값으로 교체합니다.

특히 `databaseURL`이 누락되지 않게 확인해주세요.

예:

```js
export const firebaseConfig = {
  apiKey: "실제 값",
  authDomain: "실제 값",
  databaseURL: "실제 Realtime Database URL",
  projectId: "실제 값",
  storageBucket: "실제 값",
  messagingSenderId: "실제 값",
  appId: "실제 값"
};
```

> Firebase 웹 앱의 `firebaseConfig`는 브라우저 클라이언트가 Firebase 프로젝트를 찾기 위한 설정입니다.
> 서비스 계정 private key, 관리자 비밀번호 같은 비밀정보를 이 파일에 넣으면 안 됩니다.

---

# C. Realtime Database Rules 적용

Firebase Console:

**Realtime Database → Rules**

에서 현재 규칙을 모두 지우고,
`database.rules.json`의 내용을 붙여넣은 뒤 **Publish** 합니다.

1단계 규칙의 핵심:

- `responses`
  - 외부 읽기 금지
  - 새 응답 생성만 허용
  - 수정/삭제 금지
- `publicResponses`
  - 대형 모니터에서 읽기 허용
  - 새 응답 생성만 허용
  - 수정/삭제 금지
- 닉네임 1~10자
- 질문 1~20자
- 공백만 입력 금지
- 질문 줄바꿈 금지
- 신규 응답의 `winner`는 반드시 `false`

이 규칙은 **1단계 연결 검증용**입니다.
관리자 인증을 만들 때 관리자 읽기·삭제·당첨 변경 권한을 포함하는 최종 Rules로 교체합니다.

---

# D. 로컬 테스트

ES Module을 사용하므로 `index.html` 파일을 파일 탐색기에서 직접 더블클릭하여
`file://`로 실행하지 말고 간단한 로컬 웹서버를 사용하세요.

Python이 설치되어 있다면 프로젝트 폴더에서:

```bash
python -m http.server 8000
```

브라우저에서:

```text
http://localhost:8000/
http://localhost:8000/display/
```

을 각각 엽니다.

---

# E. 1단계 검증 절차

두 브라우저 창을 동시에 띄웁니다.

1. `/display/`를 먼저 연다.
2. 모바일 임시 페이지 `/`를 연다.
3. 닉네임을 1~10자로 입력한다.
4. 질문을 1~20자로 입력한다.
5. 제출한다.
6. Firebase Console의 Data 탭을 확인한다.
7. `responses/{responseId}`에 닉네임을 포함한 원본이 생겼는지 확인한다.
8. `publicResponses/{responseId}`에는 닉네임 없이 질문이 생겼는지 확인한다.
9. `/display/`에 새 질문이 새로고침 없이 표시되는지 확인한다.
10. 모바일 페이지를 새로고침했을 때 재제출이 차단되는지 확인한다.

정상 저장 예:

```text
responses/
  -ABC123/
    nickname: "혜린"
    question: "외계인은 있을까?"
    createdAt: 178...
    winner: false

publicResponses/
  -ABC123/
    question: "외계인은 있을까?"
    createdAt: 178...
    winner: false
```

---

# F. GitHub Pages에 올리기

Firebase 연결 검증이 끝난 뒤 이 폴더의 내용을 GitHub 저장소 루트에 올립니다.

예:

```text
https://USERNAME.github.io/REPOSITORY/
https://USERNAME.github.io/REPOSITORY/display/
```

GitHub Pages를 켜는 위치는 저장소의 **Settings → Pages**입니다.

---

# G. 테스트 중 같은 브라우저로 다시 제출해야 할 때

현재 1회 제출 제한은 아래 localStorage 키로 관리합니다.

```text
unknown-world-submission-complete
```

개발 테스트 중 재제출해야 하는 경우 브라우저 개발자 도구에서 해당 사이트의
localStorage를 삭제하거나 다른 브라우저/시크릿 창을 사용하세요.

최종 버전에서는 사용자에게 초기화 버튼을 제공하지 않습니다.

---

# 다음 단계

이 1단계가 성공하면 다음 개발에서는:

1. 모바일 Scene 14의 실제 입력/완료 화면
2. 제출 완료 후 `[애니메이션 다시 보기]`
3. 모바일 Scene 1부터 애니메이션 제작
4. 대형 모니터 실제 우주 시각화
5. 관리자 인증 및 추첨

순으로 확장하면 됩니다.
