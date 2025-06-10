"use client";

import { ReactNode, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import styles from "./styles.module.css";
import { FaX } from "react-icons/fa6";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
}

export default function Modal({ isOpen, onClose, children, title }: ModalProps) {

    const [rootContainer, setRoot] = useState<HTMLElement|null>(null);
    // Ensure #modal-root exists
    useEffect(() => {
        let root = document.getElementById("modal-root");
        if (!root) {
            root = document.createElement("div");
            root.id = "modal-root";
            document.body.append(root);
        }
        setRoot(root);
    }, []);

    // Lock scroll & listen for ESC
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        // Prevent scroll when modal is open
        if (isOpen) {
            document.body.style.overflow = "hidden";
            document.addEventListener("keydown", onKey);
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("keydown", onKey);
        };

    }, [isOpen, onClose]);

    if (!rootContainer) return null;

    return ReactDOM.createPortal(
        <div className={`${styles.backdrop} ${isOpen ? styles.open : ""}`} onClick={onClose}>
            <div className={`${styles.modal} ${isOpen ? styles.open : ""}`} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.title}>{title}</h2>
                <button className={styles.closeButton} onClick={onClose}>
                    <FaX />
                </button>
                {children}
            </div>
        </div>,
        rootContainer
    );
}