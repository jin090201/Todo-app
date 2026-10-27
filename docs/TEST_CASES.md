# TEST_CASES - Todo 앱 (초안)

> 기준 문서: docs/PRD.md, docs/TRD.md, docs/DATA_MODEL.md, docs/API_SPEC.md, docs/COMPONENT_SPEC.md
> 상태: 초안. 테스트 코드는 이 문서를 보고 따로 작성한다.

## 0. 공통 규칙
- 도구: API는 pytest + FastAPI TestClient (`backend/tests/`), 컴포넌트는 Jest + React Testing Library (`tests/`)
- 테스트를 삭제하거나 skip하지 않는다. 실패하면 구현 코드를 고친다.
- 테스트 ID 규칙: `영역-번호` (예: `API-03`, `UI-05`). 번호는 영역 안에서 표 순서대로 이어진다
- 문구는 API_SPEC 1-5, COMPONENT_SPEC 4장과 **글자 하나까지** 같아야 한다.

### API 테스트 방법
- FastAPI의 `TestClient`로 서버를 켜지 않고 요청을 보내고, 응답의 상태 코드와 JSON을 확인한다.
- 테스트마다 저장소를 빈 상태로 시작한다.
- 500 케이스는 `backend/app`의 저장 함수가 오류를 던지도록 바꿔치기(pytest `monkeypatch`)해서 만든다.
- v0.2(서버 메모리)와 v0.3(PostgreSQL)에서 **같은 테스트**가 통과해야 한다.

### 컴포넌트 테스트 방법
- 사용자가 실제로 하는 것처럼 입력하고 클릭한다. 요소는 역할과 이름으로 찾는다. (예: 체크박스를 제목으로 찾기)
- `TodoForm`, `TodoList`, `TodoItem`은 Props 콜백을 가짜 함수(mock)로 넣어 호출 여부와 인자를 확인한다.
- `TodoApp`은 `fetch`(또는 `src/lib/todoApi.ts`)를 가짜로 바꿔 서버 응답을 흉내 낸다.

### 자주 쓰는 테스트 값
| 이름 | 값 |
|------|----|
| 100자 | `"가"`를 100번 반복 |
| 101자 | `"가"`를 101번 반복 |
| 이모지 1자 | `"👍🏻"` (`.length`는 4) |
| 이모지 100자 | `"👍🏻"`를 100번 반복 (`.length`는 400) |
| 공백 포함 100자 | `" "` + 100자 + `" "` (공백을 지우면 100자) |

---

## 1. API

### 1-1. 입력 검사 — `NewTodoIn`(Pydantic, 서버) / `newTodoSchema`(Zod, 화면)

같은 규칙이 두 언어로 따로 있으므로(DATA_MODEL 4-2, 4-3), 아래 케이스를 **양쪽에서 모두** 실행한다. 서버는 pytest, 화면은 Jest로 테스트한다.

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| API-01 | 검사 규칙 | `{ title: "우유 사기" }` | 통과. 결과 `title`은 `"우유 사기"` |
| API-02 | 검사 규칙 | `{ title: "  우유 사기  " }` | 통과. 결과 `title`은 `"우유 사기"` (앞뒤 공백 제거) |
| API-03 | 검사 규칙 | 1자 `"가"` | 통과 |
| API-04 | 검사 규칙 | 100자 | 통과 |
| API-05 | 검사 규칙 | 공백 포함 100자 | 통과 (공백을 지운 뒤 셈) |
| API-06 | 검사 규칙 | 이모지 1자 | 통과 |
| API-07 | 검사 규칙 | 이모지 100자 | 통과 (눈에 보이는 글자 하나 = 1자) |
| API-08 | 검사 규칙 | `""` (0자) | 실패. 문구 "제목을 입력해 주세요." |
| API-09 | 검사 규칙 | `"   "` (공백만) | 실패. 문구 "제목을 입력해 주세요." |
| API-10 | 검사 규칙 | 101자 | 실패. 문구 "제목은 100자 이하로 입력해 주세요." |
| API-11 | 검사 규칙 | 이모지 101자 | 실패. 문구 "제목은 100자 이하로 입력해 주세요." |
| API-12 | 검사 규칙 | `{ title: "우유 사기", completed: true }` | 실패 (허용되지 않은 필드) |

### 1-2. GET /api/todos — 목록 보기

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| API-13 | GET /api/todos | 할 일 3개를 순서대로 추가한 뒤 조회 | 200. `{ todos: [...] }`에 3개, 마지막에 추가한 것이 맨 앞 (`createdAt` 내림차순) |
| API-14 | GET /api/todos | 완료/미완료가 섞여 있을 때 조회 | 200. 완료 여부와 상관없이 `createdAt` 내림차순 |
| API-15 | GET /api/todos | 할 일이 하나도 없을 때 조회 | 200. `{ todos: [] }` |
| API-16 | GET /api/todos | 응답의 할 일 하나를 확인 | `id`(UUID 문자열), `title`(문자열), `completed`(boolean), `createdAt`(밀리초 포함 UTC ISO 문자열) 네 필드만 있음 |
| API-17 | GET /api/todos | 저장소 읽기 중 오류 | 500. `{ error: { code: "INTERNAL_ERROR", message: "잠시 후 다시 시도해 주세요." } }`. 내부 오류 내용이 응답에 없음 |

### 1-3. POST /api/todos — 할 일 추가

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| API-18 | POST /api/todos | `{ "title": "우유 사기" }` | 201. `{ todo }`의 `title`은 `"우유 사기"`, `completed`는 `false`, `id`와 `createdAt`이 채워짐 |
| API-19 | POST /api/todos | 추가한 뒤 GET으로 조회 | 방금 추가한 할 일이 목록 맨 앞에 있음 |
| API-20 | POST /api/todos | `{ "title": "  우유 사기  " }` | 201. 응답과 저장된 `title` 모두 `"우유 사기"` |
| API-21 | POST /api/todos | 1자 `"가"` | 201 |
| API-22 | POST /api/todos | 100자 | 201 |
| API-23 | POST /api/todos | 이모지 1자 | 201. `title`이 `"👍🏻"` 그대로 저장됨 (깨지지 않음) |
| API-24 | POST /api/todos | 이모지 100자 | 201 |
| API-25 | POST /api/todos | 두 번 추가 | 두 할 일의 `id`가 서로 다름 |
| API-26 | POST /api/todos | `{ "title": "" }` | 400. `VALIDATION_ERROR`, "제목을 입력해 주세요." |
| API-27 | POST /api/todos | `{ "title": "   " }` | 400. `VALIDATION_ERROR`, "제목을 입력해 주세요." |
| API-28 | POST /api/todos | 101자 | 400. `VALIDATION_ERROR`, "제목은 100자 이하로 입력해 주세요." |
| API-29 | POST /api/todos | `{}` (`title` 없음) | 400. `VALIDATION_ERROR`, "제목을 입력해 주세요." |
| API-30 | POST /api/todos | `{ "title": 123 }` | 400. `VALIDATION_ERROR`, "제목을 입력해 주세요." |
| API-31 | POST /api/todos | `{ "title": "우유 사기", "completed": true }` | 400. `VALIDATION_ERROR`, "허용되지 않은 값이 포함되어 있습니다." |
| API-32 | POST /api/todos | 본문이 JSON이 아님 (`abc`) | 400. `INVALID_JSON`, "요청 형식이 올바르지 않습니다." |
| API-33 | POST /api/todos | 본문이 비어 있음 | 400. `INVALID_JSON`, "요청 형식이 올바르지 않습니다." |
| API-34 | POST /api/todos | 400으로 실패한 뒤 GET으로 조회 | 목록에 아무것도 추가되지 않음 |
| API-35 | POST /api/todos | 저장 중 오류 | 500. `INTERNAL_ERROR`, "잠시 후 다시 시도해 주세요." |

### 1-4. PATCH /api/todos/{id} — 완료 전환

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| API-36 | PATCH /api/todos/{id} | 미완료 할 일에 `{ "completed": true }` | 200. `{ todo }`의 `completed`는 `true`. `id`, `title`, `createdAt`은 그대로 |
| API-37 | PATCH /api/todos/{id} | 완료 할 일에 `{ "completed": false }` | 200. `completed`는 `false` |
| API-38 | PATCH /api/todos/{id} | 같은 할 일에 `{ "completed": true }`를 두 번 | 두 번 모두 200, `completed`는 `true` (반대로 뒤집히지 않음) |
| API-39 | PATCH /api/todos/{id} | 바꾼 뒤 GET으로 조회 | 바뀐 `completed`가 보이고, 목록 순서는 그대로 |
| API-40 | PATCH /api/todos/{id} | `{ "completed": "true" }` (문자열) | 400. `VALIDATION_ERROR`, "완료 여부는 true 또는 false여야 합니다." |
| API-41 | PATCH /api/todos/{id} | `{ "completed": 1 }` | 400. `VALIDATION_ERROR`, "완료 여부는 true 또는 false여야 합니다." |
| API-42 | PATCH /api/todos/{id} | `{}` (`completed` 없음) | 400. `VALIDATION_ERROR`, "완료 여부는 true 또는 false여야 합니다." |
| API-43 | PATCH /api/todos/{id} | `{ "completed": true, "title": "바꾼 제목" }` | 400. `VALIDATION_ERROR`, "허용되지 않은 값이 포함되어 있습니다." 저장된 할 일은 바뀌지 않음 |
| API-44 | PATCH /api/todos/{id} | 본문이 JSON이 아님 | 400. `INVALID_JSON`, "요청 형식이 올바르지 않습니다." |
| API-45 | PATCH /api/todos/{id} | 없는 `id`에 `{ "completed": true }` | 404. `TODO_NOT_FOUND`, "할 일을 찾을 수 없습니다." |
| API-46 | PATCH /api/todos/{id} | 없는 `id`에 잘못된 본문 `{ "completed": "x" }` | 400. `VALIDATION_ERROR` (본문 검사를 먼저 함) |
| API-47 | PATCH /api/todos/{id} | 이미 `true`인 할 일에 `true` (값이 안 바뀌는 경우) | 200. 404가 나지 않음 |
| API-48 | PATCH /api/todos/{id} | 저장 중 오류 | 500. `INTERNAL_ERROR`, "잠시 후 다시 시도해 주세요." |
| API-49 | PATCH /api/todos/{id} | UUID 모양이 아닌 `id`(`abc`)에 `{ "completed": true }` | 404. `TODO_NOT_FOUND`, "할 일을 찾을 수 없습니다." (422가 아님) |
| API-50 | PATCH /api/todos/{id} | UUID 모양이 아닌 `id`(`abc`)에 잘못된 본문 `{ "completed": "x" }` | 400. `VALIDATION_ERROR` (본문 검사를 먼저 함) |

### 1-5. DELETE /api/todos/{id} — 할 일 삭제

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| API-51 | DELETE /api/todos/{id} | 있는 할 일 삭제 | 204. 응답 본문 없음 |
| API-52 | DELETE /api/todos/{id} | 할 일 2개 중 1개 삭제 후 GET | 지운 할 일만 없고, 다른 할 일은 그대로 |
| API-53 | DELETE /api/todos/{id} | 없는 `id` 삭제 | 404. `TODO_NOT_FOUND`, "할 일을 찾을 수 없습니다." |
| API-54 | DELETE /api/todos/{id} | 같은 할 일을 두 번 삭제 | 첫 번째 204, 두 번째 404 `TODO_NOT_FOUND` |
| API-55 | DELETE /api/todos/{id} | 삭제 중 오류 | 500. `INTERNAL_ERROR`, "잠시 후 다시 시도해 주세요." |
| API-56 | DELETE /api/todos/{id} | UUID 모양이 아닌 `id`(`abc`) 삭제 | 404. `TODO_NOT_FOUND`, "할 일을 찾을 수 없습니다." (422가 아님) |

---

## 2. 컴포넌트

### 2-1. TodoForm

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| UI-01 | TodoForm | 처음 그렸을 때 | "할 일" 라벨의 입력창(placeholder "할 일을 입력하세요"), "추가" 버튼이 보임. 에러 문구 없음 |
| UI-02 | TodoForm | "우유 사기" 입력 후 "추가" 클릭 | `onAdd("우유 사기")`가 1번 불림 |
| UI-03 | TodoForm | "우유 사기" 입력 후 Enter | `onAdd("우유 사기")`가 1번 불림 |
| UI-04 | TodoForm | "  우유 사기  " 입력 후 추가 | `onAdd("우유 사기")` (공백을 지운 값) |
| UI-05 | TodoForm | 100자 입력 후 추가 | `onAdd`가 불림 |
| UI-06 | TodoForm | 이모지 100자 입력 후 추가 | 입력이 잘리지 않고 `onAdd`가 불림. 입력창에 `maxLength` 속성이 없음 |
| UI-07 | TodoForm | 아무것도 입력하지 않고 추가 | `onAdd`가 불리지 않음. "제목을 입력해 주세요."가 `role="alert"`로 보임 |
| UI-08 | TodoForm | 공백만 입력하고 추가 | `onAdd`가 불리지 않음. "제목을 입력해 주세요." |
| UI-09 | TodoForm | 101자 입력 후 추가 | `onAdd`가 불리지 않음. "제목은 100자 이하로 입력해 주세요." |
| UI-10 | TodoForm | `onAdd`가 아직 끝나지 않음 | 버튼이 비활성화되고 글자가 "추가 중..." |
| UI-11 | TodoForm | `onAdd`가 끝나기 전에 버튼을 한 번 더 누름 | `onAdd`는 1번만 불림 |
| UI-12 | TodoForm | `onAdd`가 `{ ok: true }` 반환 | 입력창이 비워지고 포커스가 입력창에 있음. 버튼은 다시 "추가" |
| UI-13 | TodoForm | `onAdd`가 `{ ok: false, message: "잠시 후 다시 시도해 주세요." }` 반환 | 입력한 제목이 그대로 남고, 그 `message`가 입력창 아래에 보임 |
| UI-14 | TodoForm | 에러 문구가 보이는 상태에서 다시 입력 | 에러 문구가 사라짐 |

### 2-2. TodoList

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| UI-15 | TodoList | `todos`가 빈 배열 | "아직 할 일이 없습니다. 위에서 새 할 일을 추가해 보세요."가 보임. 목록 항목 없음 |
| UI-16 | TodoList | 할 일 3개 | 목록 항목 3개가 받은 순서 그대로 보임 |
| UI-17 | TodoList | 완료/미완료가 섞인 3개 | 다시 정렬하지 않고 받은 순서 그대로 보임 |
| UI-18 | TodoList | 할 일이 있을 때 | 빈 목록 문구가 보이지 않음 |

### 2-3. TodoItem

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| UI-19 | TodoItem | 미완료 할 일 | 체크박스가 해제됨. 제목이 보이고 취소선 없음 |
| UI-20 | TodoItem | 완료 할 일 | 체크박스가 체크됨. 제목에 취소선과 회색 글씨 |
| UI-21 | TodoItem | 체크박스를 이름으로 찾기 | 제목("우유 사기")으로 체크박스를 찾을 수 있음 (라벨 연결) |
| UI-22 | TodoItem | 미완료 할 일의 체크박스 클릭 | `onToggle(id, true)`가 불림 |
| UI-23 | TodoItem | 완료 할 일의 체크박스 클릭 | `onToggle(id, false)`가 불림 |
| UI-24 | TodoItem | `onToggle`이 아직 끝나지 않음 | 체크박스가 비활성화됨. 끝나면 다시 활성화됨 |
| UI-25 | TodoItem | "'우유 사기' 삭제" 버튼 클릭 | 확인 창 없이 `onDelete(id)`가 불림 |
| UI-26 | TodoItem | `onDelete`가 아직 끝나지 않음 | 삭제 버튼이 비활성화됨 |

### 2-4. TodoApp

`fetch`를 가짜로 바꿔 서버 응답을 흉내 냅니다.

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| UI-27 | TodoApp | 처음 열림, GET 응답 전 | "할 일을 불러오는 중..."이 보임. 입력창(TodoForm)은 보이지 않음 |
| UI-28 | TodoApp | GET 200, 할 일 2개 | 로딩 문구가 사라지고 할 일 2개와 입력창이 보임 |
| UI-29 | TodoApp | GET 200, `{ todos: [] }` | 빈 목록 문구와 입력창이 보임 |
| UI-30 | TodoApp | GET 500 | "할 일을 불러오지 못했습니다. 페이지를 새로고침해 주세요."가 보임. 입력창은 보이지 않음 |
| UI-31 | TodoApp | GET 요청 자체가 실패 (네트워크 오류) | "할 일을 불러오지 못했습니다. 페이지를 새로고침해 주세요."가 보임 |
| UI-32 | TodoApp | 추가 → POST 201 | 새 할 일이 목록 **맨 위**에 보이고 입력창이 비워짐. 빈 목록 문구가 있었다면 사라짐 |
| UI-33 | TodoApp | 추가 → POST 400 (`VALIDATION_ERROR`) | 응답의 `message`가 입력창 아래에 보임. 목록은 그대로 |
| UI-34 | TodoApp | 추가 → POST 500 | "잠시 후 다시 시도해 주세요."가 입력창 아래에 보임. 목록은 그대로 |
| UI-35 | TodoApp | 추가 → 요청 자체가 실패 | "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."가 입력창 아래에 보임 |
| UI-36 | TodoApp | 추가 → 에러 형식이 아닌 응답 (예: 405) | "잠시 후 다시 시도해 주세요."가 입력창 아래에 보임 |
| UI-37 | TodoApp | 체크박스 클릭, PATCH 응답 전 | 체크가 **바로** 보임. PATCH 요청 본문은 `{ "completed": true }` |
| UI-38 | TodoApp | 체크박스 클릭 → PATCH 200 | 체크된 상태 유지. 목록 순서는 그대로 |
| UI-39 | TodoApp | 체크박스 클릭 → PATCH 500 | 체크가 원래대로 되돌아감. "잠시 후 다시 시도해 주세요."가 목록 위에 보임 |
| UI-40 | TodoApp | 체크박스 클릭 → 요청 자체가 실패 | 체크가 원래대로 되돌아감. "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." |
| UI-41 | TodoApp | 체크박스 클릭 → PATCH 404 | 그 할 일이 목록에서 사라짐. "할 일을 찾을 수 없습니다."가 목록 위에 보임 |
| UI-42 | TodoApp | 삭제 클릭, DELETE 응답 전 | 할 일이 아직 목록에 남아 있음 |
| UI-43 | TodoApp | 삭제 클릭 → DELETE 204 | 그 할 일만 사라짐. 마지막 하나였다면 빈 목록 문구가 보임 |
| UI-44 | TodoApp | 삭제 클릭 → DELETE 500 | 할 일이 그대로 남음. "잠시 후 다시 시도해 주세요."가 목록 위에 보임 |
| UI-45 | TodoApp | 삭제 클릭 → DELETE 404 | 그 할 일이 목록에서 사라짐. "할 일을 찾을 수 없습니다."가 목록 위에 보임 |
| UI-46 | TodoApp | 동작 실패 문구가 보이는 상태에서 다른 할 일의 체크박스 클릭 | 이전 실패 문구가 사라짐 |

---

## 3. 수동 확인 (F-05 데이터 유지)

자동 테스트로 확인하기 어려운 새로고침과 서버 재시작은 버전마다 직접 확인한다. (PRD 4. 버전별 데이터 유지)

| ID | 버전 | 상황 | 기대 결과 |
|----|------|------|-----------|
| MAN-01 | v0.1 | 할 일 추가 → 새로고침 | localStorage 사용 여부에 따라 다름 (**미결정**) |
| MAN-02 | v0.2 | 추가, 완료 처리, 삭제 → 새로고침 | 바뀐 상태 그대로 남아 있음 |
| MAN-03 | v0.2 | 추가 → 서버 재시작 → 새로고침 | 할 일이 사라짐 (서버 메모리이므로 정상) |
| MAN-04 | v0.3 이후 | 추가, 완료 처리, 삭제 → 새로고침 | 바뀐 상태 그대로 남아 있음 |
| MAN-05 | v0.3 이후 | 추가, 완료 처리, 삭제 → 서버 재시작 → 새로고침 | 바뀐 상태 그대로 남아 있음 |
| MAN-06 | v0.3 이후 | 한글과 이모지 제목 추가 → 서버 재시작 → 새로고침 | 제목이 깨지지 않고 그대로 보임 (DB 인코딩 `UTF8`) |
