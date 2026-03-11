import { useEffect } from "react";
import { isDevelopment } from "@/utils/environment";

export function ProductionProtection() {
  useEffect(() => {
    // Only apply protections in production
    if (isDevelopment()) return;

    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable common developer shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
        (e.ctrlKey && e.key === "U")
      ) {
        e.preventDefault();
        return false;
      }
    };

    // Clear console output periodically
    const clearConsole = () => {
      if (typeof console.clear === "function") {
        console.clear();
      }
    };

    // Basic debugger detection
    const detectDebugger = () => {
      const start = performance.now();
      debugger;
      const end = performance.now();
      if (end - start > 100) {
        // Debugger was detected, redirect or take action
        window.location.replace("about:blank");
      }
    };

    // Add event listeners
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    // Clear console every 5 seconds
    const consoleInterval = setInterval(clearConsole, 5000);

    // Check for debugger every 2 seconds
    const debuggerInterval = setInterval(detectDebugger, 2000);

    // Initial console clear
    clearConsole();

    // Cleanup function
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      clearInterval(consoleInterval);
      clearInterval(debuggerInterval);
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}
