# CLAUDE.md - Todo App

## 프로젝트 개요

혼자 쓰는 간단한 할 일 목록 웹 앱 (초보자 학습용)

## 기술 스택

- 프론트엔드: Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS
- 백엔드: Python 3.12+, FastAPI, Pydantic (v0.2부터)
- DB: PostgreSQL + psycopg 3 (v0.3부터, ORM 없이 SQL 직접 작성, 호스팅 위치는 미결정)
- 검증: 화면은 Zod, 서버는 Pydantic (같은 규칙을 양쪽에)
- 테스트: 화면은 Jest + React Testing Library, 서버는 pytest
- 화면의 `/api/*` 요청은 Next.js rewrites로 FastAPI(`:8000`)에 넘김

## 폴더 구조

- `app/`: 페이지 (API 라우트는 만들지 않음)
- `src/components/`: 화면 컴포넌트
- `src/lib/`: 화면 쪽 공통 로직 (Zod 스키마, API 호출 함수)
- `src/types/`: 화면 쪽 타입
- `tests/`: 화면 테스트 (`src/`와 같은 폴더 구조, 예: `tests/components/TodoForm.test.tsx`)
- `backend/app/`: FastAPI 서버 코드
- `backend/sql/`: 테이블 생성 SQL
- `backend/tests/`: 서버 테스트
- `docs/`: 명세 문서

## 반드시 참고할 문서

- `docs/PRD.md`, `docs/TRD.md`, `docs/DATA_MODEL.md`
- `docs/API_SPEC.md`, `docs/COMPONENT_SPEC.md`, `docs/TEST_CASES.md`

## 규칙

- 명세에 없는 기능을 임의로 추가하지 말 것
- `any` 타입 금지 (Python은 `Any` 금지, 타입 힌트 필수)
- 한 번에 한 기능만 작업하고, 끝나면 무엇을 바꿨는지 요약할 것
- 테스트를 삭제하거나 스킵하지 말 것
- 테스트가 실패하면 테스트가 아닌 구현을 고칠 것
- `console.log`, `print`는 디버깅 후 제거할 것
- 초보자가 이해할 수 있게 주석은 한국어로 짧게

## 자주 쓰는 명령

- 화면 개발 서버: `npm run dev`
- 화면 테스트: `npm test` (결과는 `tests/results/`에 `test-output.txt`(읽기용)와 `test-results.json`으로 저장, git에는 올리지 않음)
- 백엔드 서버 (backend 폴더, 가상환경 켠 뒤): `uvicorn app.main:app --reload --port 8000`
- 백엔드 테스트 (backend 폴더): `pytest`
