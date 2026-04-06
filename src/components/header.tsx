
'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  LogIn, 
  UserPlus, 
  LogOut, 
  LayoutDashboard, 
  Search, 
  ShoppingBag, 
  ShieldCheck, 
  BookOpen,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const DEFAULT_LOGO = "https://res.cloudinary.com/dabgothkm/image/upload/v1772217426/arlington-teheran-WL-oIapq6TY-unsplash_dps0i1.png";
const DEV_UID = 'Iit0JbEKytRkn35p4K0Rat6z4SE3';
const ADMIN_EMAILS = ['atirndev@stickyslap.com', 'sticky@stickyslap.com', 'atirn.dev@gmail.com'];

export default function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    const updateCartCount = () => {
      const cart = JSON.parse(sessionStorage.getItem('society_cart') || '[]');
      setCartCount(cart.length);
    };
    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    const interval = setInterval(updateCartCount, 1000);
    return () => {
      window.removeEventListener('storage', updateCartCount);
      clearInterval(interval);
    };
  }, []);

  const appearanceRef = useMemoFirebase(() => doc(db, 'settings', 'appearance'), [db]);
  const { data: appearance } = useDoc<any>(appearanceRef);
  
  const roleRef = useMemoFirebase(() => (user ? doc(db, 'roles', user.uid) : null), [db, user]);
  const { data: roleData } = useDoc<any>(roleRef);

  const logoUrl = appearance?.logoUrl || DEFAULT_LOGO;

  const isStaff = !!roleData?.role || (user?.uid === DEV_UID) || (user?.email && ADMIN_EMAILS.includes(user.email));

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const navLinks = [
    { name: 'Products', href: '/products' },
    { name: 'Journal', href: '/blog', icon: BookOpen },
    { name: 'Track Order', href: '/track', icon: Search, highlight: true },
    { name: 'About Us', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <header className={cn("px-4 lg:px-6 h-16 flex items-center sticky top-0 z-50 w-full border-b transition-all duration-300", isMounted ? "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" : "bg-background")}>
      <Link href="/" className="flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
        <Image src={logoUrl} alt="Sticky Slap" width={180} height={45} className="h-9 md:h-10 w-auto object-contain" priority unoptimized />
      </Link>
      
      <div className="ml-auto flex items-center gap-1 sm:gap-4">
        {isMounted && (
          <>
            <nav className="hidden lg:flex items-center gap-6 mr-4">
              {navLinks.map((link) => (
                <Link key={link.name} href={link.href} className={cn("text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5", link.highlight ? "text-primary font-bold" : "text-muted-foreground")}>
                  {link.icon && <link.icon className="h-3.5 w-3.5" />}
                  {link.name}
                </Link>
              ))}
            </nav>

            <Link href="/checkout" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground flex items-center gap-2 group px-2 py-1 rounded-full hover:bg-primary/5 border border-transparent hover:border-primary/10 relative">
              <ShoppingBag className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="hidden sm:inline font-black uppercase tracking-widest text-[10px]">Cart</span>
              {cartCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[8px] font-black bg-primary text-white border-none animate-in zoom-in-50">
                  {cartCount}
                </Badge>
              )}
            </Link>

            {user && (
              <Link href="/dashboard" className="hidden sm:flex text-sm font-medium text-muted-foreground transition-colors hover:text-primary items-center gap-2 group px-2 py-1 rounded-full hover:bg-primary/5 border border-transparent hover:border-primary/10" title="Member Dashboard">
                <LayoutDashboard className="h-5 w-5 text-primary" />
                <span className="hidden xl:inline font-black uppercase tracking-widest text-[10px]">Dashboard</span>
              </Link>
            )}

            {user && isStaff && (
              <Link href="/admin" className="hidden sm:flex text-sm font-medium text-muted-foreground transition-colors hover:text-primary items-center gap-2 group px-2 py-1 rounded-full hover:bg-primary/5 border border-transparent hover:border-primary/10" title="Admin Workstation">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="hidden xl:inline font-black uppercase tracking-widest text-[10px]">Workstation</span>
              </Link>
            )}

            {isUserLoading ? (
              <div className="flex items-center gap-2"><Skeleton className="h-9 w-20 md:w-24 rounded-md" /></div>
            ) : user ? (
              <Button onClick={handleSignOut} variant="outline" size="sm" className="hidden sm:flex rounded-xl font-bold uppercase text-[10px] tracking-widest">
                <LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out
              </Button>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <Button asChild variant="ghost" size="sm" className="font-black uppercase text-[10px] tracking-widest px-2 sm:px-4"><Link href="/login">Login</Link></Button>
                <Button asChild size="sm" className="rounded-xl font-black uppercase text-[10px] tracking-widest bg-primary text-white px-4"><Link href="/signup">Join —</Link></Button>
              </div>
            )}

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden rounded-xl h-10 w-10"><Menu className="h-6 w-6" /></Button></SheetTrigger>
              <SheetContent side="right" className="w-[300px] rounded-l-[2rem] p-0 overflow-hidden">
                <SheetHeader className="p-6 border-b bg-muted/30"><SheetTitle className="flex justify-center"><Image src={logoUrl} alt="Logo" width={140} height={35} className="h-8 w-auto object-contain" unoptimized /></SheetTitle></SheetHeader>
                <div className="flex flex-col h-full">
                  <nav className="flex-1 p-6 space-y-2">
                    {navLinks.map((link) => (
                      <Link key={link.name} href={link.href} onClick={() => setIsOpen(false)} className={cn("flex items-center justify-between p-4 rounded-2xl transition-all border-2 border-transparent hover:border-primary/20 hover:bg-primary/5 group", link.highlight ? "text-primary bg-primary/5 border-primary/10" : "text-foreground")}>
                        <div className="flex items-center gap-3">{link.icon && <link.icon className="h-4 w-4" />}<span className="text-sm font-black uppercase tracking-widest">{link.name}</span></div>
                        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </Link>
                    ))}
                    
                    {user && (
                      <>
                        <Separator className="my-4" />
                        <Link href="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-4 text-sm font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                          <LayoutDashboard className="h-4 w-4" /> Member Dashboard
                        </Link>
                        {isStaff && (
                          <Link href="/admin" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-4 text-sm font-black uppercase tracking-widest text-primary">
                            <ShieldCheck className="h-4 w-4" /> Staff Workstation
                          </Link>
                        )}
                      </>
                    )}
                  </nav>
                  <div className="p-6 border-t bg-muted/10 space-y-4">
                    {user ? (
                      <Button onClick={() => { handleSignOut(); setIsOpen(false); }} variant="outline" className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px]"><LogOut className="mr-2 h-4 w-4" /> Sign Out</Button>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <Button asChild variant="outline" className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px]"><Link href="/login">Sign In</Link></Button>
                        <Button asChild className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary text-white"><Link href="/signup">Join —</Link></Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>
    </header>
  );
}
