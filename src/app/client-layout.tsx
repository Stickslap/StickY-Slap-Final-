'use client';

import Script from "next/script";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const squareAppId = process.env.NEXT_PUBLIC_SQUARE_APP_ID || "sq0idp-zBKDnTXilwoxRhQx6CDOjw";
  const isSquareSandbox = squareAppId.startsWith('sandbox');
  const squareScriptUrl = isSquareSandbox 
    ? "https://sandbox.web.squarecdn.com/v1/square.js" 
    : "https://web.squarecdn.com/v1/square.js";

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
        <Script
          id="square-fix"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const descriptor = Object.getOwnPropertyDescriptor(window, 'fetch');
                if (descriptor && descriptor.get && !descriptor.set) {
                  Object.defineProperty(window, 'fetch', {
                    value: descriptor.get.call(window),
                    writable: true,
                    configurable: true
                  });
                }
              } catch (e) {
                console.warn('Could not make window.fetch writable', e);
              }
            `,
          }}
        />
        <Script src={squareScriptUrl} strategy="beforeInteractive" />
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
