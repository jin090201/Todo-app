import TodoItem from "@/components/TodoItem";
import type { Todo } from "@/types/todo";

export type TodoListProps = {
  todos: Todo[]; // 이미 최신순으로 정렬된 목록 (API 응답 순서 그대로)
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

// 빈 목록 문구 (COMPONENT_SPEC 4장)
const EMPTY_MESSAGE = "아직 할 일이 없습니다. 위에서 새 할 일을 추가해 보세요.";

// 할 일 목록: 받은 순서대로 TodoItem을 그린다 (COMPONENT_SPEC 3-3)
export default function TodoList({ todos, onToggle, onDelete }: TodoListProps) {
  if (todos.length === 0) {
    return <p className="py-4 text-gray-500">{EMPTY_MESSAGE}</p>;
  }

  // <li>는 TodoItem 안에 있다
  return (
    <ul>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </ul>
  );
}
