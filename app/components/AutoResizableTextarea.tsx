import React, { useRef } from "react";
import styles from "./chat.module.css";

type AutoResizableTextareaProps = {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string; // オプション
};

const AutoResizableTextarea: React.FC<AutoResizableTextareaProps> = ({
                                                                         value,
                                                                         onChange,
                                                                         placeholder,
                                                                     }) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e); // 親コンポーネントに入力状態を通知

        const textarea = textareaRef.current;

        if (textarea) {
            // 高さをリセットしてから計算 (スクロール位置をリセット)
            textarea.style.height = "auto";
            // スクロール高さを取得して高さを調整
            const maxHeight = 200; // 最大高さ(px)
            if (textarea.scrollHeight > maxHeight) {
                textarea.style.height = `${maxHeight}px`; // 最大値に固定
                textarea.style.overflowY = "scroll"; // スクロールを有効に
            } else {
                textarea.style.height = `${textarea.scrollHeight}px`; // 自動調整
                textarea.style.overflowY = "hidden"; // スクロール無効
            }
        }
    };

    return (
        <textarea
            ref={textareaRef}
            className={styles.input}
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            style={{
                resize: "none", // 手動でサイズ変更できないように
                overflow: "hidden", // 初期状態でスクロールバーを非表示
            }}
        />
    );
};

export default AutoResizableTextarea;
