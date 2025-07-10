import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { post, get, patch } from "@/services/apiService"; // Added patch
import { appName, allowRegistration } from "@/config";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation, useNavigate } from "react-router-dom"; // Import Link, useLocation, and useNavigate

// User object structure within LoginResponse and for localStorage
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  lastLogin: string;
  policyAccepted?: boolean; // Make optional as it might not always be there pre-login
  policyAcceptedAt?: string; // Optional
  member?: {
    id: number;
    memberName: string;
  };
  isMember: boolean;
  accessibleChapters?: any[]; // Or a more specific type
}

// Type for API error response with field validation errors
interface ApiErrorResponse {
  errors?: Array<{
    path: Array<string | number>;
    message: string;
  }>;
  status?: number;
  data?: any;
  message?: string;
}
// Define expected API response structure for SUCCESS
interface LoginResponse {
  token: string;
  accesstoken: string;
  user: User;
  requiresPolicyAcceptance: boolean;
}

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or mobile is required"),
  password: z.string().min(1, "Password is required"),
  // agreedToPolicy removed as it's no longer part of the initial form
});

type LoginFormInputs = z.infer<typeof loginSchema>; // No longer needs agreedToPolicy here

// Define props for Login component
interface LoginProps {}

const Login: React.FC<LoginProps> = () => {
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policyText, setPolicyText] = useState("");
  const [isPolicyLoading, setIsPolicyLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminPath = location.pathname.startsWith("/admin");
  const queryClient = useQueryClient(); // Obtain queryClient

  // Helper function to determine redirect path based on user role
  const determineRedirectPath = (user: User | undefined): string => {
    if (user && user.role === "MEMBER") {
      return "/member/products/1"; // Redirect members to the dashboard
    }
    if (user && user.role === "DepotAdmin") {
      return "/admin/purchases";
    }
    if (user && user.role === "ADMIN") {
      return "/admin/dashboard";
    }
    if (user && user.role === "VENDOR") {
      return "/admin/dashboard";
    }
    if (user && user.role === "AGENCY") {
      return "/admin/dashboard";
    }
    // Add other role-based redirects here if needed in the future
    // e.g., if (user && user.role === 'ADMIN') return '/admin/overview';
    return "/"; // Default path for other roles or if user is undefined
  };

  // Get setError from useForm
  const {
    register,
    handleSubmit,
    setError, // <-- Destructure setError
    formState: { errors },
    // getValues // Can be useful for debugging
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (location.state?.unauthorized) {
      toast.error("You are not authorized.");
      setTimeout(() => {
        navigate(location.pathname, { replace: true, state: {} });
      }, 0);
    }
  }, [location, navigate]);

  const loginMutation = useMutation<
    LoginResponse,
    any, // Changed to 'any' to access enhanced error properties
    LoginFormInputs
  >({
    mutationFn: async (loginData: LoginFormInputs) => {
      // agreedToPolicy removed from input
      return await post("/auth/login", loginData);
    },
    onSuccess: (data) => {
      console.log("Login successful:", data);
      console.log("[Login.tsx] Login API Response Data:", data);
      console.log(
        "[Login.tsx] Access Token from data:",
        data.accesstoken,
        "Type:",
        typeof data.accesstoken
      );
      localStorage.setItem("authToken", data.token || data.accesstoken);
      localStorage.setItem("refreshToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem(
        "roles",
        JSON.stringify(data.user.accessibleChapters || [])
      ); // Handle if accessibleChapters is undefined

      // Store memberId from the nested structure if it exists
      if (data.user.member && data.user.member.id) {
        localStorage.setItem("memberId", data.user.member.id.toString());
      }

      if (data.requiresPolicyAcceptance) {
        console.log(
          "Login successful, policy acceptance required. Fetching policy..."
        );
        fetchPolicyMutation.mutate(); // This will open the modal on its own success
      } else {
        // Policy not required, proceed with login and redirect
        toast.success("Login successful!");
        queryClient.invalidateQueries({ queryKey: ["user"] });
        const redirectPath = determineRedirectPath(data.user);
        navigate(redirectPath);
      }
    },
    onError: (error: ApiErrorResponse) => {
      // Handle field-specific validation errors (map to form fields)
      const handleValidationErrors = () => {
        // Check if we have field-specific errors to map to the form
        if (error.errors && Array.isArray(error.errors)) {
          error.errors.forEach((fieldError) => {
            // Only process if we have a path and message
            if (
              fieldError.path &&
              fieldError.message &&
              Array.isArray(fieldError.path)
            ) {
              // Get the field name (last item in the path array or the first item if single-level)
              const fieldName =
                fieldError.path[fieldError.path.length - 1] ||
                fieldError.path[0];

              // Set the error on the specific field if it matches our form fields
              if (
                typeof fieldName === "string" &&
                (fieldName === "identifier" || fieldName === "password")
              ) {
                setError(fieldName as keyof LoginFormInputs, {
                  type: "server",
                  message: fieldError.message,
                });
              }
            }
          });
          return true; // We handled field-specific errors
        }
        return false; // No field-specific errors to handle
      };

      // Attempt to handle field-specific validation errors first
      const didDisplayFieldErrors = handleValidationErrors();

      // Now, handle general errors or specific non-field errors
      const errorMessage = error.data?.message || error.message;

      if (
        error.status === 403 &&
        errorMessage &&
        errorMessage.toLowerCase().includes("account is inactive")
      ) {
        toast.error(errorMessage); // Specific message for inactive account
      } else if (!didDisplayFieldErrors || error.status === 401) {
        // If field errors weren't displayed OR it's a 401 (likely "Invalid credentials"), show a general toast.
        // For 401, error.message from the backend is usually "Invalid credentials"
        toast.error(errorMessage || "An error occurred during login.");
      }
      // If didDisplayFieldErrors is true and it's not a 403 inactive or 401, field errors are already set, so no general toast needed.

      // Log detailed error information for debugging
      console.error("Login error details:", error);
    },
  });

  const fetchPolicyMutation = useMutation<
    { policyText: string }, // Expected success response type
    ApiErrorResponse, // Error type
    void // Input type for this mutation (not needed)
  >({
    mutationFn: async (): Promise<{ policyText: string }> => {
      // Ensure return type matches expected
      setIsPolicyLoading(true);
      return await get("/auth/policy-text");
      // If 'post' is strictly for POST, you'll need a 'get' helper from apiService
    },
    onSuccess: (data) => {
      setPolicyText(data.policyText);
      setIsPolicyModalOpen(true);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to load policy.");
      console.error("Policy fetch error:", error);
    },
    onSettled: () => {
      setIsPolicyLoading(false);
    },
  });

  const acceptPolicyMutation = useMutation<
    { message: string; user: User }, // Expected success response from PATCH /auth/accept-policy
    ApiErrorResponse,
    void // No variables needed for this mutation
  >({
    mutationFn: async () => {
      // Using 'patch' now. This assumes apiService.patch exists and handles PATCH requests.
      return await patch("/auth/accept-policy", {});
    },
    onSuccess: (data) => {
      // Assuming 'data.user' contains the updated user object after policy acceptance
      // If not, retrieve from localStorage or ensure backend sends it.
      const updatedUser =
        data.user || JSON.parse(localStorage.getItem("user") || "null");
      localStorage.setItem("user", JSON.stringify(updatedUser));

      toast.success("Policy accepted. Login complete!");
      queryClient.invalidateQueries({ queryKey: ["user"] });
      const redirectPath = determineRedirectPath(updatedUser);
      navigate(redirectPath);
      setIsPolicyModalOpen(false);
    },
    onError: (error) => {
      toast.error(
        error.message || "Failed to accept policy. Please try again."
      );
      console.error("Accept policy error:", error);
    },
  });

  const onSubmit: SubmitHandler<LoginFormInputs> = (data) => {
    loginMutation.mutate(data);
  };

  const handleDisagree = () => {
    setIsPolicyModalOpen(false);
    // Optionally, you could log out or redirect if disagreement means they cannot proceed
    // For now, just closes the modal.
  };

  const handleAgreeAndLogin = () => {
    acceptPolicyMutation.mutate(); // This will trigger login via its onSuccess if policy acceptance is successful
  };

  return (
    <>
      {/* Policy Modal - Enhanced with better styling */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border">
              <h2 className="text-2xl font-bold text-center">
                Accept Terms & Conditions
              </h2>
              <p className="text-center text-muted-foreground mt-2">
                To continue using {appName}, please review and accept our policy
              </p>
            </div>

            <div className="p-6 overflow-y-auto flex-grow bg-gray-50 dark:bg-gray-900">
              <div className="prose prose-sm max-w-none bg-white dark:bg-gray-800 p-6 rounded-lg border">
                {isPolicyLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <LoaderCircle
                      className="animate-spin text-primary"
                      size={24}
                    />
                  </div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: policyText }} />
                )}
              </div>
            </div>

            <div className="p-6 border-t border-border flex flex-col sm:flex-row justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleDisagree}
                disabled={
                  isPolicyLoading ||
                  loginMutation.isPending ||
                  acceptPolicyMutation.isPending
                }
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAgreeAndLogin}
                disabled={
                  isPolicyLoading ||
                  loginMutation.isPending ||
                  !policyText ||
                  acceptPolicyMutation.isPending
                }
                className="w-full sm:w-auto"
              >
                {acceptPolicyMutation.isPending ? (
                  <LoaderCircle className="animate-spin mr-2" size={16} />
                ) : null}
                Agree & Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Login Form */}
      <div className="w-full max-w-md mx-auto mt-10">
        <div className="text-center mb-8">
          {location.pathname !== "/" && (
            <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          )}
          {location.pathname !== "/" && (
            <p className="text-muted-foreground">
              Sign in to continue to {appName}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or Mobile</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="name@example.com or 9876543210"
                {...register("identifier")}
                disabled={
                  loginMutation.isPending || acceptPolicyMutation.isPending
                }
                className="py-5 px-4"
              />
              {errors.identifier && (
                <p className="text-destructive text-sm flex items-center mt-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 mr-1"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.identifier.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to={
                    isAdminPath ? "/admin/forgot-password" : "/forgot-password"
                  }
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                {...register("password")}
                disabled={
                  loginMutation.isPending || acceptPolicyMutation.isPending
                }
                className="py-5 px-4"
              />
              {errors.password && (
                <p className="text-destructive text-sm flex items-center mt-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 mr-1"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full py-5 font-semibold"
              disabled={
                loginMutation.isPending || acceptPolicyMutation.isPending
              }
            >
              {loginMutation.isPending ? (
                <>
                  <LoaderCircle className="animate-spin mr-2" size={20} />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            {/* Registration Link */}
            {allowRegistration && location.pathname !== "/" && (
              <p className="text-center text-sm text-muted-foreground mt-6 pt-4 border-t border-border">
                Don't have an account?{" "}
                <Link
                  to={isAdminPath ? "/admin/register" : "/register"}
                  className="font-semibold text-primary hover:underline p-0 h-auto"
                >
                  Create account
                </Link>
              </p>
            )}
          </div>
        </form>
      </div>
    </>
  );
};

export default Login;
