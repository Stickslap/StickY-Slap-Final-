
'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Smartphone, 
  MapPin, 
  Building2, 
  ShieldCheck, 
  Save, 
  Loader2, 
  CheckCircle2,
  Globe,
  Settings2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function AccountSettingsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

  // Fetch complete profile from Firestore
  const profileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: profile, isLoading } = useDoc<UserProfile>(profileRef);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    companyName: '',
    shippingAddress: { street: '', city: '', state: '', zip: '' },
    billingAddress: { street: '', city: '', state: '', zip: '' },
    isPrintShop: false,
    shopName: '',
    shopSpecialty: '',
    monthlyVolume: ''
  });

  // Sync local form state with fetched Firestore data
  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        companyName: profile.companyName || '',
        shippingAddress: profile.shippingAddress || { street: '', city: '', state: '', zip: '' },
        billingAddress: (profile as any).billingAddress || { street: '', city: '', state: '', zip: '' },
        isPrintShop: profile.isPrintShop || false,
        shopName: (profile as any).printShopDetails?.businessName || '',
        shopSpecialty: (profile as any).printShopDetails?.specialty || '',
        monthlyVolume: (profile as any).printShopDetails?.monthlyVolume || ''
      });
    }
  }, [profile]);

  const handleSave = () => {
    if (!profileRef || !user) return;
    setIsSaving(true);

    const updates = {
      ...formData,
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      printShopDetails: formData.isPrintShop ? {
        businessName: formData.shopName,
        specialty: formData.shopSpecialty,
        monthlyVolume: formData.monthlyVolume
      } : null,
      updatedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(profileRef, updates, { merge: true });
    
    toast({ 
      title: "Profile Updated", 
      description: "Your society settings have been synchronized." 
    });
    
    setTimeout(() => setIsSaving(false), 600);
  };

  if (isLoading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Retrieving Society Profile...</p>
    </div>
  );

  const fallback = (val: string | undefined) => val || "Not provided";

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter uppercase italic leading-none text-foreground">
            Society <span className="text-primary">Settings</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Your professional identity and logistics profile</p>
        </div>
        <div className="flex gap-3">
          <Button 
            className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            Save Profile —
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-8">
          <Tabs defaultValue="identity" className="w-full">
            <TabsList className="grid grid-cols-3 w-full max-w-md h-auto bg-muted/20 p-1 rounded-2xl mb-8">
              <TabsTrigger value="identity" className="rounded-xl py-2 font-bold uppercase tracking-widest text-[10px]">Identity</TabsTrigger>
              <TabsTrigger value="logistics" className="rounded-xl py-2 font-bold uppercase tracking-widest text-[10px]">Logistics</TabsTrigger>
              <TabsTrigger value="business" className={cn("rounded-xl py-2 font-bold uppercase tracking-widest text-[10px]", !formData.isPrintShop && "opacity-50")}>Business</TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="space-y-8 m-0">
              <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
                <CardHeader className="bg-muted/30 border-b py-6 px-8">
                  <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" /> Profile Identity
                  </CardTitle>
                  <CardDescription className="text-xs font-medium">Your primary identification within the Society registry.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">First Name</Label>
                      <Input 
                        value={formData.firstName} 
                        onChange={e => setFormData({...formData, firstName: e.target.value})}
                        className="h-12 rounded-xl bg-muted/5 border-2"
                        placeholder="e.g. John"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Last Name</Label>
                      <Input 
                        value={formData.lastName} 
                        onChange={e => setFormData({...formData, lastName: e.target.value})}
                        className="h-12 rounded-xl bg-muted/5 border-2"
                        placeholder="e.g. Doe"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Verified Email</Label>
                      <Input 
                        value={user?.email || ''} 
                        disabled
                        className="h-12 rounded-xl bg-muted/50 border-2 border-dashed"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Contact Phone</Label>
                      <Input 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="h-12 rounded-xl bg-muted/5 border-2"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logistics" className="space-y-8 m-0">
              <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
                <CardHeader className="bg-muted/30 border-b py-6 px-8">
                  <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" /> Logistics Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary">Default Shipping Address</h4>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Street Address</Label>
                      <Input 
                        value={formData.shippingAddress.street} 
                        onChange={e => setFormData({...formData, shippingAddress: {...formData.shippingAddress, street: e.target.value}})}
                        className="h-12 rounded-xl bg-muted/5 border-2"
                        placeholder="Street, Studio #"
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">City</Label>
                        <Input 
                          value={formData.shippingAddress.city} 
                          onChange={e => setFormData({...formData, shippingAddress: {...formData.shippingAddress, city: e.target.value}})}
                          className="h-12 rounded-xl bg-muted/5 border-2"
                          placeholder="City"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">State</Label>
                        <Input 
                          value={formData.shippingAddress.state} 
                          onChange={e => setFormData({...formData, shippingAddress: {...formData.shippingAddress, state: e.target.value}})}
                          className="h-12 rounded-xl bg-muted/5 border-2"
                          placeholder="State"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Zip Code</Label>
                        <Input 
                          value={formData.shippingAddress.zip} 
                          onChange={e => setFormData({...formData, shippingAddress: {...formData.shippingAddress, zip: e.target.value}})}
                          className="h-12 rounded-xl bg-muted/5 border-2"
                          placeholder="Zip"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary">Default Billing Address</h4>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Street Address</Label>
                      <Input 
                        value={formData.billingAddress.street} 
                        onChange={e => setFormData({...formData, billingAddress: {...formData.billingAddress, street: e.target.value}})}
                        className="h-12 rounded-xl bg-muted/5 border-2"
                        placeholder="Street Address"
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">City</Label>
                        <Input 
                          value={formData.billingAddress.city} 
                          onChange={e => setFormData({...formData, billingAddress: {...formData.billingAddress, city: e.target.value}})}
                          className="h-12 rounded-xl bg-muted/5 border-2"
                          placeholder="City"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">State</Label>
                        <Input 
                          value={formData.billingAddress.state} 
                          onChange={e => setFormData({...formData, billingAddress: {...formData.billingAddress, state: e.target.value}})}
                          className="h-12 rounded-xl bg-muted/5 border-2"
                          placeholder="State"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Zip Code</Label>
                        <Input 
                          value={formData.billingAddress.zip} 
                          onChange={e => setFormData({...formData, billingAddress: {...formData.billingAddress, zip: e.target.value}})}
                          className="h-12 rounded-xl bg-muted/5 border-2"
                          placeholder="Zip"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="business" className="space-y-8 m-0">
              <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
                <CardHeader className="bg-muted/30 border-b py-6 px-8">
                  <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" /> Professional Print Shop Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid gap-6">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Commercial Business Name</Label>
                      <Input 
                        value={formData.shopName} 
                        onChange={e => setFormData({...formData, shopName: e.target.value})}
                        className="h-12 rounded-xl bg-muted/5 border-2"
                        placeholder="Company Name"
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Primary Specialty</Label>
                        <Input 
                          value={formData.shopSpecialty} 
                          onChange={e => setFormData({...formData, shopSpecialty: e.target.value})}
                          className="h-12 rounded-xl bg-muted/5 border-2"
                          placeholder="e.g. Stickers & Decals"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Estimated Monthly Volume</Label>
                        <Select value={formData.monthlyVolume} onValueChange={v => setFormData({...formData, monthlyVolume: v})}>
                          <SelectTrigger className="h-12 rounded-xl bg-muted/5 border-2">
                            <SelectValue placeholder="Select volume..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0-500">$0 - $500</SelectItem>
                            <SelectItem value="500-2500">$500 - $2,500</SelectItem>
                            <SelectItem value="2500-10000">$2,500 - $10,000</SelectItem>
                            <SelectItem value="10000+">$10,000+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="border-2 rounded-[2.5rem] bg-foreground text-background overflow-hidden shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Registry Insight</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="opacity-60">Member Joined</span>
                  <span>{new Date(profile?.createdAt || '').toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="opacity-60">Last Sync</span>
                  <span>{profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : 'Original'}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="opacity-60">Society UID</span>
                  <span className="font-mono text-primary">{user?.uid.slice(0, 12)}...</span>
                </div>
              </div>
              <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Registry Clearance Active</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
