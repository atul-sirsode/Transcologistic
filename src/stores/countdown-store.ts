import { create } from "zustand";

interface CountdownState {
  isActive: boolean;
  seconds: number;
  message: string;
  startCountdown: (seconds: number, message?: string) => void;
  stopCountdown: () => void;
  resetCountdown: () => void;
}

export const useCountdownStore = create<CountdownState>((set, get) => ({
  isActive: false,
  seconds: 0,
  message: "",

  startCountdown: (seconds: number, message = "Your session will expire") => {
    set({
      isActive: true,
      seconds,
      message,
    });
  },

  stopCountdown: () => {
    set({
      isActive: false,
    });
  },

  resetCountdown: () => {
    set({
      isActive: false,
      seconds: 0,
      message: "",
    });
  },
}));
