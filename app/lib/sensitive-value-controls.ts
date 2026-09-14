import "client-only";

import { useCallback, useEffect, useRef, useState } from "react";
import { copySensitiveText } from "./sensitive-clipboard";

export type SensitiveCopyStatus = "idle" | "copied" | "error";

const COPY_FEEDBACK_MS = 2_000;

export function useSensitiveValueControls(value: string, revealSeconds: number) {
  const [revealed, setRevealed] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(revealSeconds);
  const [copyStatus, setCopyStatus] = useState<SensitiveCopyStatus>("idle");
  const copiedFeedbackTimer = useRef<number | null>(null);

  const hide = useCallback(() => {
    setRevealed(false);
    setRemainingSeconds(revealSeconds);
  }, [revealSeconds]);

  const toggleReveal = useCallback(() => {
    if (revealed) {
      hide();
      return;
    }
    setRemainingSeconds(revealSeconds);
    setRevealed(true);
  }, [hide, revealSeconds, revealed]);

  const copy = useCallback(async () => {
    try {
      await copySensitiveText(value);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
    if (copiedFeedbackTimer.current !== null) {
      window.clearTimeout(copiedFeedbackTimer.current);
    }
    copiedFeedbackTimer.current = window.setTimeout(() => setCopyStatus("idle"), COPY_FEEDBACK_MS);
  }, [value]);

  useEffect(() => {
    if (!revealed) return;
    const deadline = Date.now() + revealSeconds * 1_000;
    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1_000));
      setRemainingSeconds(remaining);
      if (remaining === 0) hide();
    };
    const hideWhenBackgrounded = () => {
      if (document.visibilityState !== "visible") hide();
    };
    const timeout = window.setTimeout(hide, revealSeconds * 1_000);
    const interval = window.setInterval(updateRemaining, 1_000);
    window.addEventListener("blur", hide);
    window.addEventListener("pagehide", hide);
    document.addEventListener("visibilitychange", hideWhenBackgrounded);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      window.removeEventListener("blur", hide);
      window.removeEventListener("pagehide", hide);
      document.removeEventListener("visibilitychange", hideWhenBackgrounded);
    };
  }, [hide, revealSeconds, revealed]);

  useEffect(() => () => {
    if (copiedFeedbackTimer.current !== null) {
      window.clearTimeout(copiedFeedbackTimer.current);
    }
  }, []);

  return { revealed, remainingSeconds, copyStatus, toggleReveal, hide, copy };
}
