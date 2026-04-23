import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { post, get } from "@/services/apiService";
import { LoaderCircle, Smartphone, Mail } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import Validate from "@/lib/Handlevalidation";

// Define expected API response structure
interface ForgotPasswordResponse {
  message: string;
}

interface ForgotPasswordRequest {
  email: string;
  resetUrl: string;
}

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  mobile: z.string().regex(/^\d{10}$/, "Mobile must be 10 digits").optional().or(z.literal("")),
});

type ForgotPasswordFormInputs = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isFetchingEmail, setIsFetchingEmail] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordFormInputs>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
      mobile: "",
    }
  });

  const mobileValue = watch("mobile");
  const emailValue = watch("email");

  // Clear masked email and form email if mobile is cleared
  useEffect(() => {
    if (!mobileValue) {
      setMaskedEmail("");
      setValue("email", "");
    }
  }, [mobileValue, setValue]);

  // Fetch email when mobile number is filled
  useEffect(() => {
    if (mobileValue && /^\d{10}$/.test(mobileValue)) {
      const fetchEmail = async () => {
        setIsFetchingEmail(true);
        try {
          const resp: any = await get(`/auth/email-by-mobile?mobile=${mobileValue}`);
          if (resp && resp.email) {
            setValue('email', resp.email, { shouldValidate: true });
            setMaskedEmail(resp.maskedEmail);
            toast.success("Account found! Email populated.");
          }
        } catch (err: any) {
          console.error("Failed to fetch email by mobile:", err);
          if (mobileValue.length === 10) {
            toast.error("No account found with this mobile number.");
          }
        } finally {
          setIsFetchingEmail(false);
        }
      };
      fetchEmail();
    }
  }, [mobileValue, setValue]);

  useEffect(() => {
    const emailFromQuery = searchParams.get('email');
    if (emailFromQuery) {
      setValue('email', emailFromQuery);
    }
  }, [searchParams, setValue]);

  const forgotPasswordMutation = useMutation<
    ForgotPasswordResponse,
    unknown,
    ForgotPasswordRequest
  >({
    mutationFn: (data) => post("/auth/forgot-password", data),
    onSuccess: () => {
      toast.success(
        "Password reset instructions have been sent to your email."
      );
      navigate("/");
    },
    onError: (error: any) => {
      Validate(error, setError);
      if (error.message) {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred");
      }
    },
  });

  const onSubmit: SubmitHandler<ForgotPasswordFormInputs> = (data) => {
    const resetUrl = `${window.location.origin}/reset-password`;
    // Use the value from getValues to ensure we send the full email even if display is masked
    const emailToSend = getValues("email");
    forgotPasswordMutation.mutate({ email: emailToSend, resetUrl });
  };

  const { onChange: emailOnChange, onBlur: emailOnBlur, name: emailName, ref: emailRef } = register("email");

  return (
    <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold">Forgot Password</h1>
          <p className="text-balance text-muted-foreground text-sm">
            Enter your mobile or email address to reset your password
          </p>
        </div>
        
        <div className="grid gap-4">
          {/* Mobile Number Field */}
          <div className="grid gap-2">
            <Label htmlFor="mobile" className="flex items-center gap-2">
              <Smartphone className="size-3.5" />
              Mobile Number (Optional)
            </Label>
            <div className="relative">
              <Input
                id="mobile"
                type="tel"
                placeholder="Enter 10 digit mobile"
                {...register("mobile")}
                disabled={forgotPasswordMutation.isPending || isFetchingEmail}
                className={isFetchingEmail ? "pr-10" : ""}
              />
              {isFetchingEmail && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {errors.mobile && (
              <span className="text-xs text-destructive">{errors.mobile.message}</span>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Email Field */}
          <div className="grid gap-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="size-3.5" />
              Email Address
            </Label>
            <Input
              id="email"
              name={emailName}
              ref={emailRef}
              onBlur={emailOnBlur}
              type={maskedEmail ? "text" : "email"}
              placeholder="name@example.com"
              value={maskedEmail || emailValue}
              onChange={(e) => {
                if (!maskedEmail) {
                  emailOnChange(e);
                }
              }}
              required
              disabled={forgotPasswordMutation.isPending || !!mobileValue}
            />
            {errors.email && (
              <span className="text-xs text-destructive">{errors.email.message}</span>
            )}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={forgotPasswordMutation.isPending || isFetchingEmail}
        >
          {forgotPasswordMutation.isPending ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send Reset Link"
          )}
        </Button>

        <div className="text-center text-sm">
          Remember your password?{" "}
          <a href="/" className="underline underline-offset-4 font-medium">
            Login
          </a>
        </div>
      </div>
    </form>
  );
};

export default ForgotPassword;
