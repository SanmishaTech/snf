import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { Link } from "react-router-dom"; // Import Link from react-router-dom

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
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
  // agreedToPolicy removed as it's no longer part of the initial form
});

type LoginFormInputs = z.infer<typeof loginSchema>; // No longer needs agreedToPolicy here

// Define props for Login component
interface LoginProps {
  setActiveTab: (tab: string) => void;
}

const Login: React.FC<LoginProps> = ({ setActiveTab }) => {
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policyText, setPolicyText] = useState("");
  const [isPolicyLoading, setIsPolicyLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // Obtain queryClient

  // Helper function to determine redirect path based on user role
  const determineRedirectPath = (user: User | undefined): string => {
    if (user && user.role === 'MEMBER') {
      return '/member/products'; // Redirect members to the dashboard
    }
    if(user && user.role === 'ADMIN') {
      return '/admin/orders';
    }
    if(user && user.role === 'VENDOR') {
      return '/admin/orders';
    }
    if(user && user.role === 'AGENCY') {
      return '/admin/orders';
    }
    // Add other role-based redirects here if needed in the future
    // e.g., if (user && user.role === 'ADMIN') return '/admin/overview';
    return '/'; // Default path for other roles or if user is undefined
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
                (fieldName === "email" || fieldName === "password")
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

      // First try to handle field-specific validation errors
      const hadFieldErrors = handleValidationErrors();

      // If we didn't have field-specific errors OR we want to show both field and general errors
      if (!hadFieldErrors || error.status === 401) {
        // Use our improved error message from apiService
        toast.error(error.message || "An error occurred during login.");
      }

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
      const updatedUser = data.user || JSON.parse(localStorage.getItem("user") || "null");
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
    // All checks for admin/policy status are now done by the backend.
    // Frontend just submits login credentials.
    console.log("onSubmit: Submitting login data to backend:", data);
    loginMutation.mutate(data); // agreedToPolicy is no longer part of LoginFormInputs or sent here
  };

  const handleAgreeAndLogin = () => {
    // User agrees to policy after successful initial authentication.
    // Call the mutation to record policy acceptance on the backend.
    console.log("Policy modal: User agreed. Calling acceptPolicyMutation.");
    acceptPolicyMutation.mutate();
    // Modal will be closed by acceptPolicyMutation.onSuccess
  };

  const handleDisagree = () => {
    setIsPolicyModalOpen(false);
    toast.info("Policy agreement is required to log in.");
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("roles");
    localStorage.removeItem("memberId");
    queryClient.clear(); // Clear react-query cache
    setIsPolicyModalOpen(false);
    toast.error("Policy agreement is required. You have been logged out.");
    navigate("/");
  };

  const isLoading = loginMutation.isPending || isPolicyLoading;

  return (
    <>
      {/* Policy Modal */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 bg-transparent  bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card text-card-foreground p-6 sm:p-8 rounded-xl shadow-2xl max-w-lg w-full border">
            <h2 className="text-3xl font-bold mb-6 text-center">Our Policy</h2>
            <div className="max-h-120 overflow-y-auto mb-8 text-sm text-muted-foreground whitespace-pre-wrap p-6 border rounded-lg bg-background">
              {policyText || "Loading policy..."}
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
              <Button
                variant="outline"
                onClick={handleDisagree}
                disabled={isPolicyLoading || loginMutation.isPending}
                className="w-full sm:w-auto"
              >
                Disagree
              </Button>
              <Button
                onClick={handleAgreeAndLogin}
                disabled={
                  isPolicyLoading || loginMutation.isPending || !policyText
                }
                className="w-full sm:w-auto"
              >
                {loginMutation.isPending ? (
                  <LoaderCircle className="animate-spin mr-2" size={16} />
                ) : null}
                Agree & Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Login Form using Shadcn UI structure */}
      <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
        {/* ... rest of your form JSX ... no changes needed below this line for this step, just ensure it's within the fragment <></> */}
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-balance text-muted-foreground">
              Login to your {appName} account
            </p>
          </div>

          {/* Email Field */}
          <div className="grid gap-2 relative pb-3">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
               {...register("email")}
              required
              disabled={isLoading}
              aria-invalid={errors.email ? "true" : "false"}
            />
            {errors.email && (
              <p className="text-destructive text-xs absolute -bottom-1 left-0">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="grid gap-2 relative pb-3">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
               {...register("password")}
              required
              disabled={isLoading}
              aria-invalid={errors.password ? "true" : "false"}
            />
            {errors.password && (
              <p className="text-destructive text-xs absolute -bottom-1 left-0">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            {/* This is a good place for 'Remember me' if you add it later */}
            <Link to="/forgot-password" className="font-medium text-primary hover:underline">
              Forgot Password?
            </Link>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <LoaderCircle className="animate-spin mr-2" size={16} />
            ) : null}
            Login
          </Button>

          {/* Registration Button */}
          {allowRegistration && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Are you new?{" "}
              <Button 
                variant="link"
                className="font-semibold p-0 h-auto text-primary hover:underline"
                onClick={() => setActiveTab("register")}
                type="button" // Add type button to prevent form submission
              >
                Register
              </Button>
            </p>
          )}
        </div>
      </form>
    </>
  );
};

export default Login;
