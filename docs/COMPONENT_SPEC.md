# COMPONENT_SPEC - Todo 앱 (초안)

> 기준 문서: docs/PRD.md, docs/API_SPEC.md, docs/DATA_MODEL.md
> 상태: 초안. PRD의 "결정이 필요한 것"과 관련된 부분은 **미결정**으로 표시합니다.

## 1. 원칙
- 화면은 한 페이지(`/`)뿐이다.
- 컴포넌트는 MVP 기능(F-01 ~ F-04)에 필요한 것만 만든다. → **4개**
- 데이터(할 일 목록)와 API 호출은 맨 위 컴포넌트 `TodoApp` **한 곳**에서만 다룬다. 아래 컴포넌트는 받은 값을 보여주고, 사용자 동작을 위로 알리기만 한다.
- API를 부르는 `fetch` 코드는 `src/lib/todoApi.ts`에 모아 두고, `TodoApp`은 이 함수들을 부른다.
- 모든 문구는 한국어로 쓴다. 서버 에러는 API 응답의 `message`를 그대로 보여준다.

## 2. 컴포넌트 트리

```
app/page.tsx                  페이지. TodoApp만 그린다.
└─ TodoApp                    상태(목록, 로딩, 에러)와 API 호출 담당 ("use client")
   ├─ TodoForm                제목 입력창 + 추가 버튼 (F-01). 목록을 다 불러온 뒤에만 보임
   ├─ (안내 문구)              로딩 / 불러오기 실패 / 동작 실패 문구
   └─ TodoList                목록. 비었으면 빈 목록 문구 (F-02)
      └─ TodoItem × N         체크박스 + 제목 + 삭제 버튼 (F-03, F-04)
```

| 컴포넌트 | 파일 | 하는 일 |
|----------|------|---------|
| `TodoApp` | `src/components/TodoApp.tsx` | 목록 상태를 들고, 처음에 목록을 불러오고, 추가/완료 전환/삭제 API를 부른다. |
| `TodoForm` | `src/components/TodoForm.tsx` | 제목을 입력받아 검사한 뒤 `onAdd`로 알린다. |
| `TodoList` | `src/components/TodoList.tsx` | 받은 할 일들을 순서대로 `TodoItem`으로 그린다. |
| `TodoItem` | `src/components/TodoItem.tsx` | 할 일 한 줄. 체크박스와 삭제 버튼을 누르면 위로 알린다. |

- 로딩, 에러, 빈 목록 문구는 짧은 텍스트라서 따로 컴포넌트를 만들지 않는다.

### 버전별 차이
- **v0.1**: `TodoApp`이 API 대신 자기 상태(`useState`)만 바꾼다. 로딩과 서버 에러가 없다. 아래 컴포넌트(`TodoForm`, `TodoList`, `TodoItem`)는 그대로다.
- **v0.2 이후**: 이 문서 그대로.

## 3. 컴포넌트별 명세

### 3-1. `TodoApp`

#### Props
```ts
// Props 없음. 페이지에서 <TodoApp />로 그린다.
```

#### 들고 있는 상태
```ts
const [todos, setTodos] = useState<Todo[]>([]);
const [loadState, setLoadState] = useState<"loading" | "error" | "ready">("loading");
const [actionError, setActionError] = useState<string | null>(null); // 완료 전환, 삭제 실패 문구
```

#### 동작과 결과

| 언제 | 하는 일 | 결과 |
|------|---------|------|
| 화면이 처음 열릴 때 | `GET /api/todos` | 성공: `todos`를 채우고 `ready`. 실패: `error` |
| `TodoForm`이 `onAdd(title)`을 부를 때 | `POST /api/todos` | 성공: 받은 할 일을 목록 **맨 위**에 넣고 `{ ok: true }` 반환. 실패: `{ ok: false, message }` 반환 |
| `TodoItem`이 `onToggle(id, completed)`을 부를 때 | 화면을 **먼저** 바꾸고 `PATCH /api/todos/{id}` | 성공: 그대로 둔다. 실패: 원래 값으로 되돌리고 `actionError` 표시 |
| `TodoItem`이 `onDelete(id)`를 부를 때 | `DELETE /api/todos/{id}` | 성공(204): 목록에서 뺀다. 실패: 목록 그대로, `actionError` 표시 |
| 위 두 동작이 `TODO_NOT_FOUND`(404)로 실패할 때 | — | 이미 없는 할 일이므로 목록에서 빼고 `actionError` 표시 |
| 새 동작을 시작할 때 | — | 이전 `actionError`를 지운다 |

- 완료 전환은 응답을 기다리지 않고 화면을 먼저 바꾼다. PRD 성공 기준 "체크박스를 누르면 완료 상태가 바로 바뀐다"를 지키기 위해서다.
- 삭제는 응답(204)을 받은 뒤에 목록에서 뺀다. 먼저 빼 버리면 실패했을 때 되돌리기가 어렵기 때문이다.

### 3-2. `TodoForm`

#### Props
```ts
// 추가 결과: 성공이면 입력창을 비우고, 실패면 message를 보여준다
export type AddResult = { ok: true } | { ok: false; message: string };

export type TodoFormProps = {
  onAdd: (title: string) => Promise<AddResult>;
};
```

#### 화면 요소
| 요소 | 내용 |
|------|------|
| 입력창 | `<label>`: "할 일", placeholder: "할 일을 입력하세요" |
| 추가 버튼 | "추가" (보내는 중에는 "추가 중...") |
| 에러 문구 | 입력창 아래. 없으면 보이지 않음 |

- 입력창에 HTML `maxLength`를 **쓰지 않는다**. 브라우저는 이모지 "👍🏻"를 4자로 세기 때문에, 100자 이하인 제목도 막힐 수 있다. 길이 검사는 Zod 스키마(`newTodoSchema`)로만 한다.

#### 사용자 동작과 결과

| 사용자 동작 | 결과 |
|-------------|------|
| 제목을 입력하고 "추가" 클릭 또는 Enter | Zod로 검사 → 통과하면 `onAdd`(공백을 지운 제목) 호출 |
| 빈 칸이나 공백만 입력하고 추가 | `onAdd`를 부르지 않고 "제목을 입력해 주세요." 표시 |
| 100자를 넘게 입력하고 추가 | `onAdd`를 부르지 않고 "제목은 100자 이하로 입력해 주세요." 표시 |
| 추가를 보내는 중 | 버튼을 비활성화하고 "추가 중..."으로 바꾼다. (두 번 눌러 중복 추가되는 것을 막음) |
| 추가 성공 (`ok: true`) | 입력창을 비우고, 입력창에 포커스를 둔다 |
| 추가 실패 (`ok: false`) | 입력한 제목을 그대로 두고 `message`를 에러 문구로 보여준다 |
| 에러 문구가 보이는 상태에서 다시 입력 | 에러 문구를 지운다 |

### 3-3. `TodoList`

#### Props
```ts
export type TodoListProps = {
  todos: Todo[]; // 이미 최신순으로 정렬된 목록 (API 응답 순서 그대로)
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};
```

#### 사용자 동작과 결과

| 상황 | 결과 |
|------|------|
| `todos`가 비어 있음 | 빈 목록 문구를 보여준다 (4장) |
| `todos`가 있음 | `<ul>` 안에 받은 순서대로 `TodoItem`을 그린다. 다시 정렬하지 않는다 |

- 완료한 항목도 자리를 옮기지 않는다. (PRD 9. 결정된 것)

### 3-4. `TodoItem`

#### Props
```ts
export type TodoItemProps = {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};
```

#### 화면 요소
| 요소 | 내용 |
|------|------|
| 체크박스 | 제목과 `<label>`로 연결. 완료면 체크됨 |
| 제목 | 완료면 취소선 + 회색 글씨 |
| 삭제 버튼 | "삭제". 스크린 리더용 이름: "'{제목}' 삭제" (`aria-label`) |

#### 사용자 동작과 결과

| 사용자 동작 | 결과 |
|-------------|------|
| 체크박스 클릭 (미완료 → 완료) | `onToggle(id, true)` 호출. 체크와 취소선이 바로 보인다 |
| 체크박스 다시 클릭 (완료 → 미완료) | `onToggle(id, false)` 호출. 바로 원래대로 돌아온다 |
| 완료 전환을 보내는 중 | 이 할 일의 체크박스를 비활성화한다 (응답이 오면 다시 활성화) |
| "삭제" 클릭 | `onDelete(id)` 호출. 보내는 중에는 삭제 버튼을 비활성화한다 |

- 삭제 전 "정말 지울까요?" 확인 창을 띄울지는 **미결정**. 정해지기 전까지는 확인 창 없이 바로 `onDelete`를 부른다.
- `onToggle`, `onDelete`가 끝날 때까지 기다리는 동안 비활성화하는 상태(`busy`)는 `TodoItem`이 스스로 들고 있다.

## 4. 상태별 문구

| 상태 | 어디에 | 문구 |
|------|--------|------|
| 목록 불러오는 중 | 목록 자리 | 할 일을 불러오는 중... |
| 목록 불러오기 실패 | 목록 자리 | 할 일을 불러오지 못했습니다. 페이지를 새로고침해 주세요. |
| 빈 목록 | 목록 자리 | 아직 할 일이 없습니다. 위에서 새 할 일을 추가해 보세요. |
| 제목 검사 실패 (빈 제목, 공백만) | 입력창 아래 | 제목을 입력해 주세요. |
| 제목 검사 실패 (100자 초과) | 입력창 아래 | 제목은 100자 이하로 입력해 주세요. |
| 추가 중 | 추가 버튼 | 추가 중... |
| 추가 실패 (서버 에러) | 입력창 아래 | API 응답의 `message` 그대로 |
| 완료 전환/삭제 실패 (서버 에러) | 목록 위 | API 응답의 `message` 그대로 |
| 서버에 연결할 수 없음 (`fetch` 자체가 실패) | 해당 위치 | 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요. |
| 응답이 에러 형식이 아님 (예: 405) | 해당 위치 | 잠시 후 다시 시도해 주세요. |

- 화면 검사 문구는 Zod 스키마의 문구, 서버 문구는 API_SPEC 1-5의 문구와 같다. 문구를 컴포넌트 안에 따로 적지 않는다.
- `TodoForm`은 목록을 다 불러온 뒤(`ready`)에만 보여준다. 목록이 없는 상태에서 추가하면 새 할 일만 보이고 기존 할 일은 안 보여서 헷갈리기 때문이다.
- 에러 문구 영역에는 `role="alert"`를 붙여 스크린 리더가 읽게 한다.

## 5. 테스트로 확인할 것 (요약)
- 자세한 목록은 docs/TEST_CASES.md에서 정한다. React Testing Library로 아래를 확인한다.
- `TodoForm`: 빈 제목, 공백만, 101자는 `onAdd`를 부르지 않고 문구를 보여준다. 1자, 100자, 이모지 1자는 `onAdd`를 부른다. 성공하면 입력창이 비워진다.
- `TodoList`: 빈 배열이면 빈 목록 문구가 보인다. 받은 순서 그대로 그린다.
- `TodoItem`: 체크박스를 누르면 `onToggle(id, !completed)`를 부른다. 삭제를 누르면 `onDelete(id)`를 부른다.
- `TodoApp`: 로딩 문구 → 목록 표시, 불러오기 실패 문구, 완료 전환 실패 시 되돌리기.
