# DATA_MODEL - Todo 앱 (초안)

> 기준 문서: docs/PRD.md, docs/TRD.md
> DB: PostgreSQL (v0.3부터) / 백엔드: FastAPI (v0.2부터)
> 상태: 초안. PRD의 "결정이 필요한 것"과 관련된 부분은 **미결정**으로 표시합니다.

## 1. 원칙
- 테이블은 MVP에 꼭 필요한 것만 만든다. → **`todos` 테이블 하나**.
- 로그인, 공유, 마감일, 카테고리는 범위 밖이므로 `users`, `categories` 같은 테이블이나 `due_date` 같은 필드는 만들지 않는다.
- 이름 규칙
  - DB와 Python 코드: `snake_case` (예: `created_at`)
  - API JSON과 TypeScript: `camelCase` (예: `createdAt`)
  - Python → JSON으로 바꿀 때 Pydantic의 별칭(alias) 기능으로 이름을 바꾼다. (4-2 참고)
- ORM 없이 psycopg 3로 SQL을 직접 쓴다.
- DB 테이블은 v0.3부터 쓴다. v0.1, v0.2에서도 API로 주고받는 **`Todo` 모양은 똑같이** 유지해서, 버전이 올라가도 화면 코드가 바뀌지 않게 한다.
- DB 인코딩은 `UTF8`로 한다(PostgreSQL 기본값). 한글과 이모지를 깨지지 않게 저장하기 위해서다.

## 2. 테이블: `todos`

할 일 하나가 한 행(row)입니다.

| 필드 (DB/Python) | 필드 (JSON/TS) | 타입 (PostgreSQL) | 제약조건 | 설명 |
|------------------|----------------|-------------------|----------|------|
| `id` | `id` | `UUID` | PRIMARY KEY, NOT NULL, 기본값 `gen_random_uuid()` | 할 일을 구분하는 고유 번호. 완료 전환(F-03), 삭제(F-04) 때 어떤 할 일인지 찾는 데 쓴다. |
| `title` | `title` | `TEXT` | NOT NULL | 할 일 제목. 앞뒤 공백을 지운 값을 저장한다. 1~100자 규칙은 서버의 Pydantic으로 검사한다. (3장 참고) |
| `completed` | `completed` | `BOOLEAN` | NOT NULL, 기본값 `FALSE` | 완료 여부. 새로 추가하면 미완료(`false`)로 시작한다. (F-03) |
| `created_at` | `createdAt` | `TIMESTAMPTZ` | NOT NULL, 기본값 `now()` | 만든 시각. 최신순 정렬에 쓴다. (F-02) |

### 왜 이렇게 정했나
- **`id`를 `UUID`로 한 이유**: PostgreSQL에는 UUID 전용 타입이 있어서 그대로 쓴다. v0.1(브라우저 `crypto.randomUUID()`), v0.2(파이썬 `uuid.uuid4()`)에서도 같은 모양의 id를 만들 수 있어서 버전이 바뀌어도 API 모양이 같다.
- **id를 DB가 만드는 이유**: PostgreSQL은 `INSERT ... RETURNING`으로 저장한 행을 바로 돌려준다. DB가 만든 id를 그 자리에서 받을 수 있어서 서버가 미리 만들 필요가 없다. (`gen_random_uuid()`는 PostgreSQL 13부터 기본 제공)
- **`created_at`을 `TIMESTAMPTZ`로 한 이유**: 시간대 정보를 함께 저장해서 배포 환경(v1.0)의 서버 시간대가 달라도 순서가 꼬이지 않는다. 마이크로초(100만분의 1초)까지 저장해서 짧은 시간에 여러 개를 추가해도 순서가 구분된다.
- **`updated_at`을 넣지 않은 이유**: MVP에 "수정" 기능이 없고, 수정 시각을 보여주라는 요구도 없다. v0.4(수정 기능)에서 필요해지면 그때 추가를 검토한다.
- **인덱스를 따로 만들지 않는 이유**: 혼자 쓰는 앱이라 행이 많지 않아서 `created_at` 정렬에 인덱스가 없어도 충분히 빠르다. 기본 키(`id`)에는 인덱스가 자동으로 생긴다.

### 정렬 규칙
- 목록은 `created_at` 내림차순(최근 것이 위)으로 읽는다. (F-02)
- 완료한 항목도 같은 순서를 따른다. 정렬 조건에 `completed`를 넣지 않는다. → `ORDER BY created_at DESC`

### 테이블 생성 SQL (`backend/sql/schema.sql`)
v0.3을 시작할 때 PostgreSQL에서 **한 번 직접 실행**해 테이블을 만듭니다.

```sql
CREATE TABLE todos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  completed  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 3. 제목 길이 제약에 대해
- 기준: 앞뒤 공백을 지운 뒤, 눈에 보이는 글자 하나를 1자로 센다. (PRD 9. 결정된 것)
- 검사는 화면(Zod)과 서버(Pydantic) 두 곳에서 한다. 진짜 관문은 서버다. (TRD 6장)
- DB에는 `CHECK (char_length(title) BETWEEN 1 AND 100)` 같은 길이 제약을 **걸지 않는다**.
  - 이유: PostgreSQL의 `char_length`는 눈에 보이는 글자가 아니라 유니코드 코드 포인트 단위로 센다. 그래서 이모지 "👍🏻"를 2자로 센다. 앱의 기준(1자)과 달라서, 이모지가 많은 제목은 "검사는 통과했는데 DB에서 거절"될 수 있다.
  - 같은 이유로 `VARCHAR(100)` 대신 `TEXT`를 쓴다.
  - 서버의 Pydantic 검사를 통과한 값만 DB에 들어가므로 길이 규칙은 지켜진다.

## 4. 타입 예시

### 4-1. 화면 타입 — TypeScript (`src/types/todo.ts`)
화면에서 쓰는 타입입니다. v0.1부터 사용합니다. API 응답 모양과 같습니다.

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

- `createdAt`을 `Date`가 아니라 `string`으로 둔 이유: 서버가 JSON으로 응답하면 날짜는 문자열로 온다. 타입을 실제 받는 값과 맞춰서 헷갈리지 않게 한다.

### 4-2. 서버 모델 — Pydantic (`backend/app/schemas.py`, v0.2부터)

```python
from datetime import datetime, timezone
from uuid import UUID

import regex
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictStr, field_serializer, field_validator


def count_chars(s: str) -> int:
    """눈에 보이는 글자 수 세기 (이모지 "👍🏻"도 1자)"""
    return len(regex.findall(r"\X", s))


class NewTodoIn(BaseModel):
    """POST /api/todos 요청"""

    model_config = ConfigDict(extra="forbid")  # title 말고 다른 필드가 오면 거절

    title: StrictStr  # 숫자 같은 다른 타입은 거절

    @field_validator("title")
    @classmethod
    def check_title(cls, v: str) -> str:
        v = v.strip()  # 앞뒤 공백 제거
        if count_chars(v) < 1:
            raise ValueError("제목을 입력해 주세요.")
        if count_chars(v) > 100:
            raise ValueError("제목은 100자 이하로 입력해 주세요.")
        return v  # 공백을 지운 값이 저장된다


class UpdateTodoIn(BaseModel):
    """PATCH /api/todos/{id} 요청"""

    model_config = ConfigDict(extra="forbid")

    completed: StrictBool  # "true", 1 같은 값은 거절


class TodoOut(BaseModel):
    """응답에 들어가는 할 일 하나 (JSON 이름은 camelCase)"""

    id: UUID
    title: str
    completed: bool
    created_at: datetime = Field(serialization_alias="createdAt")

    @field_serializer("created_at")
    def format_created_at(self, v: datetime) -> str:
        # UTC, 밀리초까지, 끝에 Z → "2026-10-23T05:30:00.000Z"
        return v.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
```

- `StrictStr`, `StrictBool`을 쓰는 이유: Pydantic은 기본으로 `"true"`나 `1`을 `True`로 바꿔 받아 준다. API_SPEC은 이런 값을 거절하기로 했으므로 엄격한 타입을 쓴다.
- 검사 실패 문구(`ValueError`의 문장)는 API 응답의 `message`로 그대로 쓴다. Pydantic이 문구 앞에 `"Value error, "`를 붙이므로, FastAPI의 오류 처리기에서 원래 문구만 꺼내 쓴다. (API_SPEC 1-5)
- `title`이 없거나 문자열이 아닐 때, `completed`가 boolean이 아닐 때의 문구는 Pydantic이 만들지 않는다. 이 문구들도 오류 처리기에서 정해 준다. (API_SPEC 1-5 표)
- 응답을 만들 때 `model_dump(by_alias=True)`로 `created_at`을 `createdAt`으로 바꿔 보낸다.

### 4-3. Zod 스키마 — 화면 검사 (`src/lib/validation/todo.ts`)

```ts
import { z } from "zod";

// 눈에 보이는 글자 수 세기 (이모지 "👍🏻"도 1자)
const segmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });
const countChars = (s: string) => [...segmenter.segment(s)].length;

// 할 일 추가 입력 검사 (화면에서 서버에 보내기 전에 사용)
export const newTodoSchema = z.strictObject({
  title: z
    .string()
    .trim() // 앞뒤 공백 제거
    .refine((s) => countChars(s) >= 1, "제목을 입력해 주세요.")
    .refine((s) => countChars(s) <= 100, "제목은 100자 이하로 입력해 주세요."),
});
```

- `.min()`, `.max()`를 쓰지 않는 이유: 이 둘은 `.length`로 세서 이모지 "👍🏻"를 4자로 센다.
- 문구는 4-2의 Pydantic 문구와 **똑같이** 맞춘다.

### 4-4. SQL 사용 예시 — psycopg 3 (할 일 추가, v0.3부터)

```python
from psycopg.rows import dict_row

# 저장하고, 저장된 행을 바로 돌려받는다 (RETURNING)
# 값은 %s 자리에 따로 넘긴다 (SQL 인젝션 방지)
with conn.cursor(row_factory=dict_row) as cur:
    cur.execute(
        "INSERT INTO todos (title) VALUES (%s) RETURNING id, title, completed, created_at",
        (data.title,),
    )
    row = cur.fetchone()
conn.commit()

todo = TodoOut(**row)
```

- 접속 주소는 환경 변수 `DATABASE_URL`(`backend/.env`)에서 읽는다.
- `dict_row`를 쓰면 행이 `{"id": ..., "title": ...}` 같은 딕셔너리로 와서 `TodoOut`에 바로 넣을 수 있다.

## 5. 버전별 저장 방식

| 버전 | 저장 위치 | `id` 만드는 곳 | `createdAt` 만드는 곳 |
|------|-----------|----------------|-----------------------|
| v0.1 | 브라우저 메모리 (localStorage 여부 **미결정**) | 브라우저 `crypto.randomUUID()` | 브라우저 `new Date().toISOString()` |
| v0.2 | FastAPI 메모리 (`list[TodoOut]`) | 서버 `uuid.uuid4()` | 서버 `datetime.now(timezone.utc)` |
| v0.3~ | PostgreSQL `todos` 테이블 | DB 기본값 `gen_random_uuid()` | DB 기본값 `now()` |

## 6. 결정이 필요한 것
- v0.1에서 localStorage를 쓸지 → 쓴다면 `Todo[]`를 JSON 문자열로 저장한다.
- PostgreSQL을 어디에 둘지 (로컬 설치, 클라우드 서비스 등) → 접속 주소는 `backend/.env`의 `DATABASE_URL`에 둔다.
