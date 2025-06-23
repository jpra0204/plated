import React from "react";
import styles from "./styles.module.css";

interface InputTextProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
  id?: string;
}

export default function InputText({
  label,
  error,
  id,
  className,
  ...inputProps
}: InputTextProps) {
  const inputId = id || `textinput-${Math.random().toString(36).slice(2)}`;
  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <input id={inputId} className={`${styles.input} ${className}`} {...inputProps} />
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}