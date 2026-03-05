/**
 * Database Provider Configuration
 *
 * Central config to switch between Supabase (Lovable Cloud) and MongoDB.
 * Change `activeProvider` to toggle the entire app's data layer.
 */

// Read available providers from environment or use default
const availableProviders = (
  import.meta.env.VITE_AVAILABLE_DB_PROVIDERS as string
)?.split(",") || ["mongodb"];

// Create dynamic DbProvider type based on environment
export type DbProvider = (typeof availableProviders)[number];

interface DbProviderConfig {
  /** Which database provider is active */
  activeProvider: DbProvider;

  /** Base URL for the MongoDB REST API proxy (only used when provider = 'mongodb') */
  mongoApiBaseUrl: string;
}

// Read from environment variables or fall back to defaults
const config: DbProviderConfig = {
  activeProvider: (import.meta.env.VITE_DB_PROVIDER as DbProvider) || "mongodb",
  mongoApiBaseUrl:
    import.meta.env.VITE_MONGO_API_BASE_URL || "http://localhost:3000/api",
};

export function getDbProvider(): DbProvider {
  return config.activeProvider;
}

export function setDbProvider(provider: DbProvider): void {
  // Note: Environment variables are read-only at runtime
  // This function is kept for compatibility but won't persist changes
  console.warn(
    "Database provider is now configured via environment variables. Runtime changes won't persist.",
  );
  config.activeProvider = provider;
}

export function getMongoApiBaseUrl(): string {
  return config.mongoApiBaseUrl;
}

export function setMongoApiBaseUrl(url: string): void {
  // Note: Environment variables are read-only at runtime
  // This function is kept for compatibility but won't persist changes
  console.warn(
    "Mongo API URL is now configured via environment variables. Runtime changes won't persist.",
  );
  config.mongoApiBaseUrl = url;
}
