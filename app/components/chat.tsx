"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream";
import Markdown from "react-markdown";
// @ts-expect-error - no types for this yet
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";
import AutoResizableTextarea from "@/app/components/AutoResizableTextarea";
import { TextDelta } from "openai/resources/beta/threads/messages";

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
};

const UserMessage = ({ text }: { text: string }) => {
  return <div className={styles.userMessage}>{text}</div>;
};

const AssistantMessage = ({ text }: { text: string }) => {
  return (
    <div className={styles.assistantMessage}>
      <Markdown>{text}</Markdown>
    </div>
  );
};

const CodeMessage = ({ text }: { text: string }) => {
  return (
    <div className={styles.codeMessage}>
      {text.split("\n").map((line, index) => (
        <div key={index}>
          <span>{`${index + 1}. `}</span>
          {line}
        </div>
      ))}
    </div>
  );
};

const Message = ({ role, text }: MessageProps) => {
  switch (role) {
    case "user":
      return <UserMessage text={text} />;
    case "assistant":
      return <AssistantMessage text={text} />;
    case "code":
      return <CodeMessage text={text} />;
    default:
      return null;
  }
};

type ChatProps = {
  functionCallHandler?: (
    toolCall: RequiredActionFunctionToolCall
  ) => Promise<string>;
};

const Chat = ({
  functionCallHandler = () => Promise.resolve(""), // default to return empty string
}: ChatProps) => {
  const params = useParams();
  const [chatId, setChatId] = useState<string | undefined>(params?.chatId as string | undefined);
  const chatIdRef = useRef<string | undefined>(params?.chatId as string | undefined);
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState<Array<MessageProps>>([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [threadId, setThreadId] = useState("");

  // automatically scroll to bottom of chat
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // create a new threadID when chat component created
  useEffect(() => {
    const fetchChatHistoryAndThread = async () => {
      if (chatId) {
        try {
          console.log(`Fetching thread for chatId: ${chatId}`);

          const threadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/${chatId}`);
          if (threadResponse.ok) {
            const threadData = await threadResponse.json();
            if (threadData?.thread_id) { // thread_id が存在する場合のみ処理を続行
              console.log(`Fetched existing thread_id: ${threadData.thread_id}`);
              setThreadId(threadData.thread_id); // threadId をセット
              setInputDisabled(false);

              // メッセージ履歴をフェッチ
              console.log(`Fetching messages for threadId: ${threadData.thread_id}`);
              const messagesResponse = await fetch(
                  `/api/assistants/threads/${threadData.thread_id}/messages`
              );
              if (messagesResponse.ok) {
                const history = await messagesResponse.json();

                const formattedMessages = history
                    .map((msg: any) => {
                      const content = msg.content
                          .filter((item: any) => item.type === "text") // テキストのみ抽出
                          .map((item: any) => item.text.value) // テキストの中身を取得
                          .join("\n"); // 必要に応じて連結

                      return {
                        role: msg.role, // メッセージの役割
                        text: content, // メッセージ本文
                      };
                    })
                    .reverse(); // 古いものから並べる

                setMessages(formattedMessages); // メッセージを更新
              } else {
                console.warn("Failed to fetch messages. Skipping...");
              }
            } else {
              console.error("threadData does not contain a valid thread_id.");
            }
          } else {
            console.warn("Failed to fetch threadId. Skipping...");
          }
        } catch (error) {
          console.error("Error fetching chat history and thread:", error);
        }
      } else {
        console.warn("chatId is missing. Skipping fetchChatHistoryAndThread.");
      }
    };

    fetchChatHistoryAndThread();
  }, [chatId]);

  const sendMessage = async (text: string) => {
    let currentThreadId = threadId;
    let currentChatId = chatId;
    if (!currentThreadId) {
      try {
        const threadResponse = await fetch(`/api/assistants/threads`, {
          method: "POST",
        });
        if (threadResponse.ok) {
          const threadData = await threadResponse.json();
          currentThreadId = threadData.threadId;
          currentChatId = threadData.result.chat.id;
          chatIdRef.current = currentChatId;
          setThreadId(currentThreadId);
          setChatId(currentChatId);
        } else {
          console.error("Failed to create a new thread:", threadResponse.statusText);
          return;
        }
      } catch (error) {
        console.error("Error while creating the thread:", error);
        return;
      }
    }

    const response = await fetch(
        `/api/assistants/threads/${currentThreadId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content: text }),
        }
    );

    // ヘッダーからmessageIdを取得
    const messageId = response.headers.get("X-Message-Id");
    console.log("Message ID: ", messageId);

    // ストリーム処理
    if (response.body) {
      const stream = AssistantStream.fromReadableStream(response.body);
      handleReadableStream(stream);
    } else {
      console.error("Response body is null");
    }
  };

  const submitActionResult = async (runId: string, toolCallOutputs: any) => {
    const response = await fetch(
      `/api/assistants/threads/${threadId}/actions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId: runId,
          toolCallOutputs: toolCallOutputs,
        }),
      }
    );
    if (response.body) {
      const stream = AssistantStream.fromReadableStream(response.body);
      handleReadableStream(stream);
    } else {
      console.error("Response body is null");
    }
  };

  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    sendMessage(userInput);
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", text: userInput },
    ]);
    setUserInput("");
    setInputDisabled(true);
    scrollToBottom();
  };

  /* Stream Event Handlers */

  // textCreated - create new assistant message
  const handleTextCreated = () => {
    appendMessage("assistant", "");
  };

  // textDelta - append text to last assistant message
  const handleTextDelta = (delta: TextDelta) => {
    if (delta.value != null) {
      appendToLastMessage(delta.value);
    }
    if (delta.annotations != null) {
      annotateLastMessage(delta.annotations);
    }
  };
  
  // imageFileDone - handling only when image exists
  const handleImageFileDone = (image: { file_id: any } | null) => {
    if (!image || !image.file_id) return; // 画像がない場合は何もしない
    appendToLastMessage(`\n![${image.file_id}](/api/files/${image.file_id})\n`);
  }

  // toolCallCreated - log new tool call
  const toolCallCreated = (toolCall: { type: string; }) => {
    if (toolCall.type != "code_interpreter") return;
    appendMessage("code", "");
  };

  // toolCallDelta - log delta and snapshot for the tool call
  const toolCallDelta = (delta: { type: string; code_interpreter: { input: any; }; }) => {
    if (delta.type != "code_interpreter") return;
    if (!delta.code_interpreter.input) return;
    appendToLastMessage(delta.code_interpreter.input);
  };

  // handleRequiresAction - handle function call
  const handleRequiresAction = async (
    event: AssistantStreamEvent.ThreadRunRequiresAction
  ) => {
    const runId = event.data.id;
    const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
    // loop over tool calls and call function handler
    const toolCallOutputs = await Promise.all(
      toolCalls.map(async (toolCall: RequiredActionFunctionToolCall) => {
        const result = await functionCallHandler(toolCall);
        return { output: result, tool_call_id: toolCall.id };
      })
    );
    setInputDisabled(true);
    await submitActionResult(runId, toolCallOutputs);
  };

  // handleRunCompleted - re-enable the input form
  const handleRunCompleted = () => {
    setInputDisabled(false);
  };

  const handleReadableStream = (stream: AssistantStream) => {
    // messages
    stream.on("textCreated", handleTextCreated);
    stream.on("textDelta", handleTextDelta);
    // image
    stream.on("imageFileDone", handleImageFileDone);
    // code interpreter
    stream.on("toolCallCreated", toolCallCreated);
    // @ts-ignore
    stream.on("toolCallDelta", toolCallDelta);

    // events without helpers yet (e.g. requires_action and run.done)
    stream.on("event", (event) => {
      if (event.event === "thread.run.requires_action")
        handleRequiresAction(event);
      if (event.event === "thread.run.completed") handleRunCompleted();
    });
  };

  /*
    =======================
    === Utility Helpers ===
    =======================
  */

  const appendToLastMessage = (text: string) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
        text: lastMessage.text + text,
      };
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  };

  const appendMessage = (role: "user" | "assistant" | "code", text: string) => {
    setMessages((prevMessages) => [...prevMessages, { role, text }]);
  };

  const annotateLastMessage = (annotations: any[] | null) => {
    if (!annotations || annotations.length === 0) return; // 注釈がない場合は処理をスキップ
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
      };
      annotations.forEach((annotation) => {
        if (annotation.type === 'file_path') {
          updatedLastMessage.text = updatedLastMessage.text.replaceAll(
            annotation.text,
            `/api/files/${annotation.file_path.file_id}`
          );
        }
      })
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  }

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messages}>
        {messages.map((msg, index) => (
          <Message key={index} role={msg.role} text={msg.text} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        className={`${styles.inputForm} ${styles.clearfix}`}
      >
        <AutoResizableTextarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Enter your question"
        />
        <button
          type="submit"
          className={styles.button}
          disabled={inputDisabled}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
