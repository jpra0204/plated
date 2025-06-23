import { useRawToast } from "../lib/Toast";

export const useToast = () => {
  const push = useRawToast();
  return {
    success: (msg: string) => push("success", msg),
    error:   (msg: string) => push("error",   msg),
    info:    (msg: string) => push("info",    msg),
  };
};