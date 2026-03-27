import { AuthLayout } from '@/components/auth-layout';
import { SignInForm } from '@/components/auth/signin-form';

export default function SignInPage() {
  return (
    <AuthLayout title="Welcome back! Sign in to continue.">
      <SignInForm />
    </AuthLayout>
  );
}
