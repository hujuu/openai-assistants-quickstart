"use client";

import React from "react";
import styles from "./page.module.css";
import Chat from "@/app/components/chat";
import ChatStream from "@/app/components/chat-stream";
import {useAuth} from "@/app/hooks/useAuth";

const Home = () => {
  useAuth();
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <ChatStream />
      </div>
    </main>
  );
};

export default Home;
