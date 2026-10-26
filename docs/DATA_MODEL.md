# DATA_MODEL - Todo 앱 (초안)

> 기준 문서: docs/PRD.md, docs/TRD.md
> DB: MySQL 8 (v0.3부터)
> 상태: 초안. PRD의 "결정이 필요한 것"과 관련된 부분은 **미결정**으로 표시합니다.

## 1. 원칙
- 테이블은 MVP에 꼭 필요한 것만 만든다. → **`todos` 테이블 하나**.
- 로그인, 공유, 마감일, 카테고리는 범위 밖이므로 `users`, `categories` 같은 테이블이나 `due_date` 같은 필드는 만들지 않는다.
- DB 이름은 `snake_case`(예: `created_at`), TypeScript 이름은 `camelCase`(예: `createdAt`)로 쓴다. DB에서 읽은 행은 서버 코드의 변환 함수(`toTodo`)로 `Todo` 타입으로 바꾼다. (4-2 참고)
- ORM 없이 mysql2로 SQL을 직접 쓴다.
- DB 테이블은 v0.3부터 쓴다. v0.1, v0.2에서도 **같은 `Todo` 타입**을 써서, 버전이 올라가도 화면 코드가 바뀌지 않게 한다.
- 테이블 문자셋은 `utf8mb4`로 한다. 한글과 이모지를 깨지지 않게 저장하기 위해서다.

## 2. 테이블: `todos`

할 일 하나가 한 행(row)입니다.

| 필드 (DB) | 필드 (TS) | 타입 (MySQL) | 제약조건 | 설명 |
|-----------|-----------|--------------|----------|------|
| `id` | `id` | `CHAR(36)` | PRIMARY KEY, NOT NULL | 할 일을 구분하는 고유 번호(UUID 문자열). 서버가 `crypto.randomUUID()`로 만든다. 완료 전환(F-03), 삭제(F-04) 때 어떤 할 일인지 찾는 데 쓴다. |
| `title` | `title` | `TEXT` | NOT NULL | 할 일 제목. 앞뒤 공백을 지운 값을 저장한다. 1~100자 규칙은 Zod로 검사한다. (3장 참고) |
| `completed` | `completed` | `BOOLEAN` | NOT NULL, 기본값 `FALSE` | 완료 여부. 새로 추가하면 미완료(`false`)로 시작한다. (F-03) |
| `created_at` | `createdAt` | `TIMESTAMP(3)` | NOT NULL, 기본값 `CURRENT_TIMESTAMP(3)` | 만든 시각(밀리초까지). 최신순 정렬에 쓴다. (F-02) |

### 왜 이렇게 정했나
- **`id`를 UUID 문자열(`CHAR(36)`)로 한 이유**: v0.1(브라우저)과 v0.2(서버 메모리)에서도 `crypto.randomUUID()`로 같은 모양의 id를 만들 수 있어서, DB가 없는 버전부터 타입이 똑같이 유지된다. MySQL에는 UUID 전용 타입이 없어서 36자 고정 문자열로 저장한다.
- **id를 DB가 아니라 서버에서 만드는 이유**: MySQL은 `INSERT` 뒤에 저장한 행을 바로 돌려주지 않는다(`RETURNING` 없음). 서버가 id를 미리 알고 있으면 저장 직후 그 id로 행을 다시 읽어 화면에 돌려줄 수 있다. (TRD 5장 9단계)
- **`BOOLEAN`**: MySQL에서는 내부적으로 `TINYINT(1)`로 저장되어, 읽어 오면 `0` 또는 `1` 숫자가 나온다. 서버 코드에서 `true`/`false`로 바꿔 준다.
- **`created_at`을 `TIMESTAMP(3)`로 한 이유**: `TIMESTAMP`는 UTC 기준으로 저장해서 배포 환경(v1.0)의 서버 시간대가 달라도 순서가 꼬이지 않는다. `(3)`은 밀리초까지 저장한다는 뜻으로, 짧은 시간에 여러 개를 추가해도 순서가 구분되게 한다.
- **`updated_at`을 넣지 않은 이유**: MVP에 "수정" 기능이 없고, 수정 시각을 보여주라는 요구도 없다. v0.4(수정 기능)에서 필요해지면 그때 추가를 검토한다.
- **인덱스를 따로 만들지 않는 이유**: 혼자 쓰는 앱이라 행이 많지 않아서 `created_at` 정렬에 인덱스가 없어도 충분히 빠르다. 기본 키(`id`)에는 인덱스가 자동으로 생긴다.

### 정렬 규칙
- 목록은 `created_at` 내림차순(최근 것이 위)으로 읽는다. (F-02)
- 완료한 항목도 같은 순서를 따른다. 정렬 조건에 `completed`를 넣지 않는다. → `ORDER BY created_at DESC`

### 테이블 생성 SQL (`src/lib/db/schema.sql`)
v0.3을 시작할 때 MySQL에서 **한 번 직접 실행**해 테이블을 만듭니다.

```sql
CREATE TABLE todos (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  title      TEXT         NOT NULL,
  completed  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) DEFAULT CHARSET = utf8mb4;
```

## 3. 제목 길이 제약에 대해
- 1~100자 규칙은 **Zod 스키마 한 곳**에서 검사한다. (TRD 6장)
- 기준: 앞뒤 공백을 지운 뒤, 눈에 보이는 글자 하나를 1자로 센다. (PRD 9. 결정된 것)
- DB에는 `CHECK (CHAR_LENGTH(title) BETWEEN 1 AND 100)` 같은 길이 제약을 **걸지 않는다**.
  - 이유: MySQL의 `CHAR_LENGTH`는 눈에 보이는 글자가 아니라 유니코드 코드 포인트 단위로 센다. 그래서 이모지 "👍🏻"를 2자로 센다. 앱의 기준(1자)과 달라서, 이모지가 많은 제목은 "화면에서는 통과했는데 DB에서 거절"될 수 있다.
  - 같은 이유로 `VARCHAR(100)` 대신 `TEXT`를 쓴다.
  - 서버의 Zod 검사를 통과한 값만 DB에 들어가므로 길이 규칙은 지켜진다.

## 4. TypeScript 타입 예시

### 4-1. 공유 타입 (`src/types/todo.ts`)
화면과 서버가 함께 쓰는 타입입니다. v0.1부터 사용합니다.

```ts
// 할 일 하나
export type Todo = {
  id: string; // uuid
  title: string; // 1~100자
  completed: boolean; // 완료 여부
  createdAt: string; // 만든 시각 (ISO 8601 문자열, 예: "2026-10-23T05:30:00.000Z")
};

// 할 일을 추가할 때 화면에서 보내는 값 (나머지는 서버/DB가 채운다)
export type NewTodoInput = {
  title: string;
};
```

- `createdAt`을 `Date`가 아니라 `string`으로 둔 이유: 서버가 JSON으로 응답하면 `Date`는 문자열로 바뀐다. 타입을 실제 받는 값과 맞춰서 헷갈리지 않게 한다.

### 4-2. DB 행 타입과 변환 (`src/lib/db/todoRow.ts`, v0.3부터)

```ts
import type { RowDataPacket } from "mysql2/promise";
import type { Todo } from "@/types/todo";

// DB에서 읽어 온 행 (DB 이름 그대로)
export interface TodoRow extends RowDataPacket {
  id: string;
  title: string;
  completed: number; // 0 또는 1
  created_at: Date;
}

// DB 행 → 화면에 보낼 Todo
export function toTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed === 1,
    createdAt: row.created_at.toISOString(),
  };
}
```

- `TodoRow`는 서버 안에서만 쓴다. 화면에는 항상 `toTodo`로 바꾼 `Todo`를 보낸다.

### 4-3. SQL 사용 예시 (할 일 추가)

```ts
import { randomUUID } from "crypto";
import { pool } from "@/lib/db/pool"; // mysql2 연결 (접속 주소는 .env.local)
import type { TodoRow } from "@/lib/db/todoRow";

const id = randomUUID();

// 1) 저장: 값은 ? 자리에 따로 넘긴다 (SQL 인젝션 방지)
await pool.execute("INSERT INTO todos (id, title) VALUES (?, ?)", [id, title]);

// 2) 방금 저장한 행 다시 읽기 (MySQL은 INSERT 결과로 행을 돌려주지 않음)
const [rows] = await pool.execute<TodoRow[]>(
  "SELECT id, title, completed, created_at FROM todos WHERE id = ?",
  [id],
);
```

- 연결을 만들 때 `timezone: "Z"`(UTC) 옵션을 준다. 그래야 `created_at`이 시간대 때문에 틀어지지 않는다.

### 4-4. Zod 스키마 예시 (`src/lib/validation/todo.ts`)

```ts
import { z } from "zod";

// 눈에 보이는 글자 수 세기 (이모지 "👍🏻"도 1자)
const segmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });
const countChars = (s: string) => [...segmenter.segment(s)].length;

// 할 일 추가 입력 검사 (화면과 서버가 같이 사용)
export const newTodoSchema = z.object({
  title: z
    .string()
    .trim() // 앞뒤 공백 제거
    .refine((s) => countChars(s) >= 1, "제목을 입력해 주세요.")
    .refine((s) => countChars(s) <= 100, "제목은 100자 이하로 입력해 주세요."),
}).strict(); // title 말고 다른 필드가 오면 거절 (API_SPEC 1-5)
```

- `.min()`, `.max()`를 쓰지 않는 이유: 이 둘은 `.length`로 세서 이모지 "👍🏻"를 4자로 센다.
- `newTodoSchema.parse()`의 결과에는 공백을 지운 제목이 들어 있다. 이 값을 그대로 저장한다.

## 5. 버전별 저장 방식

| 버전 | 저장 위치 | `id` 만드는 곳 | `createdAt` 만드는 곳 |
|------|-----------|----------------|-----------------------|
| v0.1 | 브라우저 메모리 (localStorage 여부 **미결정**) | 브라우저 `crypto.randomUUID()` | 브라우저 `new Date().toISOString()` |
| v0.2 | 서버 메모리 (`Todo[]` 배열) | 서버 `crypto.randomUUID()` | 서버 `new Date().toISOString()` |
| v0.3~ | MySQL `todos` 테이블 | 서버 `crypto.randomUUID()` | DB 기본값 `CURRENT_TIMESTAMP(3)` |

## 6. 결정이 필요한 것
- v0.1에서 localStorage를 쓸지 → 쓴다면 `Todo[]`를 JSON 문자열로 저장한다.
- MySQL을 어디에 둘지 (로컬 설치, 클라우드 서비스 등) → 접속 주소는 `.env.local`에 둔다.
