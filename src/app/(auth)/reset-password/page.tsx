import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthSimpleFrame } from "@/components/auth/auth-simple-frame";

export default function ResetPasswordPage() {
  return (
    <AuthSimpleFrame
      title="Choose a new password"
      description="Use at least 8 characters."
    >
      <ResetPasswordForm />
    </AuthSimpleFrame>
  );
}
