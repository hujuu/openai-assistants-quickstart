import { Inter } from "next/font/google";
import Warnings from "../components/warnings";
import { assistantId } from "../assistant-config";
import {ApplicationLayout} from "@/app/dashboard/application-layout";
import type React from "react";
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Assistants API Quickstart",
  description: "A quickstart template using the Assistants API with OpenAI",
  icons: {
    icon: "/openai.svg",
  },
};
async function getEvents() {
  try {
    const response = await fetch('http://localhost:8000/chat');
    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }
    const data = await response.json();
    return data.map((event: any) => ({
      id: event.id,
      name: event.name,
      thread_id: event.thread_id,
      user_id: event.user_id,
      url: `/chat/${event.thread_id}`, // リンク用に追加
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
}
// @ts-ignore
export default async function RootLayout({ children }) {
  let events = await getEvents()
  return (
      <div>
        {assistantId ? <ApplicationLayout events={events}>{children}</ApplicationLayout> : <Warnings />}
      </div>
  );
}
