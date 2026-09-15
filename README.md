# Scene 2 + Scene 3 시작부 v8

## 이번 수정

### 1. Milky Way 확대 중심
- 기존 중앙 근처 확대 대신 **(45,55)** 좌표를 향하도록 변경
- 시작 상태의 좌측 하단 고정 1.15배 확대는 그대로 유지
- 확대량:
  - 기존 약 4.4배
  - **3.15배로 감소**
- 확대 시간:
  - 5.2s ~ 9.7s
  - 이전보다 느리고 길게 진행

### 2. 중간 은하 이미지 등장
- Milky Way 확대가 진행 중인 **7.2s부터**
  `galaxy-closeup-transition.png`가 서서히 나타남
- 9.7s에 전환 완료
- 즉 확대가 끝난 뒤 갑자기 이미지가 바뀌는 것이 아니라,
  확대 중간에 자연스럽게 중간 이미지가 겹쳐 나타남

### 3. Closeup galaxy → Galaxy cluster
사용자 피드백에 따라 동시 진행을 제거함.

#### 11.2 ~ 11.3s
- closeup galaxy 회전
- **0.1초 동안만**
- 이전 영상에서 형태가 정확히 겹치던 시점의 각도(약 1°)에서 회전 정지

#### 11.3 ~ 12.8s
- 회전은 더 이상 진행하지 않음
- closeup galaxy가 같은 위치/각도에서 천천히 fade out
- 아래의 galaxy cluster target은 같은 위치에서 fade in
- 이 구간에는 카메라 이동/zoom out 없음

#### 12.8 ~ 16.6s
- closeup galaxy가 완전히 사라진 뒤
- galaxy cluster 카메라 이동 시작
- 타깃 은하 `(64.03,31.92)` → 화면 중앙 `(50,50)`
- 동시에 14배 → 1배 Zoom Out
- Zoom은 로그/지수 보간을 사용하여 고배율에서 더 자연스럽게 전환

#### 16.6 ~ 18.6s
- 은하단 전체 화면 유지

## Scene 2/3 전체 타임라인
- 0.0~2.2s : Scene 1 → Milky Way crossfade
- 2.2~5.2s : Milky Way 시작 구도 유지
- 5.2~9.7s : `(45,55)`를 향해 느린 Zoom In
- 7.2~9.7s : 중간 은하 이미지 Crossfade
- 9.7~11.2s : Closeup galaxy 유지
- 11.2~11.3s : Closeup galaxy 0.1초 회전
- 11.3~12.8s : 회전 정지 상태에서 Closeup fade out / Cluster fade in
- 12.8~16.6s : Cluster 중앙 이동 + Zoom Out
- 16.6~18.6s : Scene 3 도착 화면 유지

## 핵심 변경 파일
- `index.html`
- `js/mobile-scene23-v8.js`
- `README.md`
