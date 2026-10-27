import { render, screen } from "@testing-library/react";
import TodoList from "@/components/TodoList";
import type { Todo } from "@/types/todo";

// 빈 목록 문구 (COMPONENT_SPEC 4장과 똑같이)
const EMPTY_MESSAGE = "아직 할 일이 없습니다. 위에서 새 할 일을 추가해 보세요.";

// 테스트용 할 일을 만든다. 바꾸고 싶은 값만 넘기면 된다
function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: "3f1c2a9e-8b4d-4c1a-9e2f-7a6b5c4d3e2f",
    title: "우유 사기",
    completed: false,
    createdAt: "2026-10-23T05:30:00.000Z",
    ...overrides,
  };
}

// 할 일 목록 (COMPONENT_SPEC 3-3, TEST_CASES 2-2)
describe("TodoList", () => {
  test("UI-15 할 일이 없으면 빈 목록 문구가 보이고 목록 항목은 없다", () => {
    render(<TodoList todos={[]} onToggle={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText(EMPTY_MESSAGE)).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  test("UI-18 할 일이 있으면 빈 목록 문구가 보이지 않는다", () => {
    const todos = [
      makeTodo({ id: "a1b2c3d4-0000-4000-8000-000000000001", title: "우유 사기" }),
      makeTodo({ id: "a1b2c3d4-0000-4000-8000-000000000002", title: "책 읽기" }),
    ];

    render(<TodoList todos={todos} onToggle={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.queryByText(EMPTY_MESSAGE)).not.toBeInTheDocument();
  });
});
