
import type { Metadata } from "next";
import "./globals.css";
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { ClientLayout } from "./client-layout";

const DEFAULT_FAVICON = "/favicon.ico";

export async function generateMetadata(): Promise<Metadata> {
  let faviconUrl = DEFAULT_FAVICON;
  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
    const docRef = doc(db, 'settings', 'appearance');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      faviconUrl = docSnap.data().faviconUrl || DEFAULT_FAVICON;
    }
  } catch (e) {
    console.error("Error fetching favicon:", e);
  }
  
  return {
    icons: {
      icon: faviconUrl,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lexend:wght@700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
