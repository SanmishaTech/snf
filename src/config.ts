export const appName = import.meta.env.VITE_APP_NAME || "SNF";

// Get the current hostname (for production) or use environment variable
const getBackendUrl = () => {
  // Always prefer explicit env var if provided (both dev and prod)
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl) {
    return envUrl; // NOTE: should be base server URL, WITHOUT trailing '/api'
  }

  // In production, derive from current hostname if no env var
  if (import.meta.env.PROD) {
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `http://${hostname}`;
    }
  }

  // Default for development
  return "https://www.indraai.in";
};

export const backendUrl = getBackendUrl();
export const allowRegistration =
  import.meta.env.VITE_ALLOW_REGISTRATION === "true";
