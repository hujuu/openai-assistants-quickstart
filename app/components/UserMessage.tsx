import React from "react";
import styles from "./chat.module.css";

type UserMessageProps = {
    text: string;
};

const UserMessage: React.FC<UserMessageProps> = ({ text }) => {
    return <div className={styles.userMessage}>{text}</div>;
};

export default UserMessage;
