
'use client';

import React, { useState } from 'react';
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
  Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { AccountTier } from '@/lib/types';

const CUSTOMER_SEGMENTS = ['Retail', 'Wholesale', 'Non-Profit', 'VIP', 'Agency', 'Internal'];
const ACCOUNT_TIERS: AccountTier[] = ['Standard', 'Gold', 'Platinum', 'Elite'];

export default function NewCustomerPage() {
  const router = useRouter();
  const db = useFirestore();
  const [isLoading, setIsLoading] = useState(false);

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
    role: 'Customer'
  });

  const handleSave = () => {
    if (!formData.name || !formData.email) {
      toast({ title: "Required Fields", description: "Name and Email are mandatory.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    const customerData = {
      ...formData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isManualAdded: true
    };

    addDocumentNonBlocking(collection(db, 'users'), customerData)
      .then(() => {
        toast({ title: "Customer Created", description: "Profile has been added to the database." });
        router.push('/admin/customers');
      })
      .catch(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-6">
        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-muted/50 border hover:bg-primary hover:text-white transition-all" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic text-foreground">
            New <span className="text-primary">Member</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] mt-1">Manual Registry Entry</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-8">
          {/* Primary Identity */}
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
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Return Email</Label>
                <Input 
                  type="email"
                  placeholder="john@example.com" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="h-12 rounded-xl bg-muted/5 border-2 font-bold"
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
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Initial Role</Label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/5 border-2 font-bold uppercase text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Customer">Standard Customer</SelectItem>
                    <SelectItem value="Reseller">Approved Reseller</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Account Tier */}
          <Card className="border-4 border-primary/20 bg-primary/5 rounded-[2.5rem] overflow-hidden shadow-lg">
            <CardHeader className="p-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black uppercase italic tracking-tight text-foreground">Initial Loyalty Tier</CardTitle>
                  <CardDescription className="text-xs font-bold uppercase tracking-widest text-primary/70">Set the starting status for this member</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-6">
              <div className="grid gap-3">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Registry Tier</Label>
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

          {/* Business Context */}
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
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Shipping Address</Label>
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
              <CardTitle className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Registry Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Internal Staff Notes</Label>
                <Textarea 
                  placeholder="Notes on preferences..." 
                  className="min-h-[150px] rounded-xl bg-white/5 border-white/10 text-white p-4 text-xs resize-none"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <Button className="w-full h-16 text-lg font-black uppercase tracking-widest rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-lg" onClick={handleSave} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                Create Profile —
              </Button>
              <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-[10px] leading-tight text-white/60 font-medium">
                  Manually adding a customer creates a registry entry. The client will need to sign up with this email to link their session to this profile.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 rounded-[2rem] bg-primary/5 border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest">Segmentation</CardTitle>
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
              <div className="p-4 bg-background rounded-2xl border-2 border-dashed text-center">
                <p className="text-[9px] text-muted-foreground font-black uppercase mb-1">Projected Pricing</p>
                <p className="text-xs font-bold uppercase">{formData.segment === 'Wholesale' ? 'Wholesale Pricing Applied' : 'Standard Retail'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
