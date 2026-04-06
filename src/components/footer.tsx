
'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

const DEFAULT_LOGO = "https://res.cloudinary.com/dabgothkm/image/upload/v1772217426/arlington-teheran-WL-oIapq6TY-unsplash_dps0i1.png";

export default function Footer() {
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const appearanceRef = useMemoFirebase(() => doc(db, 'settings', 'appearance'), [db]);
  const { data: appearance } = useDoc<any>(appearanceRef);
  
  const logoUrl = (isMounted && appearance?.logoUrl) ? appearance.logoUrl : DEFAULT_LOGO;

  if (!isMounted) return null;

  return (
    <footer className="py-12 border-t bg-muted/5 mt-auto">
      <div className="container px-4 md:px-6 mx-auto flex flex-col items-center gap-6">
        <Link href="/" className="flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
          <Image 
            src={logoUrl} 
            alt="Sticky Slap" 
            width={240} 
            height={60} 
            className="h-14 w-auto object-contain"
            unoptimized
          />
        </Link>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">&copy; 2024 Sticky Slap. All rights reserved.</p>
        <nav className="flex flex-wrap justify-center gap-8">
          <Link href="/partners" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70 transition-opacity hidden">Become a Partner</Link>
          <Link href="/vendor/login" className="text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors hidden">Vendor Portal</Link>
          <Link href="/legal/terms" className="text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors">Terms</Link>
          <Link href="/legal/privacy" className="text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors">Privacy</Link>
          <Link href="/contact" className="text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors">Contact</Link>
          <Link href="/blog" className="text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors">Blog</Link>
        </nav>
      </div>
    </footer>
  );
}
