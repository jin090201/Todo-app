import { render, screen } from "@testing-library/react";
import TodoForm from "@/components/TodoForm";

// 제목 입력창 + 추가 버튼 (COMPONENT_SPEC 3-2, TEST_CASES 2-1)
describe("TodoForm", () => {
  test('UI-01 처음 그리면 "할 일" 입력창과 "추가" 버튼이 보이고 에러 문구는 없다', () => {
    render(<TodoForm onAdd={jest.fn()} />);

    // "할 일" 라벨로 찾은 입력창과 placeholder
    expect(screen.getByLabelText("할 일")).toHaveAttribute("placeholder", "할 일을 입력하세요");
    // "추가" 버튼
    expect(screen.getByRole("button", { name: "추가" })).toBeInTheDocument();
    // 에러 문구(role="alert") 없음
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
