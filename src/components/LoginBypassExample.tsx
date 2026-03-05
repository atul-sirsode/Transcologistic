import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { storeAuthData } from "@/utils/auth-utils";

/**
 * Example component demonstrating login bypass functionality
 *
 * This shows different ways to bypass the login screen:
 * 1. Direct token storage
 * 2. URL parameter authentication
 * 3. Programmatic login
 */
export function LoginBypassExample() {
  const { isAuthenticated, login } = useAuth();

  // Example 1: Store a mock token for testing
  const handleMockLogin = () => {
    const mockToken = "mock-jwt-token-" + Date.now();
    const mockUser = "testuser@example.com";
    const expiresIn = 86400; // 24 hours

    // Method 1: Use the login function
    login(mockUser, mockToken, expiresIn);

    // Method 2: Store directly (alternative approach)
    // storeAuthData(mockToken, mockUser, expiresIn);
  };

  // Example 2: URL with authentication parameters
  const handleAuthURL = () => {
    const token = "demo-token-" + Date.now();
    const username = "demouser";
    const expiresIn = 3600; // 1 hour

    // This will create a URL like: /login?token=...&username=...&expiresIn=...
    const authUrl = `/login?token=${encodeURIComponent(token)}&username=${encodeURIComponent(username)}&expiresIn=${expiresIn}`;

    // You can also redirect programmatically
    // window.location.href = authUrl;
  };

  // Example 3: Check current auth status
  useEffect(() => {
    if (isAuthenticated) {
      // User is authenticated - no logging needed
    }
  }, [isAuthenticated]);

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Login Bypass Examples</h2>

      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Current status:{" "}
          {isAuthenticated ? "✅ Authenticated" : "❌ Not authenticated"}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Method 1: Mock Login</h3>
          <button
            onClick={handleMockLogin}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Simulate Login
          </button>
          <p className="text-sm text-gray-600 mt-1">
            Creates a mock authentication session
          </p>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Method 2: URL Authentication</h3>
          <button
            onClick={handleAuthURL}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Generate Auth URL
          </button>
          <p className="text-sm text-gray-600 mt-1">
            Creates URL with authentication parameters for auto-login
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">How it works:</h3>
        <ul className="text-sm space-y-1">
          <li>• Valid tokens are stored in sessionStorage</li>
          <li>• App checks for valid auth on startup</li>
          <li>• URL parameters are automatically processed</li>
          <li>• Tokens expire based on expiresIn value</li>
          <li>• Invalid/expired tokens are automatically cleared</li>
        </ul>
      </div>
    </div>
  );
}
