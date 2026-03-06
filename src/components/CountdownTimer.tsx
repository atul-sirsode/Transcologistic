import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock } from "lucide-react";
import { useCountdown } from "@/contexts/CountdownContext";

export function CountdownTimer() {
  const { isActive, seconds, message, stopCountdown } = useCountdown();
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [isCompleted, setIsCompleted] = useState(false);

  // Reset timeLeft when seconds changes
  useEffect(() => {
    setTimeLeft(seconds);
    setIsCompleted(false);
  }, [seconds]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) {
      if (timeLeft <= 0 && !isCompleted) {
        setIsCompleted(true);
        stopCountdown();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsCompleted(true);
          stopCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, timeLeft, isCompleted, stopCountdown]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const getProgressColor = () => {
    if (timeLeft > 5) return "bg-yellow-500";
    if (timeLeft > 2) return "bg-orange-500";
    return "bg-red-500";
  };

  const getAlertVariant = () => {
    if (timeLeft > 5) return "default";
    return "destructive";
  };

  if (isCompleted) {
    return (
      <Alert variant="destructive" className="mb-4 animate-pulse">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Session Expired!</strong> Logging out now...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant={getAlertVariant()} className="mb-4">
      <Clock className="h-4 w-4" />
      <AlertDescription className="space-y-2">
        <div>
          <strong>{message}</strong> in{" "}
          <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${getProgressColor()}`}
            style={{ width: `${(timeLeft / seconds) * 100}%` }}
          />
        </div>

        {timeLeft <= 3 && (
          <div className="text-xs text-red-600 font-medium animate-pulse">
            Please save your work immediately!
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
