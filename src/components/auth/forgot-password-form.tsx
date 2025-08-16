'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-client';
import { generateSecurePasswordResetCode } from '@/ai/flows/secure-password-reset-code';

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
  const [userId, setUserId] = useState('');
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
    try {
      // 1. Verify if email exists
      const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) throw authError;

      const user = users.find(u => u.email === values.email);
      
      if (!user) {
        emailForm.setError('email', { type: 'manual', message: 'Email was not registered.' });
        setIsLoading(false);
        return;
      }
      setUserId(user.id);
      setEmail(values.email);

      // 2. Generate secure code
      const { resetCode } = await generateSecurePasswordResetCode({ email: values.email });

      // 3. Store hashed code and expiry
      const { error: storeError } = await supabase.rpc('store_password_reset_token', {
        user_id_in: user.id,
        token_in: resetCode
      });
      
      if (storeError) throw storeError;

      // 4. "Send" code (show in toast for prototype)
      toast({
        title: 'Verification Code Sent',
        description: `A 6-digit code has been sent to your email. Your code is: ${resetCode}`,
        duration: 9000,
      });

      setStep('enter-code');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
      });
    }
    setIsLoading(false);
  };
  
  const handleCodeSubmit = async (values: z.infer<typeof codeSchema>) => {
    setIsLoading(true);
    try {
        const { data, error } = await supabase.rpc('verify_password_reset_token', {
            user_id_in: userId,
            token_in: values.code
        });

        if (error) throw error;

        if (data) {
            toast({ title: 'Code Verified!', description: 'You can now reset your password.' });
            setStep('reset-password');
        } else {
            codeForm.setError('code', { type: 'manual', message: 'The code you entered is incorrect or has expired.' });
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to verify code.' });
    }
    setIsLoading(false);
  };

  const handlePasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    setIsLoading(true);
    
    const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: values.password
    });

    setIsLoading(false);
    
    if (error) {
       toast({ variant: 'destructive', title: 'Error', description: 'Failed to reset password.' });
    } else {
       toast({ title: 'Password Reset!', description: 'Your password has been successfully reset.' });
       
       // Clean up the used token
       await supabase.from('password_reset_tokens').delete().eq('user_id', userId);

       router.push('/signin');
    }
  };

  const password = passwordForm.watch('password', '');
  const passwordRequirements = [
    { text: 'At least 8 characters', fulfilled: password.length >= 8 },
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
            <CardDescription>Enter your email and we'll send you a code to reset your password.</CardDescription>
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
                  Send Code
                </Button>
              </form>
            </Form>
          </CardContent>
        </>
      )}

      {step === 'enter-code' && (
        <>
          <CardHeader>
            <CardTitle>Enter Verification Code</CardTitle>
            <CardDescription>A 6-digit code was sent to {email}.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...codeForm}>
              <form onSubmit={codeForm.handleSubmit(handleCodeSubmit)} className="space-y-6">
                 <FormField
                    control={codeForm.control}
                    name="code"
                    render={({ field }) => (
                    <FormItem className="flex flex-col items-center">
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                        <InputOTP maxLength={6} {...field}>
                            <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                            </InputOTPGroup>
                        </InputOTP>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify Code
                </Button>
                 <Button variant="link" size="sm" onClick={() => setStep('enter-email')} className="w-full">
                    Back to email entry
                </Button>
              </form>
            </Form>
          </CardContent>
        </>
      )}
      
      {step === 'reset-password' && (
         <>
          <CardHeader>
            <CardTitle>Set New Password</CardTitle>
            <CardDescription>Create a new secure password for your account.</CardDescription>
          </CardHeader>
          <CardContent>
             <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                  <FormField control={passwordForm.control} name="password" render={({ field }) => (
                      <FormItem><FormLabel>New Password</FormLabel>
                          <FormControl><div className="relative">
                              <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...field} />
                              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                          </div></FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                      {passwordRequirements.map((req, i) => (
                          <div key={i} className={cn("flex items-center text-sm", req.fulfilled ? "text-chart-2" : "text-muted-foreground")}>
                              <CheckCircle2 className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span>{req.text}</span>
                          </div>
                      ))}
                  </div>

                  <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem><FormLabel>Confirm New Password</FormLabel>
                          <FormControl><div className="relative">
                              <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" {...field} />
                              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                          </div></FormControl>
                      <FormMessage /></FormItem>
                  )} />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset Password
                </Button>
              </form>
            </Form>
          </CardContent>
        </>
      )}
    </Card>
  );
}
