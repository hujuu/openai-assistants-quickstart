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

async function postThreadData(threadId: string, userId: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      name: getCurrentTimestamp(),
      thread_id: threadId,
    }),
  });
  return response.json();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // userIdの取り出し（デフォルト値を設定可能）
    const userId = body.userId;
    const thread = await openai.beta.threads.create();
    const threadId = thread.id;

    const result = await postThreadData(threadId, userId);
    return new Response(JSON.stringify({ threadId: threadId, result: result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response('Error creating or posting thread', { status: 500 });
  }
}
