
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarIcon, Eye, EyeOff, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-client';
import { generateResetCode } from '@/ai/flows/secure-password-reset-code';
import { sendSignupCodeEmail } from '@/app/actions/send-signup-code-email';
import { confirmSignup } from '@/app/actions/confirm-signup';

const phoneValidation = (countryCode: string, phone: string) => {
    if (countryCode === '+91') return /^\d{10}$/.test(phone);
    if (countryCode === '+1') return /^\d{10}$/.test(phone);
    if (countryCode === '+44') return /^\d{10}$/.test(phone);
    return true; // No validation for other country codes
};

const getPhoneMessage = (countryCode: string) => {
    if (countryCode === '+91') return 'Phone number must be 10 digits for India';
    if (countryCode === '+1') return 'Phone number must be 10 digits for US/Canada';
    if (countryCode === '+44') return 'Phone number must be 10 digits for the UK';
    return 'Invalid phone number';
}

const signUpSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    countryCode: z.string(),
    phone: z.string().min(1, 'Phone number is required').regex(/^\d+$/, 'Phone number must contain only digits'),
    dob: z.date({ required_error: 'Date of birth is required' }),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[a-z]/, 'Password must contain a lowercase letter')
        .regex(/[A-Z]/, 'Password must contain an uppercase letter')
        .regex(/[0-9]/, 'Password must contain a number')
        .regex(/[^a-zA-Z0-9]/, 'Password must contain a special character'),
    confirmPassword: z.string()
})
.refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
})
.superRefine((data, ctx) => {
    if (!phoneValidation(data.countryCode, data.phone)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: getPhoneMessage(data.countryCode),
            path: ['phone']
        });
    }
});


export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Store user data between steps
  const [signupData, setSignupData] = useState<z.infer<typeof signUpSchema> | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      countryCode: '+91',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 2 && resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    } else if (resendCooldown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, resendCooldown]);

  const password = form.watch('password');
  
  const passwordRequirements = [
    { text: 'At least 8 characters', fulfilled: (password?.length ?? 0) >= 8 },
    { text: 'One uppercase letter', fulfilled: /[A-Z]/.test(password) },
    { text: 'One lowercase letter', fulfilled: /[a-z]/.test(password) },
    { text: 'One number', fulfilled: /[0-9]/.test(password) },
    { text: 'One special character', fulfilled: /[^a-zA-Z0-9]/.test(password) },
  ];

  const sendVerificationCode = async (email: string, uId: string) => {
    const generatedCode = await generateResetCode();

    if (!generatedCode) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not generate verification code.' });
        return false;
    }
    
    const { error: storeTokenError } = await supabase.rpc('store_signup_token', { user_id_in: uId, token_in: generatedCode });

    if (storeTokenError) {
         toast({ variant: 'destructive', title: 'Error', description: 'Could not prepare verification. Please try again.' });
         return false;
    }
    
    const emailResult = await sendSignupCodeEmail({ email: email, code: generatedCode });
    
    if (emailResult.error) {
        toast({ variant: 'destructive', title: 'Error', description: emailResult.error });
        return false;
    }

    toast({
      title: 'Verification Code Sent',
      description: `A 6-digit code has been sent to your email address.`,
    });
    
    return true;
  }

  async function handleSignupSubmit(values: z.infer<typeof signUpSchema>) {
    setIsLoading(true);

    const { email, password, firstName, lastName, phone, countryCode, dob } = values;
    
    // This creates the user but does not confirm their email.
    // It also does not send Supabase's default email.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: `${countryCode}${phone}`,
          dob: format(dob, 'yyyy-MM-dd'),
        },
      },
    });

    if (error) {
      setIsLoading(false);
      toast({ variant: 'destructive', title: "Error signing up", description: error.message });
      return;
    }

    if (!data.user) {
        setIsLoading(false);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not create an account. Please try again.'});
        return;
    }

    // Store data for the next step
    setSignupData(values);
    setUserId(data.user.id);
    
    const codeSent = await sendVerificationCode(email, data.user.id);

    if (codeSent) {
        setStep(2);
        setResendCooldown(30);
        setCanResend(false);
    }
    
    setIsLoading(false);
  }

  const handleResendCode = async () => {
    if (!signupData || !userId) {
       toast({ variant: 'destructive', title: 'Error', description: 'Could not resend code. Please start over.' });
       return;
    }
    setIsLoading(true);
    setCanResend(false);
    
    const codeSent = await sendVerificationCode(signupData.email, userId);

    if (codeSent) {
        setCode('');
        setCodeError('');
        setResendCooldown(30);
    }
    setIsLoading(false);
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
        setCodeError('Please enter the 6-digit code.');
        return;
    }
    if (!userId || !signupData) {
        toast({ variant: 'destructive', title: 'Error', description: 'Session expired. Please start over.' });
        return;
    }

    setIsLoading(true);
    setCodeError('');

    const { data: isValid, error: verificationError } = await supabase.rpc('verify_signup_token', {
      user_id_in: userId,
      token_in: code
    });

    if (verificationError || !isValid) {
      setCodeError('Invalid or expired code. Please try again.');
      setIsLoading(false);
      return;
    }
    
    // Code is valid, now confirm the user account
    const confirmResult = await confirmSignup({ userId, email: signupData.email });

    if (confirmResult.error) {
        toast({ variant: 'destructive', title: 'Error', description: confirmResult.error });
        setIsLoading(false);
        return;
    }

    toast({ title: 'Account Confirmed!', description: 'Your account has been successfully created. Please sign in.' });
    router.push('/signin');
    setIsLoading(false);
  };


  if (step === 2) {
    return (
        <Card>
            <CardHeader>
            <CardTitle>Enter Verification Code</CardTitle>
            <CardDescription>Check your email for the 6-digit code we sent to {signupData?.email}.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleCodeSubmit} className="space-y-6 flex flex-col items-center">
                    <div className="space-y-2 text-center">
                        <label htmlFor="otp-input" className="text-sm font-medium">Verification Code</label>
                        <InputOTP id="otp-input" maxLength={6} value={code} onChange={setCode}>
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                        </InputOTP>
                        {codeError && <p className="text-sm font-medium text-destructive">{codeError}</p>}
                    </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Account
                </Button>
                <div className="text-center text-sm">
                        {canResend ? (
                            <Button variant="link" onClick={handleResendCode} disabled={isLoading}>
                                {isLoading ? 'Sending...' : 'Resend Code'}
                            </Button>
                        ) : (
                            <p className="text-muted-foreground">
                                Resend code in {resendCooldown}s
                            </p>
                        )}
                    </div>
                </form>
            </CardContent>
                <CardFooter>
                <Button variant="link" className="w-full text-muted-foreground" onClick={() => router.push('/signin')}>
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Back to Sign In
                </Button>
            </CardFooter>
        </Card>
    );
  }

  return (
    <Card>
        <CardContent className="p-6">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSignupSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                        <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                        <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="name@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <div className="flex gap-2">
                        <FormField control={form.control} name="countryCode" render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="+91">IN (+91)</SelectItem>
                                    <SelectItem value="+1">US (+1)</SelectItem>
                                    <SelectItem value="+44">UK (+44)</SelectItem>
                                </SelectContent>
                            </Select>
                        )} />
                        <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormControl><Input type="tel" placeholder="9876543210" {...field} /></FormControl>
                        )} />
                    </div>
                        <FormMessage>{form.formState.errors.phone?.message}</FormMessage>
                </FormItem>
                <FormField control={form.control} name="dob" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Date of Birth</FormLabel>
                        <Popover><PopoverTrigger asChild>
                            <FormControl>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                        </PopoverContent></Popover>
                    <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Password</FormLabel>
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
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem><FormLabel>Confirm Password</FormLabel>
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
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
            </form>
            </Form>
        </CardContent>
        <CardFooter className="p-6 pt-0">
                <p className="w-full text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/signin" className="font-medium text-primary hover:underline">
                    Sign In
                </Link>
            </p>
        </CardFooter>
    </Card>
  );
}
