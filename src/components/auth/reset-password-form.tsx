
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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

export function ResetPasswordForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasPasswordRecoverySession, setHasPasswordRecoverySession] = useState(false);
  
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            setHasPasswordRecoverySession(true);
        }
    });

    // Check if there's a recovery token on initial load without waiting for the event
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
        setHasPasswordRecoverySession(true);
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const password = form.watch('password');
  const passwordRequirements = [
    { text: 'At least 8 characters', fulfilled: (password?.length ?? 0) >= 8 },
    { text: 'One uppercase letter', fulfilled: /[A-Z]/.test(password) },
    { text: 'One lowercase letter', fulfilled: /[a-z]/.test(password) },
    { text: 'One number', fulfilled: /[0-9]/.test(password) },
    { text: 'One special character', fulfilled: /[^a-zA-Z0-9]/.test(password) },
  ];

  const handlePasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setIsLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error updating password',
        description: error.message,
      });
    } else {
      toast({
        title: 'Success!',
        description: 'Your password has been reset successfully.',
      });
      router.push('/signin');
    }
  };

  if (!hasPasswordRecoverySession) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Invalid or Expired Link</CardTitle>
                  <CardDescription>
                      This password reset link is invalid or has expired. Please request a new one.
                  </CardDescription>
              </CardHeader>
               <CardContent>
                  <Button onClick={() => router.push('/forgot-password')} className="w-full">
                      Request New Link
                  </Button>
               </CardContent>
          </Card>
      )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set New Password</CardTitle>
        <CardDescription>Please enter a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handlePasswordSubmit)} className="space-y-4">
            <FormField control={form.control} name="password" render={({ field }) => (
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
                    <div key={i} className={cn("flex items-center", req.fulfilled ? "text-green-500" : "text-muted-foreground")}>
                        <CheckCircle2 className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{req.text}</span>
                    </div>
                ))}
            </div>

            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
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
    </Card>
  );
}
