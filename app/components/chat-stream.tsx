"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream";
import Markdown from "react-markdown";
import { AssistantStreamEvent } from "openai/resources/beta/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";
import AutoResizableTextarea from "@/app/components/AutoResizableTextarea";
import { TextDelta } from "openai/resources/beta/threads/messages";

type MessageProps = {
    role: "user" | "assistant" | "code";
    text: string;
};

const UserMessage = ({ text }: { text: string }) => (
    <div className={styles.userMessage}>{text}</div>
);

const AssistantMessage = ({ text }: { text: string }) => (
    <div className={styles.assistantMessage}>
        <Markdown>{text}</Markdown>
    </div>
);

const CodeMessage = ({ text }: { text: string }) => (
    <div className={styles.codeMessage}>
        {text.split("\n").map((line, index) => (
            <div key={index}>
                <span>{`${index + 1}. `}</span>
                {line}
            </div>
        ))}
    </div>
);

const Message = ({ role, text }: MessageProps) => {
    switch (role) {
        case "user": return <UserMessage text={text} />;
        case "assistant": return <AssistantMessage text={text} />;
        case "code": return <CodeMessage text={text} />;
        default: return null;
    }
};

type ChatProps = {
    functionCallHandler?: (toolCall: RequiredActionFunctionToolCall) => Promise<string>;
};

const Chat = ({
                  functionCallHandler = () => Promise.resolve(""),
              }: ChatProps) => {
    const [userInput, setUserInput] = useState("");
    const [messages, setMessages] = useState<Array<MessageProps>>([]);
    const [inputDisabled, setInputDisabled] = useState(false);
    const [threadId, setThreadId] = useState("");
    const [isMessageSaved, setIsMessageSaved] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const fetchChatHistory = async () => {
            try {
                const response = await fetch("http://localhost:8000/message/1");
                if (!response.ok) throw new Error("Failed to fetch chat history");

                const history = await response.json();
                const formattedMessages = history.map((msg: { role: string; content: string; }) => ({
                    role: msg.role,
                    text: msg.content
                }));
                setMessages(formattedMessages);
            } catch (error) {
                console.error("Error fetching chat history:", error);
            }
        };

        const createThread = async () => {
            const res = await fetch("/api/assistants/threads", { method: "POST" });
            const data = await res.json();
            setThreadId(data.threadId);
        };

        fetchChatHistory();
        createThread();
    }, []);

    const saveMessageToServer = async (message: { chat_id: string; content: string; role: string }) => {
        try {
            const response = await fetch("http://localhost:8000/message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(message),
            });

            if (!response.ok && response.status !== 409) {
                console.error("Failed to save message:", await response.text());
            }
        } catch (error) {
            console.error("Error saving message:", error);
        }
    };

    const sendMessage = async (text: string) => {
        await saveMessageToServer({
            chat_id: "1",
            content: text,
            role: "user",
        });

        const response = await fetch(`/api/assistants/threads/${threadId}/messages`, {
            method: "POST",
            body: JSON.stringify({ content: text }),
        });

        if (response.body) {
            const stream = AssistantStream.fromReadableStream(response.body);
            handleReadableStream(stream);
        }
    };

    const submitActionResult = async (runId: string, toolCallOutputs: any) => {
        const response = await fetch(`/api/assistants/threads/${threadId}/actions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ runId, toolCallOutputs }),
        });

        if (response.body) {
            const stream = AssistantStream.fromReadableStream(response.body);
            handleReadableStream(stream);
        }
    };

    const handleSubmit = (e: { preventDefault: () => void }) => {
        e.preventDefault();
        if (!userInput.trim()) return;

        sendMessage(userInput);
        setMessages(prev => [...prev, { role: "user", text: userInput }]);
        setUserInput("");
        setInputDisabled(true);
        scrollToBottom();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
        } else if (e.key === "Enter" && e.shiftKey) {
            setUserInput(prev => prev + "\n");
        }
    };

    const handleTextCreated = () => appendMessage("assistant", "");

    const handleTextDelta = (delta: TextDelta) => {
        if (delta.value) appendToLastMessage(delta.value);
        if (delta.annotations) annotateLastMessage(delta.annotations);
    };

    const handleImageFileDone = (image: { file_id: string }) => {
        appendToLastMessage(`\n![${image.file_id}](/api/files/${image.file_id})\n`);
    };

    const toolCallCreated = (toolCall: { type: string }) => {
        if (toolCall.type === "code_interpreter") appendMessage("code", "");
    };

    const toolCallDelta = (delta: { type: string; code_interpreter?: { input: string } }) => {
        if (delta.type === "code_interpreter" && delta.code_interpreter?.input) {
            appendToLastMessage(delta.code_interpreter.input);
        }
    };

    const handleRequiresAction = async (event: AssistantStreamEvent.ThreadRunRequiresAction) => {
        const runId = event.data.id;
        // @ts-ignore
        const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;

        const toolCallOutputs = await Promise.all(
            toolCalls.map(async (toolCall: RequiredActionFunctionToolCall) => ({
                output: await functionCallHandler(toolCall),
                tool_call_id: toolCall.id
            }))
        );

        setInputDisabled(true);
        await submitActionResult(runId, toolCallOutputs);
    };

    const handleRunCompleted = () => {
        setInputDisabled(false);
        setIsMessageSaved(false);

        if (!isMessageSaved) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage) {
                saveMessageToServer({
                    chat_id: "1",
                    content: lastMessage.text || "",
                    role: lastMessage.role || "assistant",
                });
            }
            setIsMessageSaved(true);
        }
    };

    const handleReadableStream = (stream: AssistantStream) => {
        stream.on("textCreated", handleTextCreated);
        stream.on("textDelta", handleTextDelta);
        stream.on("imageFileDone", handleImageFileDone);
        stream.on("toolCallCreated", toolCallCreated);
        // @ts-ignore
        stream.on("toolCallDelta", toolCallDelta);
        stream.on("event", (event) => {
            if (event.event === "thread.run.requires_action") handleRequiresAction(event);
            if (event.event === "thread.run.completed") handleRunCompleted();
        });
    };

    const appendToLastMessage = (text: string) => {
        setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            return [...prev.slice(0, -1), { ...lastMessage, text: lastMessage.text + text }];
        });
    };

    const appendMessage = (role: string, text: string) => {
        setMessages(prev => [...prev, { role, text } as MessageProps]);
    };

    const annotateLastMessage = (annotations: any[]) => {
        setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            const updatedMessage = { ...lastMessage };

            annotations.forEach(annotation => {
                if (annotation.type === 'file_path') {
                    updatedMessage.text = updatedMessage.text.replaceAll(
                        annotation.text,
                        `/api/files/${annotation.file_path.file_id}`
                    );
                }
            });

            return [...prev.slice(0, -1), updatedMessage];
        });
    };

    return (
        <div className={styles.chatContainer}>
            <div className={styles.messages}>
                {messages.map((msg, index) => (
                    <Message key={index} role={msg.role} text={msg.text} />
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className={`${styles.inputForm} ${styles.clearfix}`}>
                <AutoResizableTextarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Enter your question"
                />
                <button type="submit" className={styles.button} disabled={inputDisabled}>
                    Send
                </button>
            </form>
        </div>
    );
};

export default Chat;
