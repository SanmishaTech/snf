import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { post } from "@/services/apiService";
import { appName } from "@/config";
import { LoaderCircle } from "lucide-react"; // Spinner icon
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import Validate from "@/lib/Handlevalidation";

// Define expected API response structure
interface RegisterResponse {
  message: string;
}

// Define props for Register component
interface RegisterProps {}

type RegisterFormInputs = z.infer<typeof registerSchema>;

// Define Zod schema
const registerSchema = z
  .object({
    name: z.string().nonempty("Name is required"),
    email: z.string().email("Invalid email address").optional(),
    mobile: z
      .string()
      .regex(/^\d{10}$/, "Mobile must be a 10 digit number")
      .optional(),
    password: z
      .string()
      .nonempty("Password is required")
      .min(5, "Password must be at least 5 characters long"),
    confirmPassword: z.string().nonempty("Confirm Password is required"),
  })
  .refine((data) => !!(data.email || data.mobile), {
    message: "Either email or mobile is required",
    path: ["email"],
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

const Register: React.FC<RegisterProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRegisterPath = location.pathname === "/admin/register";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });

  const registerMutation = useMutation<
    RegisterResponse,
    unknown,
    RegisterFormInputs
  >({
    mutationFn: (data) => post("/auth/register", data),
    onSuccess: () => {
      toast.success("Registration successful! Please log in.");
      if (location.pathname === "/admin/register") {
        navigate("/admin");
      }
      if (location.pathname === "/register") {
        navigate("/login");
      } else {
        window.location.reload();
      }
    },
    onError: (error: any) => {
      // Show inline error for duplicate mobile/email conflicts
      if (error.status === 409) {
        if (error.message.toLowerCase().includes('mobile')) {
          setError('mobile', { type: 'manual', message: error.message });
        } else if (error.message.toLowerCase().includes('email')) {
          setError('email', { type: 'manual', message: error.message });
        } else {
          toast.error(error.message);
        }
        return;
      }
      // Default validation and error toast
      Validate(error, setError);
      if (error.message) {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred");
      }
    },
  });

  const onSubmit: SubmitHandler<RegisterFormInputs> = (data) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
         
        {location.pathname !== "/" && (
          <h1 className="text-3xl font-bold mb-2">Create your account</h1>
        )}
        {location.pathname !== "/" && (
          <p className="text-muted-foreground">
            Join {appName} today to get started.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-5">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your full name"
              {...register("name")}
              disabled={registerMutation.isPending}
              className="py-5 px-4"
            />
            {errors.name && (
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
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              {...register("email")}
              disabled={registerMutation.isPending}
              className="py-5 px-4"
            />
            {errors.email && (
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
                {errors.email?.message}
              </p>
            )}
          </div>

          {/* Mobile Field */}
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input
              id="mobile"
              type="tel"
              placeholder="9876543210"
              {...register("mobile")}
              disabled={registerMutation.isPending}
              className="py-5 px-4"
            />
            {errors.mobile && (
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
                {errors.mobile.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              {...register("password")}
              disabled={registerMutation.isPending}
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

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <PasswordInput
              id="confirmPassword"
              placeholder="••••••••"
              {...register("confirmPassword")}
              disabled={registerMutation.isPending}
              className="py-5 px-4"
            />
            {errors.confirmPassword && (
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
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full py-5 font-semibold"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <>
                <LoaderCircle className="animate-spin mr-2" size={20} />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>

          {/* Login Link */}
          {location.pathname !== "/" && (
            <p className="text-center text-sm text-muted-foreground mt-6 pt-4 border-t border-border">
              Already have an account?{" "}
              <Link
                to={isAdminRegisterPath ? "/admin" : "/login"}
                className="font-semibold text-primary hover:underline p-0 h-auto"
              >
                Sign In
              </Link>
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default Register;
