import React, { ReactNode, useState } from "react";
import { LogOut, RefreshCw, Bell, Menu, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { AppFooter } from "@/components/AppFooter";
import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
  showNewUpload?: boolean;
  onNewUpload?: () => void;
}

export function AppLayout({
  children,
  showNewUpload,
  onNewUpload,
}: AppLayoutProps) {
  const { logout, username } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Listen for custom event to collapse sidebar
  React.useEffect(() => {
    const handler = () => setSidebarCollapsed(true);
    window.addEventListener("collapse-sidebar", handler);
    return () => window.removeEventListener("collapse-sidebar", handler);
  }, []);

  const initials = username ? username.slice(0, 2).toUpperCase() : "U";

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      {!isMobile && (
        <AppSidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      )}

      {/* Mobile sidebar sheet */}
      {isMobile && (
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="left"
            className="p-0 w-64 bg-sidebar-background border-sidebar-border"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <AppSidebar
              onNavigate={() => setMobileNavOpen(false)}
              collapsed={false}
            />
          </SheetContent>
        </Sheet>
      )}

      <div className="flex-1 flex flex-col min-h-screen min-w-0 bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 h-14 md:h-16 shrink-0 border-b border-border bg-card">
          <div className="flex items-center justify-between h-full px-3 md:px-6">
            {/* Left: Hamburger + Welcome */}
            <div className="flex items-center gap-2 min-w-0">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground"
                  onClick={() => setMobileNavOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
              )}
              {username && (
                <span className="text-sm text-muted-foreground truncate">
                  Welcome,{" "}
                  <span className="font-semibold text-foreground">
                    {username}
                  </span>
                </span>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
              {showNewUpload && onNewUpload && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNewUpload}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted md:gap-2 md:px-3 md:w-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden md:inline text-sm">New Upload</span>
                </Button>
              )}

              <button
                onClick={() => navigate("/settings")}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  toggleTheme();
                }}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1.5 pl-1.5 md:pl-3 border-l border-border">
                <Avatar className="h-7 w-7 md:h-8 md:w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {username && (
                  <span className="text-sm font-medium text-foreground hidden md:inline">
                    {username}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted ml-0.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-3 md:p-6 overflow-auto min-w-0">
          <SubscriptionBanner />
          <div className="w-full max-w-full">{children}</div>
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
