import { openai } from "@/app/openai";

// download file by file ID
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ fileId: string }> }
) {
  const [file, fileContent] = await Promise.all([
    openai.files.retrieve((await params).fileId),
    openai.files.content((await params).fileId),
  ]);
  return new Response(fileContent.body, {
    headers: {
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    },
  });
}
