import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import styles from "./styles.module.css";

type Variant = "success" | "error" | "info";
interface Toast { id: string; message: string; variant: Variant; }

const ToastCtx = createContext<(v: Variant, msg: string) => void>(() => {});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((variant: Variant, message: string) => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, variant, message }]);

    // auto-dismiss after 3 s
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  return (
    <ToastCtx.Provider value={add}>
      {children}
      <ToastStack toasts={toasts} />
    </ToastCtx.Provider>
  );
};

const ToastStack: React.FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className={styles.toastStack}>
    {toasts.map(({ id, variant, message }) => (
      <div key={id} className={`${styles.toast} ${styles[`toast--${variant}`]}`}>
        {message}
      </div>
    ))}
  </div>
);

export const useRawToast = () => useContext(ToastCtx);