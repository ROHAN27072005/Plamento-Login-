import { AuthLayout } from '@/components/auth-layout';
import { SignUpForm } from '@/components/auth/signup-form';

export default function SignUpPage() {
  return (
    <AuthLayout title="Create an account to get started.">
      <SignUpForm />
    </AuthLayout>
  );
}
