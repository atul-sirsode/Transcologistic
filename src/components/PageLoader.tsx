import { Loader2 } from "lucide-react";

export function PageLoader() {
  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: "calc(100vh - 4rem)" }}
    >
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
