import React, { createContext, useContext, useState, ReactNode } from "react";

interface CountdownContextType {
  isActive: boolean;
  seconds: number;
  message: string;
  startCountdown: (seconds: number, message?: string) => void;
  stopCountdown: () => void;
  resetCountdown: () => void;
}

const CountdownContext = createContext<CountdownContextType | undefined>(
  undefined,
);

interface CountdownProviderProps {
  children: ReactNode;
}

export function CountdownProvider({ children }: CountdownProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");

  const startCountdown = (
    newSeconds: number,
    newMessage = "Your session will expire",
  ) => {
    setSeconds(newSeconds);
    setMessage(newMessage);
    setIsActive(true);
  };

  const stopCountdown = () => {
    setIsActive(false);
  };

  const resetCountdown = () => {
    setIsActive(false);
    setSeconds(0);
    setMessage("");
  };

  return (
    <CountdownContext.Provider
      value={{
        isActive,
        seconds,
        message,
        startCountdown,
        stopCountdown,
        resetCountdown,
      }}
    >
      {children}
    </CountdownContext.Provider>
  );
}

export function useCountdown() {
  const context = useContext(CountdownContext);
  if (context === undefined) {
    throw new Error("useCountdown must be used within a CountdownProvider");
  }
  return context;
}
