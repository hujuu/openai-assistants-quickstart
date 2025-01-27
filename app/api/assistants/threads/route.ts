import { openai } from "@/app/openai";

function getCurrentTimestamp(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');  // 月は0から始まるので+1
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');  // 秒を追加

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

async function postThreadData(threadId: string) {
  const response = await fetch('http://localhost:8000/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      "user_id": "1",
      "name": getCurrentTimestamp(),
      "thread_id": threadId,
    }),
  });
  return response.json();
}

export async function POST() {
  try {
    const thread = await openai.beta.threads.create();
    const threadId = thread.id;

    const result = await postThreadData(threadId);
    return Response.json({ threadId: threadId, result: result });
  } catch (error) {
    return new Response('Error creating or posting thread', { status: 500 });
  }
}
