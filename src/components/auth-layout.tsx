import type { ReactNode } from 'react';
import { Flame } from 'lucide-react';

export function AuthLayout({ children, title }: { children: ReactNode, title: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
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
  );
}
