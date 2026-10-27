import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TodoItem from "@/components/TodoItem";
import type { Todo } from "@/types/todo";

// 테스트에 쓸 할 일
const todo: Todo = {
  id: "3f1c2a9e-8b4d-4c1a-9e2f-7a6b5c4d3e2f",
  title: "우유 사기",
  completed: false,
  createdAt: "2026-10-23T05:30:00.000Z",
};

// 끝나는 시점을 테스트에서 정할 수 있는 Promise
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

// 할 일 한 줄 (COMPONENT_SPEC 3-4, TEST_CASES 2-3)
describe("TodoItem", () => {
  test("UI-23 완료 할 일의 체크박스를 누르면 onToggle(id, false)가 불린다", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn((_id: string, _completed: boolean) => Promise.resolve());
    render(
      <TodoItem todo={{ ...todo, completed: true }} onToggle={onToggle} onDelete={jest.fn()} />,
    );

    await user.click(screen.getByRole("checkbox", { name: "우유 사기" }));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(todo.id, false);
  });

  test("UI-24 onToggle이 끝나기 전에는 체크박스가 비활성화되고, 끝나면 다시 활성화된다", async () => {
    const user = userEvent.setup();
    const toggle = deferred();
    const onToggle = jest.fn((_id: string, _completed: boolean) => toggle.promise);
    render(<TodoItem todo={todo} onToggle={onToggle} onDelete={jest.fn()} />);

    const checkbox = screen.getByRole("checkbox", { name: "우유 사기" });
    await user.click(checkbox);

    // 응답 전: 비활성화
    expect(checkbox).toBeDisabled();

    // 응답 후: 다시 활성화
    toggle.resolve();
    await waitFor(() => expect(checkbox).toBeEnabled());
  });

  test("UI-25 \"'우유 사기' 삭제\" 버튼을 누르면 확인 창 없이 onDelete(id)가 불린다", async () => {
    const user = userEvent.setup();
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    const onDelete = jest.fn((_id: string) => Promise.resolve());
    render(<TodoItem todo={todo} onToggle={jest.fn()} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "'우유 사기' 삭제" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(todo.id);
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  test("UI-26 onDelete가 끝나기 전에는 삭제 버튼이 비활성화된다", async () => {
    const user = userEvent.setup();
    const remove = deferred();
    const onDelete = jest.fn((_id: string) => remove.promise);
    render(<TodoItem todo={todo} onToggle={jest.fn()} onDelete={onDelete} />);

    const deleteButton = screen.getByRole("button", { name: "'우유 사기' 삭제" });
    await user.click(deleteButton);

    expect(deleteButton).toBeDisabled();

    // 테스트가 끝나기 전에 정리 (끝난 뒤 화면이 바뀌는 것까지 기다린다)
    await act(async () => {
      remove.resolve();
    });
  });
});
