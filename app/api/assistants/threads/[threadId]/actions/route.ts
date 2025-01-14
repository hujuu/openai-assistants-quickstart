import { openai } from "@/app/openai";

type ThreadIdParams = {
  params: {
    threadId: string;
  };
};

// Send a new message to a thread
export async function POST(request: Request, { params: { threadId } }: ThreadIdParams) {
  const { toolCallOutputs, runId } = await request.json();

  const stream = openai.beta.threads.runs.submitToolOutputsStream(
    threadId,
    runId,
    // { tool_outputs: [{ output: result, tool_call_id: toolCallId }] },
    { tool_outputs: toolCallOutputs }
  );

  return new Response(stream.toReadableStream());
}
