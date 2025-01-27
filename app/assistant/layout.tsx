import { Inter } from "next/font/google";
import Warnings from "../components/warnings";
import { assistantId } from "../assistant-config";
import ApplicationLayout from "@/app/dashboard/application-layout";
import type React from "react";
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Assistants API Quickstart",
  description: "A quickstart template using the Assistants API with OpenAI",
  icons: {
    icon: "/openai.svg",
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  return (
      <div>
        {assistantId ? <ApplicationLayout>{children}</ApplicationLayout> : <Warnings />}
      </div>
  );
}
