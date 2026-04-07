'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  LogOut, 
  Menu,
  X,
  Loader2,
  LifeBuoy,
  ShoppingBag,
  Settings,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { UserProfile } from '@/lib/types';

const LOGO_URL = "https://res.cloudinary.com/dabgothkm/image/upload/v1743789000/sticky-slap-logo.png";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const profileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: profile, isLoading: isProfileLoading } = useDoc<UserProfile>(profileRef);

  const appearanceRef = useMemoFirebase(() => doc(db, 'settings', 'appearance'), [db]);
  const { data: appearance } = useDoc<any>(appearanceRef);
  const logoUrl = (isMounted && appearance?.logoUrl) ? appearance.logoUrl : LOGO_URL;

  // Society Order Linker: Claim Guest Orders by Email
  // Mandatory: Must include limit(100) and proper userId filter to satisfy security rules
  useEffect(() => {
    if (isMounted && user?.email && !isClaiming) {
      const claimOrders = async () => {
        setIsClaiming(true);
        try {
          const guestOrdersQuery = query(
            collection(db, 'orders'),
            where('customerEmail', '==', user.email.toLowerCase()),
            limit(100)
          );
          const snapshot = await getDocs(guestOrdersQuery);
          
          snapshot.docs.forEach(orderDoc => {
            const data = orderDoc.data();
            // Only update if not already linked to this user
            if (data.userId !== user.uid) {
              updateDocumentNonBlocking(doc(db, 'orders', orderDoc.id), {
                userId: user.uid,
                updatedAt: new Date().toISOString()
              });
            }
          });
        } catch (e) {
          // Failure handled silently or by global error emitter if permission related
        }
      };
      claimOrders();
    }
  }, [user, isMounted, db, isClaiming]);

  if (!isMounted) return null;

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Orders', href: '/dashboard/orders', icon: Package },
    { name: 'Support', href: '/dashboard/support', icon: LifeBuoy },
    { name: 'Settings', href: '/dashboard/account', icon: Settings },
  ];

  const displayName = profile?.name || user?.displayName || 'Society Member';
  const displayEmail = user?.email || 'member@printsociety.co';

  const NavContent = () => (
    <nav className="space-y-1 p-4">
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-widest transition-all",
              isActive 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-muted/30 font-body">
      <aside className="hidden w-72 border-r bg-background lg:block sticky top-0 h-screen overflow-y-auto">
        <div className="flex h-20 items-center border-b px-8">
          <Link href="/" className="flex items-center justify-center">
            <Image src={logoUrl} alt="Print Society .co" width={180} height={45} className="h-10 w-auto object-contain" unoptimized />
          </Link>
        </div>
        <NavContent />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          
          <div className="lg:hidden flex-1 flex justify-center">
            <Link href="/">
              <Image src={logoUrl} alt="Print Society .co" width={140} height={35} className="h-8 w-auto object-contain" unoptimized />
            </Link>
          </div>
          
          <div className="flex flex-1 items-center justify-end gap-4">
            <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-primary/5" asChild>
              <Link href="/products">
                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border-2 border-transparent hover:border-primary/20 transition-all p-0 overflow-hidden">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={user?.photoURL || ''} alt={displayName} />
                    <AvatarFallback className="font-black">{displayEmail.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 shadow-2xl">
                <DropdownMenuLabel className="font-normal p-4">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-black uppercase tracking-tight truncate">{displayName}</p>
                    <p className="text-[10px] leading-none text-muted-foreground font-medium truncate">{displayEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="rounded-xl font-bold uppercase tracking-widest text-[10px] py-3" asChild>
                  <Link href="/dashboard/account">Profile Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive rounded-xl font-bold uppercase tracking-widest text-[10px] py-3"
                  onClick={() => signOut(auth)}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="absolute inset-y-0 left-0 w-72 bg-background shadow-2xl animate-in slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
              <div className="flex h-20 items-center justify-between px-6 border-b">
                <Image src={LOGO_URL} alt="Logo" width={140} height={35} className="h-8 w-auto object-contain" unoptimized />
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <NavContent />
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 lg:p-12 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
