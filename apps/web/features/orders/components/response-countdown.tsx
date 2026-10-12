'use client';

import { useEffect, useState } from 'react';

import { Countdown } from '@/features/ui';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Live cooperative response-window countdown for a PENDING order. Ticks
 * every second; when the window closes the lazy-expiry sweep flips the
 * order to EXPIRED on the next server read.
 */
export function ResponseCountdown({ expiresAt }: { expiresAt: string }) {
  const target = new Date(expiresAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remainingSeconds = Math.max(0, Math.floor((target - now) / 1000));
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const urgency =
    remainingSeconds < 2 * 3600 ? 'critical' : remainingSeconds < 6 * 3600 ? 'soon' : 'ok';

  return (
    <Countdown
      label="Cooperative response window"
      remaining={`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
      urgency={urgency}
    />
  );
}