import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import {
  hasValidAuthData,
  storeAuthData,
  clearAuthData,
  initializeAuthFromURL,
} from "@/utils/auth-utils";
import { clearPermissionsCache } from "@/lib/user-security-api";

export interface UserData {
  user_id: number;
  username: string;
  display_name: string;
  email?: string;
  partner_id?: string;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  token?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  displayName: string | null;
  partnerId: string | null;
  userId: number | null;
  token: string | null;
  sessionExpiresAt: number | null;
  userData: UserData | null;
  login: (
    username: string,
    token: string,
    expiresIn: number,
    displayName?: string,
    partnerId?: string,
    userId?: number,
    userData?: UserData,
  ) => void;
  logout: () => void;
  getToken: () => string | null;
  validateToken: (token: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Initialize from URL parameters first (for deep linking)
    const urlAuth = initializeAuthFromURL();
    if (urlAuth) return true;

    // Then check stored auth data
    return hasValidAuthData();
  });

  const [username, setUsername] = useState<string | null>(() => {
    return sessionStorage.getItem("username");
  });

  const [displayName, setDisplayName] = useState<string | null>(() => {
    return sessionStorage.getItem("displayName");
  });

  const [partnerId, setPartnerId] = useState<string | null>(() => {
    return sessionStorage.getItem("partnerId");
  });

  const [userId, setUserId] = useState<number | null>(() => {
    const stored = sessionStorage.getItem("userId");
    return stored ? parseInt(stored) : null;
  });

  const [userData, setUserData] = useState<UserData | null>(() => {
    const stored = sessionStorage.getItem("userData");
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem("accessToken");
  });

  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(
    () => {
      const stored = sessionStorage.getItem("sessionExpiresAt");
      return stored ? parseInt(stored) : null;
    },
  );

  const login = useCallback(
    (
      user: string,
      accessToken: string,
      expiresIn: number,
      displayName?: string,
      partnerId?: string,
      userId?: number,
      userData?: UserData,
    ) => {
      storeAuthData(accessToken, user, expiresIn, displayName, partnerId);

      // Store additional user data
      if (userId) {
        sessionStorage.setItem("userId", userId.toString());
      }
      if (userData) {
        sessionStorage.setItem("userData", JSON.stringify(userData));
      }

      setIsAuthenticated(true);
      setUsername(user);
      setDisplayName(displayName || null);
      setPartnerId(partnerId || null);
      setUserId(userId || null);
      setUserData(userData || null);
      setToken(accessToken);
      setSessionExpiresAt(Date.now() + expiresIn * 1000);
    },
    [],
  );

  const logout = useCallback(() => {
    clearAuthData();

    // Clear additional user data
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("userData");

    // Clear permissions cache to prevent stale data on next login
    clearPermissionsCache();

    setIsAuthenticated(false);
    setUsername(null);
    setDisplayName(null);
    setPartnerId(null);
    setUserId(null);
    setUserData(null);
    setToken(null);
    setSessionExpiresAt(null);
  }, []);

  const getToken = useCallback(() => {
    return sessionStorage.getItem("accessToken");
  }, []);

  const validateToken = useCallback((token: string): boolean => {
    // Basic token validation
    if (!token || token.length < 10) return false;

    // Check if token is not expired
    const expiresAt = sessionStorage.getItem("sessionExpiresAt");
    if (expiresAt && Date.now() > parseInt(expiresAt)) return false;

    // You can add more validation here (JWT decode, API call, etc.)
    return true;
  }, []);

  // Enhanced initialization with token validation
  useEffect(() => {
    const storedToken = sessionStorage.getItem("accessToken");
    const storedAuth = sessionStorage.getItem("isAuthenticated");

    if (storedToken && storedAuth === "true") {
      if (validateToken(storedToken)) {
        // Token is valid, ensure auth state is correct
        setIsAuthenticated(true);
        setToken(storedToken);
        setUsername(sessionStorage.getItem("username"));
        setDisplayName(sessionStorage.getItem("displayName"));
        setPartnerId(sessionStorage.getItem("partnerId"));

        const storedUserId = sessionStorage.getItem("userId");
        setUserId(storedUserId ? parseInt(storedUserId) : null);

        const storedUserData = sessionStorage.getItem("userData");
        setUserData(storedUserData ? JSON.parse(storedUserData) : null);

        setSessionExpiresAt(
          parseInt(sessionStorage.getItem("sessionExpiresAt") || "0"),
        );
      } else {
        // Token is invalid, clear everything
        logout();
      }
    }
  }, [validateToken, logout]);

  // Auto-logout when session expires
  useEffect(() => {
    if (!sessionExpiresAt) return;

    const checkExpiry = () => {
      if (Date.now() >= sessionExpiresAt) {
        logout();
      }
    };

    const interval = setInterval(checkExpiry, 1000);
    return () => clearInterval(interval);
  }, [sessionExpiresAt, logout]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        username,
        displayName,
        partnerId,
        userId,
        token,
        sessionExpiresAt,
        userData,
        login,
        logout,
        getToken,
        validateToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
