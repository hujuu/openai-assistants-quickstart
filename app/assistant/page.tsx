"use client";

import React from "react";
import styles from "./page.module.css";
import {useAuth} from "@/app/hooks/useAuth";
import ChatStream from "@/app/components/chat-stream";

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
