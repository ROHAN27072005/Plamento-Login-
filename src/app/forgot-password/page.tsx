import { AuthLayout } from '@/components/auth-layout';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export default function ForgotPasswordPage() {
    return (
        <AuthLayout title="Forgot your password?">
            <ForgotPasswordForm />
        </AuthLayout>
    );
}
