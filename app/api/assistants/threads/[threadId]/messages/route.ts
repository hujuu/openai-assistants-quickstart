import { assistantId } from "@/app/assistant-config";
import { openai } from "@/app/openai";

export const runtime = "nodejs";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;

  try {
    const threadMessages = await openai.beta.threads.messages.list(threadId);

    const messages = threadMessages?.data;

    return new Response(JSON.stringify(messages), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: "メッセージの取得に失敗しました。" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

// Send a new message to a thread
export async function POST(
    request: Request,
    { params }: { params: Promise<{ threadId: string }> }
) {
  const { content } = await request.json();

  const messageResponse = await openai.beta.threads.messages.create((await params).threadId, {
    role: "user",
    content: content,
  });

  const messageId = messageResponse?.id; // メッセージIDを取得

  if (!assistantId) {
    throw new Error("assistantId が未定義です。正しい設定を確認してください。");
  }

  const stream = openai.beta.threads.runs.stream((await params).threadId, {
    assistant_id: assistantId,
  });

  const headers = new Headers({
    "Content-Type": "application/octet-stream",
  });
  if (messageId) headers.set("X-Message-Id", messageId);

  return new Response(stream.toReadableStream(), { headers });
}
