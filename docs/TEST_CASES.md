# TEST_CASES - Todo 앱 (초안)

> 기준 문서: docs/PRD.md, docs/TRD.md, docs/DATA_MODEL.md, docs/API_SPEC.md, docs/COMPONENT_SPEC.md
> 상태: 초안. 테스트 코드는 이 문서를 보고 따로 작성한다.

## 0. 공통 규칙
- 도구: Jest + React Testing Library
- 테스트를 삭제하거나 skip하지 않는다. 실패하면 구현 코드를 고친다.
- 테스트 ID 규칙: `영역-대상-번호` (예: `API-POST-03`, `CMP-FORM-05`)
- 문구는 API_SPEC 1-5, COMPONENT_SPEC 4장과 **글자 하나까지** 같아야 한다.

### API 테스트 방법
- API 라우트의 함수(`GET`, `POST`, `PATCH`, `DELETE`)에 `Request`를 직접 넣어 부르고, 응답의 상태 코드와 JSON을 확인한다.
- 테스트마다 저장소를 빈 상태로 시작한다.
- 500 케이스는 `src/lib`의 저장 함수가 오류를 던지도록 바꿔치기(mock)해서 만든다.
- v0.2(서버 메모리)와 v0.3(MySQL)에서 **같은 테스트**가 통과해야 한다.

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

### 1-1. 입력 검사 — `newTodoSchema` (DATA_MODEL 4-4)

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| API-VAL-01 | newTodoSchema | `{ title: "우유 사기" }` | 통과. 결과 `title`은 `"우유 사기"` |
| API-VAL-02 | newTodoSchema | `{ title: "  우유 사기  " }` | 통과. 결과 `title`은 `"우유 사기"` (앞뒤 공백 제거) |
| API-VAL-03 | newTodoSchema | 1자 `"가"` | 통과 |
| API-VAL-04 | newTodoSchema | 100자 | 통과 |
| API-VAL-05 | newTodoSchema | 공백 포함 100자 | 통과 (공백을 지운 뒤 셈) |
| API-VAL-06 | newTodoSchema | 이모지 1자 | 통과 |
| API-VAL-07 | newTodoSchema | 이모지 100자 | 통과 (눈에 보이는 글자 하나 = 1자) |
| API-VAL-08 | newTodoSchema | `""` (0자) | 실패. 문구 "제목을 입력해 주세요." |
| API-VAL-09 | newTodoSchema | `"   "` (공백만) | 실패. 문구 "제목을 입력해 주세요." |
| API-VAL-10 | newTodoSchema | 101자 | 실패. 문구 "제목은 100자 이하로 입력해 주세요." |
| API-VAL-11 | newTodoSchema | 이모지 101자 | 실패. 문구 "제목은 100자 이하로 입력해 주세요." |
| API-VAL-12 | newTodoSchema | `{ title: "우유 사기", completed: true }` | 실패 (허용되지 않은 필드) |

### 1-2. GET /api/todos — 목록 보기

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| API-GET-01 | GET /api/todos | 할 일 3개를 순서대로 추가한 뒤 조회 | 200. `{ todos: [...] }`에 3개, 마지막에 추가한 것이 맨 앞 (`createdAt` 내림차순) |
| API-GET-02 | GET /api/todos | 완료/미완료가 섞여 있을 때 조회 | 200. 완료 여부와 상관없이 `createdAt` 내림차순 |
| API-GET-03 | GET /api/todos | 할 일이 하나도 없을 때 조회 | 200. `{ todos: [] }` |
| API-GET-04 | GET /api/todos | 응답의 할 일 하나를 확인 | `id`(UUID 문자열), `title`(문자열), `completed`(boolean), `createdAt`(밀리초 포함 UTC ISO 문자열) 네 필드만 있음 |
| API-GET-05 | GET /api/todos | 저장소 읽기 중 오류 | 500. `{ error: { code: "INTERNAL_ERROR", message: "잠시 후 다시 시도해 주세요." } }`. 내부 오류 내용이 응답에 없음 |

### 1-3. POST /api/todos — 할 일 추가

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| API-POST-01 | POST /api/todos | `{ "title": "우유 사기" }` | 201. `{ todo }`의 `title`은 `"우유 사기"`, `completed`는 `false`, `id`와 `createdAt`이 채워짐 |
| API-POST-02 | POST /api/todos | 추가한 뒤 GET으로 조회 | 방금 추가한 할 일이 목록 맨 앞에 있음 |
| API-POST-03 | POST /api/todos | `{ "title": "  우유 사기  " }` | 201. 응답과 저장된 `title` 모두 `"우유 사기"` |
| API-POST-04 | POST /api/todos | 1자 `"가"` | 201 |
| API-POST-05 | POST /api/todos | 100자 | 201 |
| API-POST-06 | POST /api/todos | 이모지 1자 | 201. `title`이 `"👍🏻"` 그대로 저장됨 (깨지지 않음) |
| API-POST-07 | POST /api/todos | 이모지 100자 | 201 |
| API-POST-08 | POST /api/todos | 두 번 추가 | 두 할 일의 `id`가 서로 다름 |
| API-POST-09 | POST /api/todos | `{ "title": "" }` | 400. `VALIDATION_ERROR`, "제목을 입력해 주세요." |
| API-POST-10 | POST /api/todos | `{ "title": "   " }` | 400. `VALIDATION_ERROR`, "제목을 입력해 주세요." |
| API-POST-11 | POST /api/todos | 101자 | 400. `VALIDATION_ERROR`, "제목은 100자 이하로 입력해 주세요." |
| API-POST-12 | POST /api/todos | `{}` (`title` 없음) | 400. `VALIDATION_ERROR`, "제목을 입력해 주세요." |
| API-POST-13 | POST /api/todos | `{ "title": 123 }` | 400. `VALIDATION_ERROR`, "제목을 입력해 주세요." |
| API-POST-14 | POST /api/todos | `{ "title": "우유 사기", "completed": true }` | 400. `VALIDATION_ERROR`, "허용되지 않은 값이 포함되어 있습니다." |
| API-POST-15 | POST /api/todos | 본문이 JSON이 아님 (`abc`) | 400. `INVALID_JSON`, "요청 형식이 올바르지 않습니다." |
| API-POST-16 | POST /api/todos | 본문이 비어 있음 | 400. `INVALID_JSON`, "요청 형식이 올바르지 않습니다." |
| API-POST-17 | POST /api/todos | 400으로 실패한 뒤 GET으로 조회 | 목록에 아무것도 추가되지 않음 |
| API-POST-18 | POST /api/todos | 저장 중 오류 | 500. `INTERNAL_ERROR`, "잠시 후 다시 시도해 주세요." |

### 1-4. PATCH /api/todos/{id} — 완료 전환

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| API-PATCH-01 | PATCH /api/todos/{id} | 미완료 할 일에 `{ "completed": true }` | 200. `{ todo }`의 `completed`는 `true`. `id`, `title`, `createdAt`은 그대로 |
| API-PATCH-02 | PATCH /api/todos/{id} | 완료 할 일에 `{ "completed": false }` | 200. `completed`는 `false` |
| API-PATCH-03 | PATCH /api/todos/{id} | 같은 할 일에 `{ "completed": true }`를 두 번 | 두 번 모두 200, `completed`는 `true` (반대로 뒤집히지 않음) |
| API-PATCH-04 | PATCH /api/todos/{id} | 바꾼 뒤 GET으로 조회 | 바뀐 `completed`가 보이고, 목록 순서는 그대로 |
| API-PATCH-05 | PATCH /api/todos/{id} | `{ "completed": "true" }` (문자열) | 400. `VALIDATION_ERROR`, "완료 여부는 true 또는 false여야 합니다." |
| API-PATCH-06 | PATCH /api/todos/{id} | `{ "completed": 1 }` | 400. `VALIDATION_ERROR`, "완료 여부는 true 또는 false여야 합니다." |
| API-PATCH-07 | PATCH /api/todos/{id} | `{}` (`completed` 없음) | 400. `VALIDATION_ERROR`, "완료 여부는 true 또는 false여야 합니다." |
| API-PATCH-08 | PATCH /api/todos/{id} | `{ "completed": true, "title": "바꾼 제목" }` | 400. `VALIDATION_ERROR`, "허용되지 않은 값이 포함되어 있습니다." 저장된 할 일은 바뀌지 않음 |
| API-PATCH-09 | PATCH /api/todos/{id} | 본문이 JSON이 아님 | 400. `INVALID_JSON`, "요청 형식이 올바르지 않습니다." |
| API-PATCH-10 | PATCH /api/todos/{id} | 없는 `id`에 `{ "completed": true }` | 404. `TODO_NOT_FOUND`, "할 일을 찾을 수 없습니다." |
| API-PATCH-11 | PATCH /api/todos/{id} | 없는 `id`에 잘못된 본문 `{ "completed": "x" }` | 400. `VALIDATION_ERROR` (본문 검사를 먼저 함) |
| API-PATCH-12 | PATCH /api/todos/{id} | 이미 `true`인 할 일에 `true` (v0.3: DB 값이 안 바뀌는 경우) | 200. 404가 나지 않음 |
| API-PATCH-13 | PATCH /api/todos/{id} | 저장 중 오류 | 500. `INTERNAL_ERROR`, "잠시 후 다시 시도해 주세요." |

### 1-5. DELETE /api/todos/{id} — 할 일 삭제

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| API-DEL-01 | DELETE /api/todos/{id} | 있는 할 일 삭제 | 204. 응답 본문 없음 |
| API-DEL-02 | DELETE /api/todos/{id} | 할 일 2개 중 1개 삭제 후 GET | 지운 할 일만 없고, 다른 할 일은 그대로 |
| API-DEL-03 | DELETE /api/todos/{id} | 없는 `id` 삭제 | 404. `TODO_NOT_FOUND`, "할 일을 찾을 수 없습니다." |
| API-DEL-04 | DELETE /api/todos/{id} | 같은 할 일을 두 번 삭제 | 첫 번째 204, 두 번째 404 `TODO_NOT_FOUND` |
| API-DEL-05 | DELETE /api/todos/{id} | 삭제 중 오류 | 500. `INTERNAL_ERROR`, "잠시 후 다시 시도해 주세요." |

---

## 2. 컴포넌트

### 2-1. TodoForm

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| CMP-FORM-01 | TodoForm | 처음 그렸을 때 | "할 일" 라벨의 입력창(placeholder "할 일을 입력하세요"), "추가" 버튼이 보임. 에러 문구 없음 |
| CMP-FORM-02 | TodoForm | "우유 사기" 입력 후 "추가" 클릭 | `onAdd("우유 사기")`가 1번 불림 |
| CMP-FORM-03 | TodoForm | "우유 사기" 입력 후 Enter | `onAdd("우유 사기")`가 1번 불림 |
| CMP-FORM-04 | TodoForm | "  우유 사기  " 입력 후 추가 | `onAdd("우유 사기")` (공백을 지운 값) |
| CMP-FORM-05 | TodoForm | 100자 입력 후 추가 | `onAdd`가 불림 |
| CMP-FORM-06 | TodoForm | 이모지 100자 입력 후 추가 | 입력이 잘리지 않고 `onAdd`가 불림. 입력창에 `maxLength` 속성이 없음 |
| CMP-FORM-07 | TodoForm | 아무것도 입력하지 않고 추가 | `onAdd`가 불리지 않음. "제목을 입력해 주세요."가 `role="alert"`로 보임 |
| CMP-FORM-08 | TodoForm | 공백만 입력하고 추가 | `onAdd`가 불리지 않음. "제목을 입력해 주세요." |
| CMP-FORM-09 | TodoForm | 101자 입력 후 추가 | `onAdd`가 불리지 않음. "제목은 100자 이하로 입력해 주세요." |
| CMP-FORM-10 | TodoForm | `onAdd`가 아직 끝나지 않음 | 버튼이 비활성화되고 글자가 "추가 중..." |
| CMP-FORM-11 | TodoForm | `onAdd`가 끝나기 전에 버튼을 한 번 더 누름 | `onAdd`는 1번만 불림 |
| CMP-FORM-12 | TodoForm | `onAdd`가 `{ ok: true }` 반환 | 입력창이 비워지고 포커스가 입력창에 있음. 버튼은 다시 "추가" |
| CMP-FORM-13 | TodoForm | `onAdd`가 `{ ok: false, message: "잠시 후 다시 시도해 주세요." }` 반환 | 입력한 제목이 그대로 남고, 그 `message`가 입력창 아래에 보임 |
| CMP-FORM-14 | TodoForm | 에러 문구가 보이는 상태에서 다시 입력 | 에러 문구가 사라짐 |

### 2-2. TodoList

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| CMP-LIST-01 | TodoList | `todos`가 빈 배열 | "아직 할 일이 없습니다. 위에서 새 할 일을 추가해 보세요."가 보임. 목록 항목 없음 |
| CMP-LIST-02 | TodoList | 할 일 3개 | 목록 항목 3개가 받은 순서 그대로 보임 |
| CMP-LIST-03 | TodoList | 완료/미완료가 섞인 3개 | 다시 정렬하지 않고 받은 순서 그대로 보임 |
| CMP-LIST-04 | TodoList | 할 일이 있을 때 | 빈 목록 문구가 보이지 않음 |

### 2-3. TodoItem

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| CMP-ITEM-01 | TodoItem | 미완료 할 일 | 체크박스가 해제됨. 제목이 보이고 취소선 없음 |
| CMP-ITEM-02 | TodoItem | 완료 할 일 | 체크박스가 체크됨. 제목에 취소선과 회색 글씨 |
| CMP-ITEM-03 | TodoItem | 체크박스를 이름으로 찾기 | 제목("우유 사기")으로 체크박스를 찾을 수 있음 (라벨 연결) |
| CMP-ITEM-04 | TodoItem | 미완료 할 일의 체크박스 클릭 | `onToggle(id, true)`가 불림 |
| CMP-ITEM-05 | TodoItem | 완료 할 일의 체크박스 클릭 | `onToggle(id, false)`가 불림 |
| CMP-ITEM-06 | TodoItem | `onToggle`이 아직 끝나지 않음 | 체크박스가 비활성화됨. 끝나면 다시 활성화됨 |
| CMP-ITEM-07 | TodoItem | "'우유 사기' 삭제" 버튼 클릭 | 확인 창 없이 `onDelete(id)`가 불림 |
| CMP-ITEM-08 | TodoItem | `onDelete`가 아직 끝나지 않음 | 삭제 버튼이 비활성화됨 |

### 2-4. TodoApp

`fetch`를 가짜로 바꿔 서버 응답을 흉내 냅니다.

| ID | 대상 | 상황 | 기대 결과 |
|----|------|------|-----------|
| CMP-APP-01 | TodoApp | 처음 열림, GET 응답 전 | "할 일을 불러오는 중..."이 보임. 입력창(TodoForm)은 보이지 않음 |
| CMP-APP-02 | TodoApp | GET 200, 할 일 2개 | 로딩 문구가 사라지고 할 일 2개와 입력창이 보임 |
| CMP-APP-03 | TodoApp | GET 200, `{ todos: [] }` | 빈 목록 문구와 입력창이 보임 |
| CMP-APP-04 | TodoApp | GET 500 | "할 일을 불러오지 못했습니다. 페이지를 새로고침해 주세요."가 보임. 입력창은 보이지 않음 |
| CMP-APP-05 | TodoApp | GET 요청 자체가 실패 (네트워크 오류) | "할 일을 불러오지 못했습니다. 페이지를 새로고침해 주세요."가 보임 |
| CMP-APP-06 | TodoApp | 추가 → POST 201 | 새 할 일이 목록 **맨 위**에 보이고 입력창이 비워짐. 빈 목록 문구가 있었다면 사라짐 |
| CMP-APP-07 | TodoApp | 추가 → POST 400 (`VALIDATION_ERROR`) | 응답의 `message`가 입력창 아래에 보임. 목록은 그대로 |
| CMP-APP-08 | TodoApp | 추가 → POST 500 | "잠시 후 다시 시도해 주세요."가 입력창 아래에 보임. 목록은 그대로 |
| CMP-APP-09 | TodoApp | 추가 → 요청 자체가 실패 | "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."가 입력창 아래에 보임 |
| CMP-APP-10 | TodoApp | 추가 → 에러 형식이 아닌 응답 (예: 405) | "잠시 후 다시 시도해 주세요."가 입력창 아래에 보임 |
| CMP-APP-11 | TodoApp | 체크박스 클릭, PATCH 응답 전 | 체크가 **바로** 보임. PATCH 요청 본문은 `{ "completed": true }` |
| CMP-APP-12 | TodoApp | 체크박스 클릭 → PATCH 200 | 체크된 상태 유지. 목록 순서는 그대로 |
| CMP-APP-13 | TodoApp | 체크박스 클릭 → PATCH 500 | 체크가 원래대로 되돌아감. "잠시 후 다시 시도해 주세요."가 목록 위에 보임 |
| CMP-APP-14 | TodoApp | 체크박스 클릭 → 요청 자체가 실패 | 체크가 원래대로 되돌아감. "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." |
| CMP-APP-15 | TodoApp | 체크박스 클릭 → PATCH 404 | 그 할 일이 목록에서 사라짐. "할 일을 찾을 수 없습니다."가 목록 위에 보임 |
| CMP-APP-16 | TodoApp | 삭제 클릭, DELETE 응답 전 | 할 일이 아직 목록에 남아 있음 |
| CMP-APP-17 | TodoApp | 삭제 클릭 → DELETE 204 | 그 할 일만 사라짐. 마지막 하나였다면 빈 목록 문구가 보임 |
| CMP-APP-18 | TodoApp | 삭제 클릭 → DELETE 500 | 할 일이 그대로 남음. "잠시 후 다시 시도해 주세요."가 목록 위에 보임 |
| CMP-APP-19 | TodoApp | 삭제 클릭 → DELETE 404 | 그 할 일이 목록에서 사라짐. "할 일을 찾을 수 없습니다."가 목록 위에 보임 |
| CMP-APP-20 | TodoApp | 동작 실패 문구가 보이는 상태에서 다른 할 일의 체크박스 클릭 | 이전 실패 문구가 사라짐 |

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
| MAN-06 | v0.3 이후 | 한글과 이모지 제목 추가 → 서버 재시작 → 새로고침 | 제목이 깨지지 않고 그대로 보임 (`utf8mb4`) |
