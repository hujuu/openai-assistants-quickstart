import { assistantId } from "@/app/assistant-config";
import { openai } from "@/app/openai";

// upload file to assistant's vector store
export async function POST(request: Request) {
  const formData = await request.formData(); // process file as FormData
  const file = formData.get("file"); // retrieve the single file from FormData
  const vectorStoreId = await getOrCreateVectorStore(); // get or create vector store

  if (!file || !(file instanceof File)) {
    // Check for null or invalid type
    return new Response("Invalid file input", { status: 400 });
  }

  // upload using the file stream
  const openaiFile = await openai.files.create({
    file: file,
    purpose: "assistants",
  });

  // add file to vector store
  await openai.beta.vectorStores.files.create(vectorStoreId, {
    file_id: openaiFile.id,
  });
  return new Response();
}

// list files in assistant's vector store
export async function GET() {
  const vectorStoreId = await getOrCreateVectorStore(); // get or create vector store
  const fileList = await openai.beta.vectorStores.files.list(vectorStoreId);

  const filesArray = await Promise.all(
    fileList.data.map(async (file) => {
      const fileDetails = await openai.files.retrieve(file.id);
      const vectorFileDetails = await openai.beta.vectorStores.files.retrieve(
        vectorStoreId,
        file.id
      );
      return {
        file_id: file.id,
        filename: fileDetails.filename,
        status: vectorFileDetails.status,
      };
    })
  );
  return Response.json(filesArray);
}

// delete file from assistant's vector store
export async function DELETE(request: Request) {
  const body = await request.json();
  const fileId = body.fileId;

  const vectorStoreId = await getOrCreateVectorStore(); // get or create vector store
  await openai.beta.vectorStores.files.del(vectorStoreId, fileId); // delete file from vector store

  return new Response();
}

/* Helper functions */

const getOrCreateVectorStore = async () => {
  if (!assistantId) {
    throw new Error("Assistant ID is not defined");
  }

  const assistant = await openai.beta.assistants.retrieve(assistantId);

  // if the assistant already has a vector store, return it
  const vectorStoreIds = assistant.tool_resources?.file_search?.vector_store_ids;
  if (vectorStoreIds && vectorStoreIds.length > 0) {
    return vectorStoreIds[0]; // Return the first vector store ID
  }
  // otherwise, create a new vector store and attatch it to the assistant
  const vectorStore = await openai.beta.vectorStores.create({
    name: "sample-assistant-vector-store",
  });
  await openai.beta.assistants.update(assistantId, {
    tool_resources: {
      file_search: {
        vector_store_ids: [vectorStore.id],
      },
    },
  });
  return vectorStore.id;
};
