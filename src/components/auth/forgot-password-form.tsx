'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';

type Step = 'enter-email' | 'enter-code' | 'reset-password';

const emailSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
});

const codeSchema = z.object({
  code: z.string().length(6, { message: 'Code must be 6 digits.' }),
});

const passwordSchema = z.object({
  password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[0-9]/, 'Password must contain a number')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain a special character'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});


export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>('enter-email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleEmailSubmit = async (values: z.infer<typeof emailSchema>) => {
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password-callback`,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: 'Password Reset Email Sent',
        description: `If an account exists for ${values.email}, a password reset link has been sent.`,
      });
      // For demonstration, we'll just move to the next step. In a real app,
      // the user would click a link in their email.
      // To simulate this, we are not going to the next step automatically.
      // The user would need to check their email.
    }
    setIsLoading(false);
  };
  
  // This function would be on a separate page that the user is redirected to from their email
  const handlePasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    setIsLoading(true);
    // This is a placeholder. In a real implementation, you would get the
    // access token from the URL fragment after the user clicks the magic link.
    const access_token = "DUMMY_TOKEN_NEEDS_IMPLEMENTATION";
    const { error } = await supabase.auth.updateUser({ password: values.password })

    setIsLoading(false);
    
    if (error) {
       toast({ variant: 'destructive', title: 'Error', description: 'Failed to reset password. The link may have expired.' });
    } else {
       toast({ title: 'Password Reset!', description: 'Your password has been successfully reset.' });
       router.push('/signin');
    }
  };

  const password = passwordForm.watch('password');
  const passwordRequirements = [
    { text: 'At least 8 characters', fulfilled: (password?.length ?? 0) >= 8 },
    { text: 'One uppercase letter', fulfilled: /[A-Z]/.test(password) },
    { text: 'One lowercase letter', fulfilled: /[a-z]/.test(password) },
    { text: 'One number', fulfilled: /[0-9]/.test(password) },
    { text: 'One special character', fulfilled: /[^a-zA-Z0-9]/.test(password) },
  ];

  return (
    <Card>
      {step === 'enter-email' && (
        <>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>Enter your email and we&apos;ll send you a link to reset your password.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-6">
                <FormField control={emailForm.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input placeholder="name@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
              </form>
            </Form>
          </CardContent>
        </>
      )}

      {/* The rest of the password reset flow would happen after the user clicks the link in their email */}
      {/* For this reason, the UI for 'enter-code' and 'reset-password' is removed,
          as Supabase handles this via a magic link by default.
          A new page would be needed to handle the password update. */}
    </Card>
  );
}
