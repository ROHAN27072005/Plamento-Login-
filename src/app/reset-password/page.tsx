
import { AuthLayout } from '@/components/auth-layout';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export default function ResetPasswordPage() {
    return (
        <AuthLayout title="Set a new password">
            <ResetPasswordForm />
        </AuthLayout>
    );
}
