'use client';

import Script from "next/script";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // SOCIETY VISITOR TRACKING PROTOCOL
  useEffect(() => {
    // Only track if not in admin area to ensure clean telemetry
    if (!pathname.startsWith('/admin')) {
      const logVisit = async () => {
        try {
          await fetch('/api/log-visitor', {
            method: 'POST',
            body: JSON.stringify({ url: window.location.href }),
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (e) {
          // Silent fail for non-blocking telemetry
        }
      };
      logVisit();
    }
  }, [pathname]);

  return (
    <>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            {children}
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
    </>
  );
}
