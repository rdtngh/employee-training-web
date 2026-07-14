import { useEffect, useState } from "react";

export function useSessionAnswers(storageKey) {
  const [answers, setAnswers] = useState(() => {
    try {
      return JSON.parse(window.sessionStorage.getItem(storageKey)) ?? {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(answers));
  }, [answers, storageKey]);

  const clearAnswers = () => {
    window.sessionStorage.removeItem(storageKey);
    setAnswers({});
  };

  return { answers, setAnswers, clearAnswers };
}
