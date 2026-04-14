'use client';

import React, { useEffect, createContext, useContext, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  Settings, 
  Users, 
  FileText, 
  LifeBuoy, 
  Search,
  Bell,
  Menu,
  ImageIcon,
  Zap,
  Tag,
  BookOpen,
  Share2,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  History,
  LogOut,
  Monitor,
  X,
  Smartphone,
  UsersRound,
  LayoutTemplate,
  Contact,
  Layout as LayoutIcon,
  Settings2,
  Share,
  Mail,
  Palette,
  HelpCircle,
  ChevronDown,
  BellRing,
  TrendingUp,
  Globe,
  Calculator,
  PieChart,
  Boxes,
  Activity,
  DollarSign,
  Clock3,
  BarChart3,
  Target,
  Warehouse,
  Map as MapIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, collection, query, where, limit } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Role, Order, SupportTicket, UserProfile, PartnerLead, ShareableLink } from '@/lib/types';

const DEFAULT_LOGO = "https://res.cloudinary.com/dabgothkm/image/upload/v1772217426/arlington-teheran-WL-oIapq6TY-unsplash_dps0i1.png";
const DEV_UID = 'Iit0JbEKytRkn35p4K0Rat6z4SE3';
const ADMIN_EMAILS = ['atirndev@stickyslap.com', 'sticky@stickyslap.com', 'atirn.dev@gmail.com'];

interface AdminContextType {
  role: Role | null;
  isStaff: boolean;
  isSyncing: boolean;
}

const AdminContext = createContext<AdminContextType>({ role: null, isStaff: false, isSyncing: false });

export const useAdmin = () => useContext(AdminContext);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDev = user?.uid === DEV_UID || (user?.email && ADMIN_EMAILS.includes(user.email));

  const roleRef = useMemoFirebase(() => (user ? doc(db, 'roles', user.uid) : null), [db, user]);
  const { data: roleData, isLoading: isRoleLoading } = useDoc<Role>(roleRef);

  /**
   * SOCIETY SECURITY PROTOCOL:
   * isStaff defines entrance to the administrative workstation.
   */
  const isStaff = (!!roleData?.role && roleData.role !== 'Vendor') || isDev;

  // Fetch Firestore Profile for UI identity
  const profileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: profileData } = useDoc<UserProfile>(profileRef);

  // Fetch Branding
  const appearanceRef = useMemoFirebase(() => doc(db, 'settings', 'appearance'), [db]);
  const { data: appearance } = useDoc<any>(appearanceRef);
  
  // Guard dynamic assets against hydration mismatch
  const logoUrl = (isMounted && appearance?.logoUrl) ? appearance.logoUrl : DEFAULT_LOGO;

  const displayName = profileData?.name || user?.displayName || 'Staff Member';

  // REGISTRY ALERT QUERIES
  const newOrdersQuery = useMemoFirebase(() => {
    if (!user || !isStaff || (!roleData && !isDev)) return null;
    return query(collection(db, 'orders'), where('status', '==', 'Submitted'), limit(100));
  }, [db, user, isStaff, roleData, isDev]);

  const newTicketsQuery = useMemoFirebase(() => {
    if (!user || !isStaff || (!roleData && !isDev)) return null;
    return query(collection(db, 'support_tickets'), where('status', '==', 'open'), limit(100));
  }, [db, user, isStaff, roleData, isDev]);

  const newLeadsQuery = useMemoFirebase(() => {
    if (!user || !isStaff || (!roleData && !isDev)) return null;
    return query(collection(db, 'partner_leads'), where('status', '==', 'New'), limit(100));
  }, [db, user, isStaff, roleData, isDev]);

  const activeSharesQuery = useMemoFirebase(() => {
    if (!user || !isStaff || (!roleData && !isDev)) return null;
    return query(collection(db, 'shareable_links'), where('isActive', '==', true), limit(100));
  }, [db, user, isStaff, roleData, isDev]);

  const { data: newOrders } = useCollection<Order>(newOrdersQuery);
  const { data: newTickets } = useCollection<SupportTicket>(newTicketsQuery);
  const { data: newLeads } = useCollection<PartnerLead>(newLeadsQuery);
  const { data: activeShares } = useCollection<ShareableLink>(activeSharesQuery);

  const getBadgeCount = (href: string) => {
    if (href === '/admin/orders') return newOrders?.filter(o => !o.metadata?.isImported).length || 0;
    if (href === '/admin/support') return newTickets?.length || 0;
    if (href === '/admin/partners') return newLeads?.length || 0;
    if (href === '/admin/shares') return activeShares?.length || 0;
    return 0;
  };

  const realOrdersCount = newOrders?.filter(o => !o.metadata?.isImported).length || 0;
  const notificationCount = realOrdersCount + (newTickets?.length || 0) + (newLeads?.length || 0);

  useEffect(() => {
    if (isMounted && !isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router, isMounted]);

  useEffect(() => {
    const isStaffUser = (!!roleData?.role && roleData.role !== 'Vendor') || isDev;
    if (isStaffUser && !hasSynced) {
      setHasSynced(true);
      setIsSyncing(false);
    }
  }, [roleData?.role, user?.uid, hasSynced, isDev]);

  if (!isMounted) return null;

  if (isUserLoading || isRoleLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (!isStaff) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
        <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
        <h1 className="mb-2 text-2xl font-bold">Access Denied</h1>
        <p className="mb-6 max-w-md text-muted-foreground uppercase text-[10px] font-black tracking-widest leading-relaxed">
          Your account ({user.email}) is not authorized for administrative clearance. 
          Contact your shop owner to update your registry permissions.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" className="rounded-xl px-8" asChild>
            <Link href="/">Back to Shop</Link>
          </Button>
          <Button variant="ghost" onClick={() => signOut(auth)} className="text-muted-foreground hover:text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  const sidebarLinks = [
    {
      title: 'Operations',
      links: [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Orders', href: '/admin/orders', icon: Package },
        { name: 'Proofs', href: '/admin/proofs', icon: FileText },
        { name: 'Customers', href: '/admin/customers', icon: Users },
        { name: 'Shipping', href: '/admin/shipping', icon: Truck },
        { name: 'Shareable Links', href: '/admin/shares', icon: Share },
      ]
    },
    {
      title: 'Engagement',
      links: [
        { name: 'Partner Leads', href: '/admin/partners', icon: TrendingUp },
        { name: 'Support Tickets', href: '/admin/support', icon: LifeBuoy },
        { name: 'Newsletter List', href: '/admin/newsletter', icon: Mail },
      ]
    },
    {
      title: 'Catalog',
      links: [
        { name: 'Products', href: '/admin/products', icon: Package },
        { name: 'Catalog Header', href: '/admin/catalog-settings', icon: Palette },
        { name: 'Gallery', href: '/admin/gallery', icon: ImageIcon },
        { name: 'Pricing Rules', href: '/admin/pricing', icon: Zap },
        { name: 'Promotions', href: '/admin/promotions', icon: Tag },
      ]
    },
    {
      title: 'Communications',
      links: [
        { name: 'Email Templates', href: '/admin/notifications/email-templates', icon: Mail },
      ]
    },
    {
      title: 'Content CMS',
      links: [
        { name: 'Landing Page', href: '/admin/landing', icon: LayoutIcon },
        { name: 'About Page', href: '/admin/about', icon: LayoutTemplate },
        { name: 'Team Registry', href: '/admin/team', icon: UsersRound },
        { name: 'Contact Info', href: '/admin/contact', icon: Contact },
        { name: 'Blog Posts', href: '/admin/blogs', icon: FileText },
        { name: 'Blog Branding', href: '/admin/blog-settings', icon: Palette },
        { name: 'FAQs', href: '/admin/faqs', icon: HelpCircle },
        { name: 'Media Kit', href: '/admin/media-kit', icon: Share2 },
        { name: 'Help Articles', href: '/admin/help', icon: BookOpen },
        { name: 'SEO Snippets', href: '/admin/seo', icon: Globe },
      ]
    },
    {
      title: 'System Settings',
      links: [
        { name: 'User Roles', href: '/admin/roles', icon: Users },
        { name: 'Appearance', href: '/admin/appearance', icon: Monitor },
        { name: 'Checkout Editor', href: '/admin/checkout', icon: Settings2 },
        { name: 'Activity Journal', href: '/admin/activity', icon: History },
        { name: 'Viewport Simulator', href: '/admin/preview', icon: Smartphone },
        { name: 'Staff Profile', href: '/admin/profile', icon: Settings },
      ]
    }
  ];

  return (
    <AdminContext.Provider value={{ role: roleData || null, isStaff, isSyncing }}>
      <div className="flex min-h-screen bg-muted/30">
        <aside className="hidden w-72 border-r bg-background lg:block sticky top-0 h-screen overflow-y-auto no-print">
          <div className="flex h-20 items-center border-b px-8">
            <Link href="/" className="flex items-center justify-center">
              <Image 
                src={logoUrl} 
                alt="Print Society .co" 
                width={180} 
                height={45} 
                className="h-10 w-auto object-contain"
                unoptimized
              />
            </Link>
          </div>
          <nav className="space-y-6 p-4">
            {sidebarLinks.map((group) => (
              <Collapsible key={group.title} defaultOpen className="space-y-1">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 mb-2 hover:opacity-70 transition-opacity group/trigger">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    {group.title}
                  </h4>
                  <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 overflow-hidden">
                  {group.links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    const count = getBadgeCount(link.href);
                    
                    return (
                      <Link
                        key={link.name}
                        href={link.href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all",
                          isActive 
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{link.name}</span>
                        {count > 0 && (
                          <Badge className="h-5 px-1.5 text-[8px] font-black bg-primary text-white border-none animate-in zoom-in-50 duration-500">
                            {count}
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </nav>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 lg:px-8 no-print">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>
            
            <div className="lg:hidden flex-1 flex justify-center">
              <Link href="/">
                <Image src={logoUrl} alt="Print Society .co" width={140} height={35} className="h-8 w-auto object-contain" unoptimized />
              </Link>
            </div>
            
            <div className="flex flex-1 items-center gap-4 md:ml-auto md:gap-8 justify-end">
              <div className="relative flex-1 max-sm:hidden max-w-sm ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Global search..."
                  className="pl-10 h-11 bg-muted/50 rounded-xl focus-visible:bg-background border-none"
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-primary/5">
                    <Bell className="h-5 w-5" />
                    {notificationCount > 0 && (
                      <span className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center border-2 border-background">
                        {notificationCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 rounded-2xl p-0 overflow-hidden shadow-2xl">
                  <DropdownMenuLabel className="p-6 border-b bg-muted/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black uppercase tracking-widest">Workstation Notifications</span>
                      {notificationCount > 0 && <Badge className="text-[10px] font-black h-5">{notificationCount} New</Badge>}
                    </div>
                  </DropdownMenuLabel>
                  <ScrollArea className="h-[300px]">
                    <div className="p-2">
                      {newOrders && newOrders.filter(o => !o.metadata?.isImported).length > 0 && (
                        <div className="mb-4">
                          <p className="px-4 pb-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                            <Package className="h-3 w-3" /> New Order Intake
                          </p>
                          {newOrders.filter(o => !o.metadata?.isImported).map((order) => (
                            <DropdownMenuItem key={order.id} asChild className="rounded-xl focus:bg-primary/5 cursor-pointer">
                              <Link href={`/admin/orders/${order.id}`} className="flex flex-col items-start gap-1 p-4">
                                <div className="flex justify-between w-full">
                                  <span className="text-xs font-black font-mono text-primary">#{order.id.slice(0, 8)}</span>
                                  <span className="text-[10px] text-muted-foreground font-medium">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground line-clamp-1 font-medium">{order.customerEmail}</p>
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </div>
                      )}

                      {newTickets && newTickets.length > 0 && (
                        <div className="mb-4">
                          <p className="px-4 pb-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                            <LifeBuoy className="h-3 w-3" /> Support Inquiries
                          </p>
                          {newTickets.map((ticket) => (
                            <DropdownMenuItem key={ticket.id} asChild className="rounded-xl focus:bg-primary/5 cursor-pointer">
                              <Link href={`/admin/support/${ticket.id}`} className="flex flex-col items-start gap-1 p-4">
                                <div className="flex justify-between w-full">
                                  <span className="text-xs font-black line-clamp-1 uppercase tracking-tight">{ticket.category}</span>
                                  <span className="text-[10px] text-muted-foreground font-medium">{new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-[10px] text-muted-foreground font-medium">{ticket.customerEmail || 'Guest'}</p>
                                </div>
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </div>
                      )}

                      {notificationCount === 0 && (
                        <div className="py-12 text-center space-y-3 opacity-40">
                          <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground" />
                          <p className="text-xs font-black uppercase tracking-widest">Inbox Clear</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t bg-muted/10">
                    <Button variant="ghost" size="sm" className="w-full text-[10px] font-black uppercase tracking-[0.2em] h-10 rounded-xl" asChild>
                      <Link href="/admin/activity">Open Activity Journal —</Link>
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full border-2 border-transparent hover:border-primary/20 transition-all p-0 overflow-hidden">
                    <Avatar className="h-full w-full">
                      <AvatarImage src={user?.photoURL || ''} alt={displayName} />
                      <AvatarFallback className="font-black">{(displayName || user?.email || '?').charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 shadow-2xl">
                  <DropdownMenuLabel className="font-normal p-4">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black uppercase tracking-tight">{displayName}</p>
                        {roleData?.role && <Badge variant="outline" className="text-[8px] h-4 px-1.5 font-black uppercase tracking-tighter border-primary/20 text-primary">{roleData.role}</Badge>}
                      </div>
                      <p className="text-[10px] leading-none text-muted-foreground font-medium">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="rounded-xl font-bold uppercase tracking-widest text-[10px] py-3" asChild>
                    <Link href="/admin/profile">Profile Settings</Link>
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

          <main className="flex-1 p-4 md:p-8 lg:p-12">
            {children}
          </main>
        </div>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 lg:hidden no-print" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="absolute inset-y-0 left-0 w-72 bg-background shadow-2xl animate-in slide-in-from-left duration-300" onClick={e => e.stopPropagation()}>
              <div className="flex h-20 items-center justify-between px-6 border-b">
                <Image src={logoUrl} alt="Logo" width={140} height={35} className="h-8 w-auto object-contain" unoptimized />
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="space-y-6 p-4">
                {sidebarLinks.map((group) => (
                  <div key={group.title}>
                    <h4 className="mb-2 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                      {group.title}
                    </h4>
                    <div className="space-y-1">
                      {group.links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        const count = getBadgeCount(link.href);

                        return (
                          <Link
                            key={link.name}
                            href={link.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all",
                              isActive 
                                ? "bg-primary text-primary-foreground" 
                                : "text-muted-foreground hover:bg-muted"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="flex-1">{link.name}</span>
                            {count > 0 && (
                              <Badge className="h-5 px-1.5 text-[8px] font-black bg-primary text-white border-none">
                                {count}
                              </Badge>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </div>
        )}
      </div>
    </AdminContext.Provider>
  );
}
