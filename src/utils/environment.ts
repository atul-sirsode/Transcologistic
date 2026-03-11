export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
};

export const isProduction = (): boolean => {
  return import.meta.env.PROD;
};

export const getEnvironment = (): "development" | "production" => {
  return isDevelopment() ? "development" : "production";
};
