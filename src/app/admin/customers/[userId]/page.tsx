'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Tag, 
  CreditCard, 
  FileText,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  History,
  Trophy,
  Star,
  DollarSign,
  MessageSquare,
  ChevronRight,
  Package,
  Clock,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { UserProfile, AccountTier, Order, SupportTicket } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const CUSTOMER_SEGMENTS = ['Retail', 'Wholesale', 'Non-Profit', 'VIP', 'Agency', 'Internal'];
const ACCOUNT_TIERS: AccountTier[] = ['Standard', 'Gold', 'Platinum', 'Elite'];

export default function EditCustomerPage(props: { params: Promise<{ userId: string }> }) {
  const params = React.use(props.params);
  const userId = params.userId;
  const router = useRouter();
  const db = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

  // Fetch Member Profile
  const customerRef = useMemoFirebase(() => (userId ? doc(db, 'users', userId) : null), [db, userId]);
  const { data: customer, isLoading } = useDoc<UserProfile>(customerRef);

  // Fetch Order History
  const ordersQuery = useMemoFirebase(() => 
    userId ? query(collection(db, 'orders'), where('userId', '==', userId), orderBy('createdAt', 'desc')) : null
  , [db, userId]);
  const { data: orders, isLoading: isOrdersLoading } = useCollection<Order>(ordersQuery);

  // Fetch Communication History (Support Tickets)
  const ticketsQuery = useMemoFirebase(() => 
    userId ? query(collection(db, 'support_tickets'), where('userId', '==', userId), orderBy('createdAt', 'desc')) : null
  , [db, userId]);
  const { data: tickets, isLoading: isTicketsLoading } = useCollection<SupportTicket>(ticketsQuery);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    taxId: '',
    segment: 'Retail',
    accountTier: 'Standard' as AccountTier,
    address: '',
    notes: '',
    role: 'Customer',
    storeCredit: 0
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: (customer as any).phone || '',
        company: (customer as any).company || '',
        taxId: (customer as any).taxId || '',
        segment: (customer as any).segment || 'Retail',
        accountTier: customer.accountTier || 'Standard',
        address: (customer as any).address || '',
        notes: (customer as any).notes || '',
        role: customer.role || 'Customer',
        storeCredit: customer.storeCredit || 0
      });
    }
  }, [customer]);

  // Calculations
  const lifetimeSpend = useMemo(() => {
    if (!orders) return 0;
    return orders
      .filter(o => !['Cancelled', 'Refunded', 'Draft'].includes(o.status))
      .reduce((acc, o) => acc + (o.pricing?.total || 0), 0);
  }, [orders]);

  const handleSave = () => {
    if (!formData.name || !formData.email || !customerRef) {
      toast({ title: "Required Fields", description: "Name and Email are mandatory.", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    const updatedData = {
      ...formData,
      updatedAt: new Date().toISOString()
    };

    updateDocumentNonBlocking(customerRef, updatedData);
    
    toast({ title: "Profile Updated", description: "Customer records have been synchronized." });
    
    setTimeout(() => {
      setIsSaving(false);
    }, 500);
  };

  const handleAdjustCredit = (amount: number) => {
    if (!customerRef) return;
    const newTotal = (formData.storeCredit || 0) + amount;
    setFormData(prev => ({ ...prev, storeCredit: newTotal }));
    updateDocumentNonBlocking(customerRef, { storeCredit: newTotal, updatedAt: new Date().toISOString() });
    toast({ title: "Credit Adjusted", description: `Registry updated to $${newTotal.toFixed(2)}` });
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold">Customer profile not found</h2>
        <Button variant="link" onClick={() => router.push('/admin/customers')}>Return to Directory</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-6">
        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-muted/50 border hover:bg-primary hover:text-white transition-all" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic text-foreground">
            Manage <span className="text-primary">Member</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] mt-1">Registry Profile: {customer.email}</p>
        </div>
      </div>

      {/* High-Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-2 rounded-3xl overflow-hidden shadow-sm bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Lifetime Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-foreground">${lifetimeSpend.toFixed(2)}</div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">From {orders?.length || 0} Projects</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-3xl overflow-hidden shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Society Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-emerald-600">${(formData.storeCredit || 0).toFixed(2)}</div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Available Registry Balance</p>
          </CardContent>
        </Card>
        <Card className="border-2 rounded-3xl overflow-hidden shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-headline italic tracking-tighter text-foreground">{tickets?.length || 0}</div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Active Support Threads</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl bg-muted/20 p-1 rounded-2xl h-auto">
          <TabsTrigger value="profile" className="rounded-xl py-3 font-black uppercase tracking-widest text-[10px]">Profile Registry</TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl py-3 font-black uppercase tracking-widest text-[10px]">Order History</TabsTrigger>
          <TabsTrigger value="communication" className="rounded-xl py-3 font-black uppercase tracking-widest text-[10px]">Support Threads</TabsTrigger>
          <TabsTrigger value="wallet" className="rounded-xl py-3 font-black uppercase tracking-widest text-[10px]">Member Wallet</TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile" className="space-y-8 mt-8 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-8">
              <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
                <CardHeader className="bg-muted/30 border-b py-6 px-8">
                  <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" /> Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 grid gap-6 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Full Display Name</Label>
                    <Input 
                      placeholder="e.g. John Doe" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="h-12 rounded-xl bg-muted/5 border-2 font-bold"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-40">Registry Email (Locked)</Label>
                    <Input 
                      type="email"
                      value={formData.email}
                      disabled
                      className="h-12 rounded-xl bg-muted/50 border-2 border-dashed"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Phone Number</Label>
                    <Input 
                      placeholder="+1 (555) 000-0000" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="h-12 rounded-xl bg-muted/5 border-2"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Account Role</Label>
                    <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-muted/5 border-2 font-bold uppercase text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Customer">Standard Customer</SelectItem>
                        <SelectItem value="Reseller">Approved Reseller</SelectItem>
                        <SelectItem value="Support">Support Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-4 border-primary/20 bg-primary/5 rounded-[2.5rem] overflow-hidden shadow-lg">
                <CardHeader className="p-8">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black uppercase italic tracking-tight text-foreground">Loyalty Status Override</CardTitle>
                      <CardDescription className="text-xs font-bold uppercase tracking-widest text-primary/70">Manual promotion or restriction of member tier</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-6">
                  <div className="grid gap-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Active Registry Tier</Label>
                    <Select value={formData.accountTier} onValueChange={v => setFormData({...formData, accountTier: v as AccountTier})}>
                      <SelectTrigger className="h-14 rounded-2xl bg-background border-2 font-black uppercase tracking-widest text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {ACCOUNT_TIERS.map(tier => (
                          <SelectItem key={tier} value={tier} className="font-bold uppercase text-xs">
                            {tier === 'Standard' ? 'Standard Member' : `${tier} Status Active`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
                <CardHeader className="bg-muted/30 border-b py-6 px-8">
                  <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" /> Business & Billing
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Company Name</Label>
                      <Input 
                        placeholder="Sticker Co. LLC" 
                        value={formData.company}
                        onChange={e => setFormData({...formData, company: e.target.value})}
                        className="h-12 rounded-xl bg-muted/5 border-2"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Tax / Resale ID</Label>
                      <Input 
                        placeholder="EIN or Local Reg #" 
                        value={formData.taxId}
                        onChange={e => setFormData({...formData, taxId: e.target.value})}
                        className="h-12 rounded-xl bg-muted/5 border-2"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Default Logistics Address</Label>
                    <Textarea 
                      placeholder="Street, City, State, ZIP" 
                      rows={3}
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="rounded-xl bg-muted/5 border-2 p-4 resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-xl bg-foreground text-background">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Workstation Control</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="opacity-60">Profile ID</span>
                      <span className="font-mono text-primary">{customer.id.slice(0, 12)}...</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="opacity-60">Member Since</span>
                      <span>{new Date(customer.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Internal Staff Notes</Label>
                    <Textarea 
                      placeholder="Notes on preferences or history..." 
                      className="min-h-[150px] rounded-xl bg-white/5 border-white/10 text-white p-4 text-xs resize-none"
                      value={formData.notes}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>

                  <Button className="w-full h-16 text-lg font-black uppercase tracking-widest rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-lg" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Publish Changes —
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 rounded-[2rem] bg-primary/5 border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest">Lifecycle Segment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={formData.segment} onValueChange={v => setFormData({...formData, segment: v})}>
                    <SelectTrigger className="h-12 rounded-xl bg-background border-2 font-bold uppercase text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {CUSTOMER_SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="p-4 bg-background rounded-2xl border-2 border-dashed flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">
                      Registry Synced
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ORDER HISTORY TAB */}
        <TabsContent value="history" className="mt-8 animate-in fade-in slide-in-from-bottom-2">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 border-b py-6 px-10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight">Order Registry</CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-widest">Recent custom print projects associated with this member.</CardDescription>
              </div>
              <Badge variant="outline" className="h-8 px-4 font-black uppercase text-[10px] tracking-widest">
                {orders?.length || 0} TOTAL
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {isOrdersLoading ? (
                <div className="p-20 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                </div>
              ) : orders && orders.length > 0 ? (
                <div className="divide-y-2">
                  {orders.map((order) => (
                    <div key={order.id} className="p-8 flex items-center justify-between group hover:bg-muted/10 transition-colors">
                      <div className="flex items-center gap-6">
                        <div className="h-12 w-12 rounded-2xl bg-muted/30 border-2 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-all">
                          <Package className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black font-mono">#{order.id.slice(0, 8)}</span>
                            <Badge variant="secondary" className="text-[8px] font-black uppercase h-4 px-1.5">{order.status}</Badge>
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-lg font-black font-headline italic tracking-tighter">${order.pricing?.total?.toFixed(2)}</p>
                          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em]">Transaction</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" asChild>
                          <Link href={`/admin/orders/${order.id}`}>
                            <ChevronRight className="h-5 w-5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-24 text-center space-y-4 opacity-30">
                  <Package className="h-12 w-12 mx-auto" />
                  <p className="text-sm font-black uppercase tracking-widest italic">No project history found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMMUNICATION TAB */}
        <TabsContent value="communication" className="mt-8 animate-in fade-in slide-in-from-bottom-2">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 border-b py-6 px-10 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight">Support Threads</CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-widest">Resolution history and active inquiries.</CardDescription>
              </div>
              <Badge variant="outline" className="h-8 px-4 font-black uppercase text-[10px] tracking-widest">
                {tickets?.length || 0} TOTAL
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {isTicketsLoading ? (
                <div className="p-20 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                </div>
              ) : tickets && tickets.length > 0 ? (
                <div className="divide-y-2">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="p-8 flex items-center justify-between group hover:bg-muted/10 transition-colors">
                      <div className="flex items-center gap-6">
                        <div className="h-12 w-12 rounded-2xl bg-muted/30 border-2 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-all">
                          <MessageSquare className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black uppercase tracking-tight">{ticket.subject || 'No Subject'}</span>
                            <Badge className="text-[8px] font-black uppercase h-4 px-1.5">{ticket.status}</Badge>
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(ticket.createdAt).toLocaleDateString()} • {ticket.category}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" asChild>
                        <Link href={`/admin/support/${ticket.id}`}>
                          <ChevronRight className="h-5 w-5" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-24 text-center space-y-4 opacity-30">
                  <MessageSquare className="h-12 w-12 mx-auto" />
                  <p className="text-sm font-black uppercase tracking-widest italic">No support threads found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WALLET TAB */}
        <TabsContent value="wallet" className="mt-8 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
              <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20 py-6 px-10">
                <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-emerald-700">
                  <DollarSign className="h-5 w-5" /> Society Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 text-center space-y-8">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Current Available Credit</p>
                  <div className="text-7xl font-black font-headline italic tracking-tighter text-emerald-600">
                    ${(formData.storeCredit || 0).toFixed(2)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-16 rounded-2xl border-2 font-black uppercase tracking-widest text-xs hover:bg-emerald-50" onClick={() => handleAdjustCredit(10)}>
                    <Plus className="mr-2 h-4 w-4" /> Add $10.00
                  </Button>
                  <Button variant="outline" className="h-16 rounded-2xl border-2 font-black uppercase tracking-widest text-xs hover:bg-emerald-50" onClick={() => handleAdjustCredit(50)}>
                    <Plus className="mr-2 h-4 w-4" /> Add $50.00
                  </Button>
                </div>
                <div className="grid gap-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Manual Registry Adjustment</Label>
                  <div className="flex gap-2">
                    <Input id="custom-credit" type="number" placeholder="0.00" className="h-12 rounded-xl bg-muted/5 border-2 text-lg font-bold" />
                    <Button className="h-12 rounded-xl px-6 font-black uppercase tracking-widest text-[10px]" onClick={() => {
                      const input = document.getElementById('custom-credit') as HTMLInputElement;
                      const val = parseFloat(input.value);
                      if (!isNaN(val)) handleAdjustCredit(val);
                      input.value = '';
                    }}>Apply Adjust —</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-8">
              <Card className="border-2 rounded-[2.5rem] bg-muted/5 border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <History className="h-4 w-4" /> Credit Audit Note
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 bg-amber-50 rounded-2xl border-2 border-amber-100 space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-amber-900 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> Compliance Note
                    </h4>
                    <p className="text-[10px] text-amber-700 leading-relaxed font-medium uppercase tracking-tighter">
                      Store credit adjustments are permanent registry entries. All financial modifications are logged in the 
                      Society Journal under staff ID clearance. Ensure verification before applying high-value adjustments.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest px-2">
                      <span className="text-muted-foreground">Last Wallet Sync</span>
                      <span>{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest px-2">
                      <span className="text-muted-foreground">Registry Status</span>
                      <span className="text-emerald-600">Authorized</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
