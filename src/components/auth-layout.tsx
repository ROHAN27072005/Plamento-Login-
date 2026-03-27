import type { ReactNode } from 'react';
import { Flame } from 'lucide-react';
import Link from 'next/link';

export function AuthLayout({ children, title }: { children: ReactNode, title: string }) {
  return (
    <div className="flex min-h-screen flex-col">
        <main className="flex-grow flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
                <div className="flex justify-center items-center mb-4">
                    <Flame className="w-10 h-10 text-primary"/>
                    <h1 className="text-3xl font-bold tracking-tighter ml-2">
                        Plamento
                    </h1>
                </div>
                <p className="text-muted-foreground">{title}</p>
            </div>
            {children}
          </div>
        </main>
        <footer className="py-4 px-6 text-center text-sm text-muted-foreground">
            © 2025 Plamento |{' '}
            <Link href="#" className="hover:text-primary">Support</Link> |{' '}
            <Link href="#" className="hover:text-primary">Privacy</Link> |{' '}
            <Link href="#" className="hover:text-primary">Terms</Link>
        </footer>
    </div>
  );
}
