"use client";
import { useAuth } from "../hooks/useAuth";
import styles from "../examples/shared/page.module.css";
import Chat from "../components/chat";
import FileViewer from "../components/file-viewer";

const FileSearchPage = () => {
  useAuth(); // ログインチェックのみ実行

  return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.column}>
            <FileViewer />
          </div>
          <div className={styles.chatContainer}>
            <div className={styles.chat}>
              <Chat />
            </div>
          </div>
        </div>
      </main>
  );
};

export default FileSearchPage;
