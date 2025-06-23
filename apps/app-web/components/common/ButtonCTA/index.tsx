import React from "react";
import styles from "./styles.module.css";

interface ButtonCTAProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function ButtonCTA({
  children,
  type = "button",
  disabled,
  ...rest
}: ButtonCTAProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={styles.button}
      {...rest}
    >
      {children}
    </button>
  );
}