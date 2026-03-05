// Generic HTTP Client Handler
// Provides common functionality for all API operations including:
// - Automatic Authorization header injection
// - Error handling and response parsing
// - Request/response interceptors
// - Base URL management
// - Type-safe API responses

export interface HttpClientConfig {
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  interceptors?: {
    request?: (config: RequestInit) => RequestInit;
    response?: (response: Response) => Response | Promise<Response>;
    error?: (error: Error) => Error | Promise<Error>;
  };
}

export interface ApiResponse<T = unknown> {
  data?: T;
  status: number;
  statusText: string;
  headers: Headers;
}

export class HttpClientHandler {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private interceptors?: HttpClientConfig["interceptors"];

  constructor(config: HttpClientConfig = {}) {
    this.baseURL =
      config.baseURL ||
      import.meta.env.VITE_BASE_DOMAIN ||
      "http://localhost:3000";
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...config.defaultHeaders,
    };
    this.timeout = config.timeout || 30000; // 30 seconds default
    this.interceptors = config.interceptors;
  }

  /**
   * Get authorization token from sessionStorage
   */
  private getAuthToken(): string | null {
    return sessionStorage.getItem("accessToken");
  }

  /**
   * Get partner ID from sessionStorage (for specific APIs)
   */
  private getPartnerId(): string | null {
    return sessionStorage.getItem("partnerId");
  }

  /**
   * Build headers for request including authorization
   */
  private buildHeaders(
    customHeaders: Record<string, string> = {},
  ): Record<string, string> {
    const token = this.getAuthToken();
    const partnerId = this.getPartnerId();

    const headers = {
      ...this.defaultHeaders,
      ...customHeaders,
    };

    // Add Authorization header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Add PartnerId header if partnerId exists (for specific APIs like RC verification)
    if (partnerId) {
      headers["PartnerId"] = partnerId;
    }

    return headers;
  }

  /**
   * Handle API errors consistently
   */
  private handleError(response: Response, errorData?: unknown): never {
    const message =
      (errorData as { message?: string })?.message ||
      `HTTP ${response.status}: ${response.statusText}`;
    const error = new Error(message);
    (error as { status?: number }).status = response.status;
    (error as { response?: Response }).response = response;
    throw error;
  }

  /**
   * Parse response data consistently
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    // Handle empty responses
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return undefined as T;
    }

    const data = await response.json();

    // Handle API responses that wrap data in a 'data' property
    return data && typeof data === "object" && "data" in data
      ? data.data
      : data;
  }

  /**
   * Apply request interceptor
   */
  private async applyRequestInterceptor(
    options: RequestInit,
  ): Promise<RequestInit> {
    if (this.interceptors?.request) {
      return this.interceptors.request(options);
    }
    return options;
  }

  /**
   * Apply response interceptor
   */
  private async applyResponseInterceptor(
    response: Response,
  ): Promise<Response> {
    if (this.interceptors?.response) {
      return this.interceptors.response(response);
    }
    return response;
  }

  /**
   * Apply error interceptor
   */
  private async applyErrorInterceptor(error: Error): Promise<Error> {
    if (this.interceptors?.error) {
      return this.interceptors.error(error);
    }
    return error;
  }

  /**
   * Generic HTTP request method
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseURL}${endpoint}`;

    // Build headers with authorization
    const headers = this.buildHeaders(
      options.headers as Record<string, string>,
    );

    // Prepare request options
    let requestOptions: RequestInit = {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    // Apply request interceptor
    requestOptions = await this.applyRequestInterceptor(requestOptions);

    try {
      let response = await fetch(url, requestOptions);

      // Apply response interceptor
      response = await this.applyResponseInterceptor(response);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response
            .json()
            .catch(() => ({ message: "Unknown error" }));
        } catch {
          errorData = { message: "Unknown error" };
        }
        return this.handleError(response, errorData);
      }

      return await this.parseResponse<T>(response);
    } catch (error) {
      // Apply error interceptor
      const processedError = await this.applyErrorInterceptor(
        error instanceof Error ? error : new Error(String(error)),
      );
      throw processedError;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }
    return this.request<T>(url, { method: "GET" });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * FormData request (for file uploads)
   */
  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const headers = this.buildHeaders();
    // Remove Content-Type to let browser set it automatically for FormData
    delete headers["Content-Type"];

    return this.request<T>(endpoint, {
      method: "POST",
      body: formData,
      headers,
    });
  }

  /**
   * Custom request for special cases (like form-encoded data)
   */
  async custom<T>(endpoint: string, options: RequestInit): Promise<T> {
    const headers = this.buildHeaders(
      options.headers as Record<string, string>,
    );
    return this.request<T>(endpoint, {
      ...options,
      headers,
    });
  }

  /**
   * Raw request that returns the full response without unwrapping
   */
  async raw<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseURL}${endpoint}`;

    // Build headers with authorization
    const headers = this.buildHeaders(
      options.headers as Record<string, string>,
    );

    // Prepare request options
    let requestOptions: RequestInit = {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    // Apply request interceptor
    requestOptions = await this.applyRequestInterceptor(requestOptions);

    try {
      let response = await fetch(url, requestOptions);

      // Apply response interceptor
      response = await this.applyResponseInterceptor(response);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response
            .json()
            .catch(() => ({ message: "Unknown error" }));
        } catch {
          errorData = { message: "Unknown error" };
        }
        return this.handleError(response, errorData);
      }

      // Return raw JSON response without unwrapping
      return await response.json();
    } catch (error) {
      // Apply error interceptor
      const processedError = await this.applyErrorInterceptor(
        error instanceof Error ? error : new Error(String(error)),
      );
      throw processedError;
    }
  }

  /**
   * Create a new instance with different configuration
   */
  withConfig(config: Partial<HttpClientConfig>): HttpClientHandler {
    return new HttpClientHandler({
      baseURL: this.baseURL,
      defaultHeaders: { ...this.defaultHeaders, ...config.defaultHeaders },
      timeout: this.timeout,
      interceptors: this.interceptors,
      ...config,
    });
  }
}

// Default instance for general use
export const httpClient = new HttpClientHandler();

// Specialized instances for different API types
export const authHttpClient = new HttpClientHandler({
  defaultHeaders: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
});

export const fileHttpClient = new HttpClientHandler({
  defaultHeaders: {
    // Don't set Content-Type for file uploads
  },
});

// Export convenience functions for backward compatibility
export const apiRequest = <T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> => {
  const method = options?.method || "GET";
  const data = options?.body ? JSON.parse(options.body as string) : undefined;

  switch (method.toUpperCase()) {
    case "GET":
      return httpClient.get<T>(endpoint);
    case "POST":
      return httpClient.post<T>(endpoint, data);
    case "PUT":
      return httpClient.put<T>(endpoint, data);
    case "PATCH":
      return httpClient.patch<T>(endpoint, data);
    case "DELETE":
      return httpClient.delete<T>(endpoint, data);
    default:
      return httpClient.custom<T>(endpoint, options);
  }
};
