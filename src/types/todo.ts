// 할 일 하나 (DATA_MODEL 4-1)
export type Todo = {
  id: string; // uuid
  title: string; // 1~100자
  completed: boolean; // 완료 여부
  // 서버가 JSON으로 보내면 날짜는 문자열로 오므로 Date가 아니라 ISO 문자열로 둔다 (예: "2026-10-23T05:30:00.000Z")
  createdAt: string;
};
