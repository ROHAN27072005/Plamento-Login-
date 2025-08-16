
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, CheckCircle2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { verifyUser } from '@/app/actions/verify-user';
import { generateResetCode } from '@/ai/flows/secure-password-reset-code';
import { updatePassword } from '@/app/actions/update-password';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase-client';

const emailSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
});

const codeSchema = z.object({
  code: z.string().min(6, { message: 'Please enter the 6-digit code.' }),
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
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const password = passwordForm.watch('password');
  const passwordRequirements = [
    { text: 'At least 8 characters', fulfilled: (password?.length ?? 0) >= 8 },
    { text: 'One uppercase letter', fulfilled: /[A-Z]/.test(password) },
    { text: 'One lowercase letter', fulfilled: /[a-z]/.test(password) },
    { text: 'One number', fulfilled: /[0-9]/.test(password) },
    { text: 'One special character', fulfilled: /[^a-zA-Z0-9]/.test(password) },
  ];

  const handleEmailSubmit = async (values: z.infer<typeof emailSchema>) => {
    setIsLoading(true);
    emailForm.clearErrors('email');
    
    const result = await verifyUser(values.email);

    if (result.error) {
      emailForm.setError('email', { type: 'manual', message: result.error });
      setIsLoading(false);
      return;
    }
    
    if (result.userId) {
      setUserId(result.userId);
      const code = await generateResetCode();

      if (code) {
        // Store the hashed token in the database
        const { error: storeTokenError } = await supabase.rpc('store_password_reset_token', { user_id_in: result.userId, token_in: code });

        if (storeTokenError) {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not generate reset code. Please try again.' });
             setIsLoading(false);
             return;
        }

        // In a real app, you'd email this code.
        // For this prototype, we'll show it in a toast.
        toast({
          title: 'Verification Code',
          description: `Your code is ${code}. Please check your email.`,
        });
        setStep(2);
      }
    }
    setIsLoading(false);
  };

  const handleCodeSubmit = async (values: z.infer<typeof codeSchema>) => {
    setIsLoading(true);
    codeForm.clearErrors('code');

    const { data: isValid, error } = await supabase.rpc('verify_password_reset_token', {
      user_id_in: userId,
      token_in: values.code
    });

    if (error || !isValid) {
      codeForm.setError('code', { type: 'manual', message: 'Invalid or expired code. Please try again.' });
      setIsLoading(false);
      return;
    }
    
    setStep(3);
    setIsLoading(false);
  };
  
  const handlePasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    setIsLoading(true);
    const result = await updatePassword({ userId: userId, password: values.password });

    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
      setIsLoading(false);
      return;
    }
    
    toast({ title: 'Success!', description: 'Your password has been reset successfully.' });
    router.push('/signin');
    setIsLoading(false);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>Enter your email and we'll send you a 6-digit code to reset your password.</CardDescription>
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
                    Send Reset Code
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter>
                 <Button variant="link" className="w-full text-muted-foreground" asChild>
                    <Link href="/signin">
                        <ArrowLeft className="mr-2 h-4 w-4"/>
                        Back to Sign In
                    </Link>
                </Button>
            </CardFooter>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Enter Verification Code</CardTitle>
              <CardDescription>Check your email for the 6-digit code we sent you.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...codeForm}>
                <form onSubmit={codeForm.handleSubmit(handleCodeSubmit)} className="space-y-6 flex flex-col items-center">
                  <FormField control={codeForm.control} name="code" render={({ field }) => (
                    <FormItem>
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
                  )} />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Reset Code
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter>
                 <Button variant="link" className="w-full text-muted-foreground" asChild>
                    <Link href="/signin">
                        <ArrowLeft className="mr-2 h-4 w-4"/>
                        Back to Sign In
                    </Link>
                </Button>
            </CardFooter>
          </Card>
        );
       case 3:
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Set New Password</CardTitle>
                    <CardDescription>Please enter a new password for your account.</CardDescription>
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                {passwordRequirements.map((req, i) => (
                                    <div key={i} className={cn("flex items-center", req.fulfilled ? "text-chart-2" : "text-muted-foreground")}>
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
                            Set New Password
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter>
                     <Button variant="link" className="w-full text-muted-foreground" asChild>
                        <Link href="/signin">
                            <ArrowLeft className="mr-2 h-4 w-4"/>
                            Back to Sign In
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        );
      default:
        return null;
    }
  };

  return <div>{renderStep()}</div>;
}
