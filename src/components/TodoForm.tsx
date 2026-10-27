// 추가 결과: 성공이면 입력창을 비우고, 실패면 message를 보여준다
export type AddResult = { ok: true } | { ok: false; message: string };

export type TodoFormProps = {
  onAdd: (title: string) => Promise<AddResult>;
};

// 제목 입력창 + 추가 버튼 (COMPONENT_SPEC 3-2)
export default function TodoForm(props: TodoFormProps) {
  return (
    <form>
      <label htmlFor="todo-title">할 일</label>
      <input id="todo-title" placeholder="할 일을 입력하세요" />
      <button type="submit">추가</button>
    </form>
  );
}
