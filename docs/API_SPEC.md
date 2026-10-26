# API_SPEC - Todo 앱 (초안)

> 기준 문서: docs/DATA_MODEL.md, docs/PRD.md, docs/TRD.md
> 적용 버전: v0.2부터 (v0.1은 API 없음)
> 상태: 초안

## 1. 공통 규칙

### 1-1. 기본
- 주소는 모두 `/api/todos`로 시작한다. Next.js의 API 라우트(`app/api/todos/...`)로 만든다.
- 요청 본문과 응답 본문은 JSON이다. 요청에는 `Content-Type: application/json` 헤더를 붙인다.
- v0.2(서버 메모리)와 v0.3 이후(MySQL)의 API는 **똑같다**. 저장 위치가 바뀌어도 화면 코드는 고치지 않는다.
- 로그인이 없으므로 인증 헤더는 없다. (배포 후 접근 제한 방법은 **미결정**, v1.0에서 정함)

### 1-2. 엔드포인트 목록

| 기능 | 메서드 | 주소 | 성공 코드 |
|------|--------|------|-----------|
| F-02 목록 보기 | GET | `/api/todos` | 200 |
| F-01 할 일 추가 | POST | `/api/todos` | 201 |
| F-03 완료 전환 | PATCH | `/api/todos/{id}` | 200 |
| F-04 할 일 삭제 | DELETE | `/api/todos/{id}` | 204 |

### 1-3. Todo 객체
응답에 들어 있는 할 일 하나의 모양입니다. DATA_MODEL의 `Todo` 타입과 같습니다.

```json
{
  "id": "3f1c2a9e-8b4d-4c1a-9e2f-7a6b5c4d3e2f",
  "title": "우유 사기",
  "completed": false,
  "createdAt": "2026-10-23T05:30:00.000Z"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | UUID |
| `title` | string | 앞뒤 공백을 지운 제목 (1~100자, 눈에 보이는 글자 하나 = 1자) |
| `completed` | boolean | 완료 여부 |
| `createdAt` | string | 만든 시각. UTC 기준 ISO 8601 문자열 (밀리초 포함) |

### 1-4. 에러 형식
에러가 나면 **항상** 아래 모양으로 응답한다.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "제목을 입력해 주세요."
  }
}
```

- `code`: 프로그램이 에러 종류를 구분할 때 쓰는 값. 영어 대문자와 밑줄로 쓴다.
- `message`: 사용자에게 그대로 보여줄 수 있는 한국어 문장.
- 화면은 `code`로 분기하고, `message`를 화면에 표시한다.

### 1-5. 에러 코드 목록

| code | 상태 코드 | 언제 | message |
|------|-----------|------|---------|
| `INVALID_JSON` | 400 | 요청 본문이 JSON이 아니거나 비어 있을 때 | 요청 형식이 올바르지 않습니다. |
| `VALIDATION_ERROR` | 400 | 요청 값이 규칙에 맞지 않을 때 | 상황별로 다름 (각 엔드포인트 참고) |
| `TODO_NOT_FOUND` | 404 | 주소의 `{id}`에 해당하는 할 일이 없을 때 | 할 일을 찾을 수 없습니다. |
| `INTERNAL_ERROR` | 500 | 서버나 DB에서 예상하지 못한 오류가 났을 때 | 잠시 후 다시 시도해 주세요. |

- `INTERNAL_ERROR`의 `message`에는 DB 오류 내용 같은 내부 정보를 넣지 않는다.
- 정해 둔 필드 말고 다른 필드를 보내면 `VALIDATION_ERROR`로 거절한다. 예를 들어 v0.3에서 PATCH에 `title`을 보내면 거절한다(수정 기능은 v0.4).
- 만들지 않은 메서드(예: `PUT /api/todos`)를 부르면 Next.js가 자동으로 `405`를 돌려준다. 이 응답은 위 에러 형식이 아닐 수 있다. 화면은 이런 요청을 보내지 않는다.

---

## 2. GET /api/todos — 목록 보기 (F-02)

모든 할 일을 최신순으로 돌려준다.

### 요청
- 본문 없음. 쿼리 파라미터 없음. (필터는 v0.4)

```http
GET /api/todos
```

### 응답 — 200 OK

```json
{
  "todos": [
    {
      "id": "3f1c2a9e-8b4d-4c1a-9e2f-7a6b5c4d3e2f",
      "title": "우유 사기",
      "completed": false,
      "createdAt": "2026-10-23T05:30:00.000Z"
    },
    {
      "id": "a7b8c9d0-1e2f-4a3b-8c4d-5e6f7a8b9c0d",
      "title": "보고서 제출",
      "completed": true,
      "createdAt": "2026-10-22T09:15:30.250Z"
    }
  ]
}
```

- `createdAt` 내림차순(최근 것이 위)으로 정렬한다. 완료한 항목도 같은 순서를 따른다.
- 할 일이 하나도 없으면 `{ "todos": [] }`를 돌려준다. (에러가 아님)

### 에러

| 상황 | 상태 코드 | code |
|------|-----------|------|
| DB에서 읽다가 오류 | 500 | `INTERNAL_ERROR` |

---

## 3. POST /api/todos — 할 일 추가 (F-01)

### 요청

```http
POST /api/todos
Content-Type: application/json
```

```json
{
  "title": "  우유 사기  "
}
```

| 필드 | 타입 | 필수 | 규칙 |
|------|------|------|------|
| `title` | string | 예 | 앞뒤 공백을 지운 뒤 1~100자 (눈에 보이는 글자 하나 = 1자) |

- `id`, `completed`, `createdAt`은 보내지 않는다. 서버와 DB가 채운다.

### 응답 — 201 Created

```json
{
  "todo": {
    "id": "3f1c2a9e-8b4d-4c1a-9e2f-7a6b5c4d3e2f",
    "title": "우유 사기",
    "completed": false,
    "createdAt": "2026-10-23T05:30:00.000Z"
  }
}
```

- `title`은 앞뒤 공백을 지운 값이다.
- `completed`는 항상 `false`로 시작한다.

### 에러

| 상황 | 상태 코드 | code | message |
|------|-----------|------|---------|
| 본문이 JSON이 아님 | 400 | `INVALID_JSON` | 요청 형식이 올바르지 않습니다. |
| `title`이 없거나 문자열이 아님 | 400 | `VALIDATION_ERROR` | 제목을 입력해 주세요. |
| `title`이 빈 문자열이거나 공백만 있음 | 400 | `VALIDATION_ERROR` | 제목을 입력해 주세요. |
| `title`이 100자를 넘음 | 400 | `VALIDATION_ERROR` | 제목은 100자 이하로 입력해 주세요. |
| `title` 말고 다른 필드가 있음 | 400 | `VALIDATION_ERROR` | 허용되지 않은 값이 포함되어 있습니다. |
| 저장 중 DB 오류 | 500 | `INTERNAL_ERROR` | 잠시 후 다시 시도해 주세요. |

에러 응답 예시 (101자 제목):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "제목은 100자 이하로 입력해 주세요."
  }
}
```

### 경계값 (PRD 7. 성공 기준)

| 보낸 `title` | 결과 |
|--------------|------|
| `""` (0자) | 400 |
| `"   "` (공백만) | 400 |
| `"가"` (1자) | 201 |
| `"👍🏻"` (이모지 1자) | 201 |
| 100자 | 201 |
| 101자 | 400 |
| `"  우유 사기  "` | 201, 저장된 `title`은 `"우유 사기"` |

---

## 4. PATCH /api/todos/{id} — 완료 전환 (F-03)

바꿀 값을 직접 보낸다. "반대로 바꿔"가 아니므로 같은 요청을 두 번 보내도 결과가 같다.

### 요청

```http
PATCH /api/todos/3f1c2a9e-8b4d-4c1a-9e2f-7a6b5c4d3e2f
Content-Type: application/json
```

```json
{
  "completed": true
}
```

| 위치 | 필드 | 타입 | 필수 | 규칙 |
|------|------|------|------|------|
| 주소 | `id` | string | 예 | 바꿀 할 일의 id |
| 본문 | `completed` | boolean | 예 | `true` 또는 `false` |

### 응답 — 200 OK

```json
{
  "todo": {
    "id": "3f1c2a9e-8b4d-4c1a-9e2f-7a6b5c4d3e2f",
    "title": "우유 사기",
    "completed": true,
    "createdAt": "2026-10-23T05:30:00.000Z"
  }
}
```

- 바뀐 뒤의 할 일 전체를 돌려준다.
- 이미 `true`인 할 일에 `true`를 다시 보내도 200이다.

### 에러

| 상황 | 상태 코드 | code | message |
|------|-----------|------|---------|
| 본문이 JSON이 아님 | 400 | `INVALID_JSON` | 요청 형식이 올바르지 않습니다. |
| `completed`가 없거나 boolean이 아님 (예: `"true"`, `1`) | 400 | `VALIDATION_ERROR` | 완료 여부는 true 또는 false여야 합니다. |
| `completed` 말고 다른 필드가 있음 (예: `title`) | 400 | `VALIDATION_ERROR` | 허용되지 않은 값이 포함되어 있습니다. |
| `{id}`에 해당하는 할 일이 없음 | 404 | `TODO_NOT_FOUND` | 할 일을 찾을 수 없습니다. |
| 저장 중 DB 오류 | 500 | `INTERNAL_ERROR` | 잠시 후 다시 시도해 주세요. |

- 본문 검사(400)를 먼저 하고, 그다음 할 일이 있는지(404) 확인한다.
- 구현 참고 (v0.3): `UPDATE` 뒤에 `SELECT`로 다시 읽어서, 행이 없으면 404로 응답한다. 할 일이 있는지는 `UPDATE`의 영향받은 행 수가 아니라 이 `SELECT` 결과로 판단한다.

---

## 5. DELETE /api/todos/{id} — 할 일 삭제 (F-04)

### 요청

```http
DELETE /api/todos/3f1c2a9e-8b4d-4c1a-9e2f-7a6b5c4d3e2f
```

- 본문 없음.

### 응답 — 204 No Content
- 본문 없음. 화면은 응답을 받으면 목록에서 해당 할 일을 뺀다.

### 에러

| 상황 | 상태 코드 | code | message |
|------|-----------|------|---------|
| `{id}`에 해당하는 할 일이 없음 (이미 지웠을 때 포함) | 404 | `TODO_NOT_FOUND` | 할 일을 찾을 수 없습니다. |
| 삭제 중 DB 오류 | 500 | `INTERNAL_ERROR` | 잠시 후 다시 시도해 주세요. |

- 삭제 전 확인 창은 화면에서 띄우는 것이므로 API와 관계없다. (띄울지는 **미결정**)

---

## 6. TypeScript 타입 예시 (`src/types/api.ts`)

```ts
import type { Todo } from "@/types/todo";

// GET /api/todos 응답
export type ListTodosResponse = { todos: Todo[] };

// POST /api/todos, PATCH /api/todos/{id} 응답
export type TodoResponse = { todo: Todo };

// PATCH /api/todos/{id} 요청
export type UpdateTodoInput = { completed: boolean };

// 에러 코드
export type ErrorCode =
  | "INVALID_JSON"
  | "VALIDATION_ERROR"
  | "TODO_NOT_FOUND"
  | "INTERNAL_ERROR";

// 모든 에러 응답
export type ErrorResponse = {
  error: { code: ErrorCode; message: string };
};
```

- POST 요청 타입은 DATA_MODEL의 `NewTodoInput`을 그대로 쓴다.

## 7. 버전별 차이

| 버전 | 달라지는 점 |
|------|-------------|
| v0.1 | API 없음 |
| v0.2 | 이 문서 그대로. 데이터는 서버 메모리에 저장. 서버를 끄면 사라짐 |
| v0.3 | 이 문서 그대로. 데이터는 MySQL에 저장 |
| v0.4 | PATCH에 `title`(수정), GET에 필터를 추가할 예정. 그때 이 문서를 고친다 |
| v1.0 | 접근 제한 방법에 따라 요청 헤더 등이 추가될 수 있음 (**미결정**) |
