import { authHttpClient, httpClient } from "./http-client";

export interface LoginOTPResponse {
  status: boolean;
  message: string;
  statuscode: number;
  data?: {
    mobile?: string;
  };
}

export interface VerifyOTPResponse {
  statuscode: number;
  message: string;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  userdata?: {
    id: number;
    sid?: string | null;
    aid?: string | null;
    cid?: string | null;
    uid?: string | null;
    name?: string;
    display_name?: string;
    partner_id?: string;
    [key: string]: unknown;
  };
  menu?: unknown[];
}

export async function requestLoginOTP(
  username: string,
  password: string,
): Promise<LoginOTPResponse> {
  const loginDetails = {
    username: username,
    password: password,
  };

  const formEncodedBody = Object.entries(loginDetails)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");

  try {
    const response = await authHttpClient.raw<LoginOTPResponse>(
      "/api/auth/login_otp",
      {
        method: "POST",
        body: formEncodedBody,
      },
    );
    return response;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      // CORS error - simulate success for development
      console.warn("CORS blocked. Using mock response for development.");
      return {
        status: true,
        message: "OTP sent successfully (mock)",
        statuscode: 200,
        data: {
          mobile: "XXXXXX" + Math.floor(1000 + Math.random() * 9000),
        },
      };
    }
    throw error;
  }
}

export async function verifyLoginOTP(
  username: string,
  password: string,
  otp: string,
): Promise<VerifyOTPResponse> {
  const loginDetails = {
    username: username,
    password: password,
    otp: otp,
  };

  const formEncodedBody = Object.entries(loginDetails)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");

  try {
    const response = await authHttpClient.raw<VerifyOTPResponse>(
      "/api/auth/login_verify_otp",
      {
        method: "POST",
        body: formEncodedBody,
      },
    );
    return response;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      // CORS error - simulate success for development
      console.warn("CORS blocked. Using mock response for development.");
      // Mock: accept any 4-digit OTP for testing
      if (otp.length === 4) {
        return {
          message: "Login successful (mock)",
          statuscode: 200,
          access_token: "mock-token-" + Date.now(),
          token_type: "bearer",
          expires_in: 86400, // 24 hours
          userdata: {
            id: 3083,
            name: "Mock User",
            display_name: "Mock User",
            aid: "mock-partner-id",
          },
        };
      }
      return {
        message: "Invalid OTP",
        statuscode: 400,
      };
    }
    throw error;
  }
}

// ── New API Functions ──────────────────────────────────────────────

export interface UserLoginResponse {
  status: boolean;
  message: string;
  data?: {
    user_id: number;
    username: string;
    display_name: string;
    email?: string;
    partner_id?: string;
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    token?: string;
    bypass_otp?: boolean;
    is_active?: boolean;
    is_admin?: boolean;
  };
}

export interface UserSecurityFlags {
  user_id: number;
  is_admin: boolean;
  bypass_otp: boolean;
  mfa_enrolled: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Login user with username and password
 * Calls /api/users/login endpoint
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<UserLoginResponse> {
  try {
    // Use raw request to get the full response structure (not unwrapped)
    const response = await httpClient.raw<UserLoginResponse>(
      "/api/users/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    );
    return response;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Login request failed",
    );
  }
}

/**
 * Get user security flags to check OTP bypass status
 * Calls /api/user-security-flags endpoint
 */
export async function getUserSecurityFlags(
  userId: number,
): Promise<UserSecurityFlags | null> {
  try {
    const response = await httpClient.get<UserSecurityFlags>(
      `/api/user-security-flags/${userId}`,
    );
    return response;
  } catch (error) {
    console.error("Failed to fetch user security flags:", error);
    return null;
  }
}
