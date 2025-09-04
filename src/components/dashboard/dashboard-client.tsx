
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutGrid, LogOut, User, Loader2, Mail, Phone, Calendar, Map, ScanText } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface UserProfile {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    dob: string;
}

export function DashboardClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const user = session.user;
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error fetching profile:', error);
            // Fallback to user metadata if profile is not ready
            if (user.email && user.user_metadata) {
                 setProfile({
                    email: user.email,
                    first_name: user.user_metadata.first_name,
                    last_name: user.user_metadata.last_name,
                    phone: user.user_metadata.phone,
                    dob: user.user_metadata.dob,
                 });
            } else {
                // If we can't construct a profile, treat as an error
                setProfile(null);
                router.push('/signin');
            }
          } else {
            setProfile(data);
          }
        } else {
          // No session, redirect to signin
          setProfile(null);
          router.push('/signin');
        }
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/signin');
  };

  const getInitials = (firstName?: string) => {
    return `${firstName?.[0] ?? ''}`.toUpperCase();
  };
  
  if (loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6 z-10">
        <h1 className="text-xl font-semibold">{showProfile ? 'User Profile' : 'Dashboard'}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <Avatar>
                 <AvatarFallback>
                    {getInitials(profile?.first_name)}
                </AvatarFallback>
              </Avatar>
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
                {profile ? (
                    <>
                        <p className="font-medium">{profile.first_name} {profile.last_name}</p>
                        <p className="text-xs text-muted-foreground">{profile.email}</p>
                    </>
                ) : (
                    <>
                        <p className="font-medium">User Name</p>
                        <p className="text-xs text-muted-foreground">user@example.com</p>
                    </>
                )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowProfile(!showProfile)}>
              <User className="mr-2 h-4 w-4" />
              <span>{showProfile ? 'Hide Profile' : 'View Profile'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="mb-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Welcome to Plamento{profile ? `, ${profile.first_name}` : ''}!</h2>
            <p className="text-muted-foreground">{showProfile ? 'Here are your account details.' : 'Here\'s a snapshot of your workspace.'}</p>
        </div>
        
        {showProfile ? (
            <div className="flex justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Your personal details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">Full Name</p>
                                <p className="font-medium">{profile?.first_name} {profile?.last_name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium">{profile?.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">Phone</p>
                                <p className="font-medium">{profile?.phone}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">Date of Birth</p>
                                <p className="font-medium">{profile?.dob ? format(new Date(profile.dob), 'PPP') : 'N/A'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        ) : (
            <div className="flex justify-center">
                <div className="grid w-full max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
                    <Link href="https://skill-mapper-seven.vercel.app/" className="block">
                        <Card className="flex flex-col justify-between h-44 p-6 bg-gradient-to-br from-primary to-accent text-primary-foreground transition-transform hover:scale-105 cursor-pointer">
                            <div>
                                <Map className="w-8 h-8 opacity-75" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold">SkillMapper</h3>
                                <p className="text-sm opacity-90">Visually map your skills and career path.</p>
                            </div>
                        </Card>
                    </Link>
                    <Link href="https://scancv.vercel.app/" className="block">
                        <Card className="flex flex-col justify-between h-44 p-6 bg-gradient-to-br from-primary to-accent text-primary-foreground transition-transform hover:scale-105 cursor-pointer">
                            <div>
                                <ScanText className="w-8 h-8 opacity-75" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold">ScanCV</h3>
                                <p className="text-sm opacity-90">Scan and analyze your CV with AI.</p>
                            </div>
                        </Card>
                    </Link>
                     <Card className="h-44 p-6 bg-gradient-to-br from-primary to-accent text-primary-foreground opacity-50 cursor-not-allowed"></Card>
                     <Card className="h-44 p-6 bg-gradient-to-br from-primary to-accent text-primary-foreground opacity-50 cursor-not-allowed"></Card>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
