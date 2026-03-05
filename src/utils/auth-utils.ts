// Utility functions for automatic login bypass

export interface StoredAuthData {
  accessToken: string;
  username: string;
  displayName?: string;
  partnerId?: string;
  expiresAt: number;
}

/**
 * Check if valid authentication data exists in storage
 */
export function hasValidAuthData(): boolean {
  try {
    const token = sessionStorage.getItem("accessToken");
    const username = sessionStorage.getItem("username");
    const expiresAt = sessionStorage.getItem("sessionExpiresAt");

    if (!token || !username || !expiresAt) return false;

    // Check if token is not expired
    if (Date.now() > parseInt(expiresAt)) return false;

    // Basic token validation
    if (token.length < 10) return false;

    return true;
  } catch (error) {
    console.error("Error checking auth data:", error);
    return false;
  }
}

/**
 * Store authentication data for automatic login bypass
 */
export function storeAuthData(
  accessToken: string,
  username: string,
  expiresIn: number,
  displayName?: string,
  partnerId?: string,
): void {
  try {
    const expiresAt = Date.now() + expiresIn * 1000;

    sessionStorage.setItem("accessToken", accessToken);
    sessionStorage.setItem("username", username);
    if (displayName) {
      sessionStorage.setItem("displayName", displayName);
    }
    if (partnerId) {
      sessionStorage.setItem("partnerId", partnerId);
    }
    sessionStorage.setItem("sessionExpiresAt", expiresAt.toString());
    sessionStorage.setItem("isAuthenticated", "true");
  } catch (error) {
    console.error("Error storing auth data:", error);
  }
}

/**
 * Clear all authentication data
 */
export function clearAuthData(): void {
  try {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("displayName");
    sessionStorage.removeItem("partnerId");
    sessionStorage.removeItem("sessionExpiresAt");
    sessionStorage.removeItem("isAuthenticated");
  } catch (error) {
    console.error("Error clearing auth data:", error);
  }
}

/**
 * Get stored authentication data
 */
export function getStoredAuthData(): StoredAuthData | null {
  try {
    const token = sessionStorage.getItem("accessToken");
    const username = sessionStorage.getItem("username");
    const displayName = sessionStorage.getItem("displayName");
    const partnerId = sessionStorage.getItem("partnerId");
    const expiresAt = sessionStorage.getItem("sessionExpiresAt");

    if (!token || !username || !expiresAt) return null;

    return {
      accessToken: token,
      username,
      displayName: displayName || undefined,
      partnerId: partnerId || undefined,
      expiresAt: parseInt(expiresAt),
    };
  } catch (error) {
    console.error("Error getting stored auth data:", error);
    return null;
  }
}

/**
 * Initialize auth state from URL parameters or storage
 * Useful for deep linking with tokens
 */
export function initializeAuthFromURL(): boolean {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const username = urlParams.get("username");
    const expiresIn = urlParams.get("expiresIn");

    if (token && username && expiresIn) {
      storeAuthData(token, username, parseInt(expiresIn));

      // Clean URL parameters
      const cleanUrl =
        window.location.pathname +
        window.location.search
          .replace(/[\?&]token=[^&]*/, "")
          .replace(/[\?&]username=[^&]*/, "")
          .replace(/[\?&]expiresIn=[^&]*/, "")
          .replace(/^&/, "?");
      window.history.replaceState({}, "", cleanUrl);

      return true;
    }

    return false;
  } catch (error) {
    console.error("Error initializing auth from URL:", error);
    return false;
  }
}
