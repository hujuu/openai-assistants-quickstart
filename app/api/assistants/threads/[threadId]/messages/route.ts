import { assistantId } from "@/app/assistant-config";
import { openai } from "@/app/openai";

export const runtime = "nodejs";

// Send a new message to a thread
export async function POST(
    request: Request,
    { params }: { params: Promise<{ threadId: string }> }
) {
  const { content } = await request.json();

  await openai.beta.threads.messages.create((await params).threadId, {
    role: "user",
    content: content,
  });

  if (!assistantId) {
    throw new Error("assistantId が未定義です。正しい設定を確認してください。");
  }

  const stream = openai.beta.threads.runs.stream((await params).threadId, {
    assistant_id: assistantId,
  });

  return new Response(stream.toReadableStream());
}
