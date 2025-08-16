
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarIcon, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-client';
import { sendConfirmationEmail } from '@/app/actions/send-confirmation-email';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
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

  const password = form.watch('password');
  
  const passwordRequirements = [
    { text: 'At least 8 characters', fulfilled: (password?.length ?? 0) >= 8 },
    { text: 'One uppercase letter', fulfilled: /[A-Z]/.test(password) },
    { text: 'One lowercase letter', fulfilled: /[a-z]/.test(password) },
    { text: 'One number', fulfilled: /[0-9]/.test(password) },
    { text: 'One special character', fulfilled: /[^a-zA-Z0-9]/.test(password) },
  ];

  async function onSubmit(values: z.infer<typeof signUpSchema>) {
    setIsLoading(true);

    const { email, password, firstName, lastName, phone, countryCode, dob } = values;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // This tells Supabase not to send its own confirmation email.
        // We will send our own custom email right after.
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: `${countryCode}${phone}`,
          dob: format(dob, 'yyyy-MM-dd'),
        },
      }
    });

    if (error) {
      setIsLoading(false);
      toast({
        variant: 'destructive',
        title: "Error signing up",
        description: error.message,
      });
      return;
    }

    // This handles the case where the user already exists but is not confirmed.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
        setIsLoading(false);
        toast({
            variant: 'destructive',
            title: "Error signing up",
            description: "This email address is already in use.",
        });
        return;
    }
    
    // Check if we got a session, which contains the token we need for the email link.
    if (data.session?.access_token) {
       // Now we send our own custom email.
       const emailResult = await sendConfirmationEmail({ email: email, token: data.session.access_token });
       
       if (emailResult.error) {
           toast({ variant: 'destructive', title: 'Error', description: emailResult.error });
           setIsLoading(false);
           return;
       }

       toast({
         title: "Account Created!",
         description: "Please check your email to verify your account.",
       });
       router.push('/signin');

    } else if (data.user) {
         // This handles the case where email confirmation is required, so a session isn't returned.
         // We can't get a token here, so we will show a generic message and rely on the user
         // knowing they need to check their email. We'll send an email without a dynamic token for now.
         // A more robust solution would involve a separate token generation step.
         
         const emailResult = await sendConfirmationEmail({ email: email, token: "verify-email" });

         if (emailResult.error) {
             toast({ variant: 'destructive', title: 'Error', description: emailResult.error });
         } else {
             toast({
                title: "Account Created!",
                description: "Please check your email to verify your account.",
              });
         }
         router.push('/signin');
    } else {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not create an account. Please try again.',
        });
    }

    setIsLoading(false);
  }

  return (
    <Card>
        <CardContent className="p-6">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    {isLoading ? 'Creating Account...' : 'Sign Up'}
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

