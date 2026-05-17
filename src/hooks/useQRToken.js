import { useState, useEffect } from 'react';
import { totp } from '../lib/totp';

export function useQRToken(secret) {
  const [token, setToken] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(null);

  useEffect(() => {
    if (!secret) return;

    const generate = () => {
      const now = Math.floor(Date.now() / 1000);
      const step = 15;
      const timeLeft = step - (now % step);
      const t = totp(secret);
      setToken(t);
      setSecondsLeft(timeLeft);
    };

    generate();
    const interval = setInterval(generate, 1000);
    return () => clearInterval(interval);
  }, [secret]);

  return { token, secondsLeft };
}