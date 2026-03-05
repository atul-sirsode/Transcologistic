import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function SessionTimer() {
  const { sessionExpiresAt, logout } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!sessionExpiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = sessionExpiresAt - now;

      if (remaining <= 0) {
        setTimeLeft('Expired');
        logout();
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [sessionExpiresAt, logout]);

  if (!sessionExpiresAt) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[hsl(222,47%,15%)] border border-[hsl(222,47%,18%)]">
      <Clock className="w-3.5 h-3.5 text-[hsl(215,20%,55%)]" />
      <div className="text-xs text-[hsl(215,20%,65%)]">
        <span className="block leading-none text-[10px]">Session</span>
        <span className="font-mono font-semibold text-white">{timeLeft}</span>
      </div>
    </div>
  );
}
