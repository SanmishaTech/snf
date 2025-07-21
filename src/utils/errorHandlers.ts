import { toast } from "sonner";

/**
 * Handle mutation errors appropriately, avoiding showing toast for auth errors
 * since they are handled globally with redirects
 */
export const handleMutationError = (error: any, defaultMessage = "Operation failed") => {
  const status = error?.response?.status;
  
  // Don't show toast for auth errors - these are handled by the global interceptor
  if (status === 401 || status === 403) {
    return;
  }
  
  // Show toast for other errors
  const message = error?.response?.data?.message || error?.message || defaultMessage;
  toast.error(message);
};

/**
 * Handle query errors appropriately
 */
export const handleQueryError = (error: any, defaultMessage = "Failed to load data") => {
  const status = error?.response?.status;
  
  // Don't show toast for auth errors - these are handled by the global interceptor
  if (status === 401 || status === 403) {
    return;
  }
  
  // Log other errors but don't show toast (queries often retry automatically)
  console.error("Query error:", error);
};