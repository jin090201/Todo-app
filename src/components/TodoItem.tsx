"use client";

import { useId, useState } from "react";
import type { Todo } from "@/types/todo";

export type TodoItemProps = {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

// 할 일 한 줄: 체크박스 + 제목 + 삭제 버튼 (COMPONENT_SPEC 3-4)
export default function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const checkboxId = useId();
  // onToggle, onDelete가 끝날 때까지 버튼을 막는다
  const [busy, setBusy] = useState(false);

  // 일이 끝날 때까지(실패해도) busy로 둔다
  async function runWhileBusy(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  const handleToggle = () => runWhileBusy(() => onToggle(todo.id, !todo.completed));
  const handleDelete = () => runWhileBusy(() => onDelete(todo.id));

  return (
    <li className="flex items-center gap-2 py-1">
      <input
        id={checkboxId}
        type="checkbox"
        aria-label={todo.title}
        checked={todo.completed}
        disabled={busy}
        onChange={handleToggle}
      />
      <label htmlFor={checkboxId} className="flex-1">
        {todo.title}
      </label>
      <button
        type="button"
        aria-label={`'${todo.title}' 삭제`}
        disabled={busy}
        onClick={handleDelete}
        className="rounded border px-2 text-sm disabled:opacity-50"
      >
        삭제
      </button>
    </li>
  );
}
