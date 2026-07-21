import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthSimpleFrame } from "@/components/auth/auth-simple-frame";

export default function ForgotPasswordPage() {
  return (
    <AuthSimpleFrame
      title="Reset password"
      description="We will email a reset link if your account is authorized."
    >
      <ForgotPasswordForm />
    </AuthSimpleFrame>
  );
}
