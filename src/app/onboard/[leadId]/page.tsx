'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowRight, 
  ChevronRight, 
  CheckCircle2, 
  Loader2, 
  Building2, 
  Mail, 
  Lock, 
  MapPin, 
  CloudUpload, 
  CreditCard, 
  ShieldCheck, 
  History, 
  ChevronLeft,
  X,
  FileCheck,
  Zap,
  Box,
  Info,
  Check,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useDoc, useMemoFirebase, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, arrayUnion } from 'firebase/firestore';
import { PartnerLead } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const LOGO_URL = "https://res.cloudinary.com/dabgothkm/image/upload/v1772217426/arlington-teheran-WL-oIapq6TY-unsplash_dps0i1.png";

export default function PartnerOnboardingWizard(props: { params: Promise<{ leadId: string }> }) {
  const params = React.use(props.params);
  const leadId = params.leadId;
  const router = useRouter();
  const db = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    businessName: '',
    physicalAddress: '',
    storeAddress: '',
    logoUrl: '',
    isMigration: false,
    migrationSource: 'Shopify',
    csvUploaded: false,
    ccName: '',
    ccNumber: '',
    ccExpiry: '',
    ccCvc: ''
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const leadRef = useMemoFirebase(() => (leadId ? doc(db, 'partner_leads', leadId) : null), [db, leadId]);
  const { data: lead, isLoading: isLeadLoading } = useDoc<PartnerLead>(leadRef);

  useEffect(() => {
    if (lead) {
      setFormData(prev => ({
        ...prev,
        email: lead.email,
        businessName: lead.businessName
      }));
    }
  }, [lead]);

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'csvUploaded') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          if (field === 'logoUrl') setFormData(prev => ({ ...prev, logoUrl: 'https://picsum.photos/seed/logo/200/200' }));
          if (field === 'csvUploaded') setFormData(prev => ({ ...prev, csvUploaded: true }));
          return 100;
        }
        return prev + 15;
      });
    }, 100);
    
    setTimeout(() => setUploadProgress(0), 1500);
  };

  const handleFinalize = async () => {
    if (!leadRef) return;
    setIsSubmitting(true);

    const now = new Date().toISOString();
    const updates = {
      'onboarding.status': 'Completed',
      'onboarding.migrationSource': formData.isMigration ? formData.migrationSource : 'New',
      'onboarding.paymentToken': 'tok_simulated_' + Math.random().toString(36).substr(2, 12),
      'onboarding.lastFour': formData.ccNumber.slice(-4),
      'onboarding.isTrialActive': false, // Admin triggers this
      updatedAt: now,
      activityLog: arrayUnion({
        action: 'Onboarding Finalized',
        staffName: 'Partner (Self-Service)',
        timestamp: now,
        details: `Partner completed full build specification and vaulted payment method (**** ${formData.ccNumber.slice(-4)}).`
      })
    };

    try {
      updateDocumentNonBlocking(leadRef, updates);
      setIsSuccess(true);
      toast({ title: "Build Specification Locked", description: "Your society infrastructure build is now queued." });
    } catch (e) {
      // Error handled by global emitter
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted || isLeadLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-muted/5">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">Retrieving Registry Key...</p>
    </div>
  );

  if (!lead) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-background">
      <X className="h-16 w-16 text-destructive mb-6" />
      <h1 className="text-3xl font-black uppercase italic tracking-tighter">Link Expired</h1>
      <p className="text-muted-foreground mt-2 max-w-sm">This onboarding registry entry is invalid or has already been finalized.</p>
      <Button variant="outline" className="mt-8 rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs" asChild><Link href="/">Return to Site</Link></Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/5 font-body flex flex-col items-center">
      <header className="w-full h-24 flex items-center justify-between px-8 md:px-16 max-w-7xl">
        <Image src={LOGO_URL} alt="Print Society" width={180} height={45} className="h-10 w-auto object-contain" unoptimized />
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary bg-primary/5 h-6 px-3">{lead.onboarding?.tier || 'Pro Tier'}</Badge>
          <div className="hidden sm:flex gap-1">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={cn("h-1.5 rounded-full transition-all duration-500", step >= i ? "w-8 bg-primary" : "w-1.5 bg-muted")} />
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl px-6 py-12 md:py-20 flex items-center justify-center">
        {isSuccess ? (
          <Card className="border-4 border-emerald-500/20 bg-card rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 max-w-2xl text-center">
            <CardContent className="p-16 space-y-8">
              <div className="h-24 w-24 rounded-[2.5rem] bg-emerald-500/10 border-4 border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <div className="space-y-3">
                <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter uppercase italic leading-none text-foreground">Infrastructure <br/><span className="text-emerald-500">Authorized</span></h2>
                <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs max-w-xs mx-auto leading-relaxed">
                  Your build specifications have been synchronized with the Lab. A technician will initiate the 3-day activation window shortly.
                </p>
              </div>
              <Separator className="bg-emerald-500/10" />
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="p-4 bg-muted/5 rounded-2xl border-2 space-y-1">
                  <p className="text-[8px] font-black uppercase text-muted-foreground">Auth Token</p>
                  <p className="text-[10px] font-mono font-bold truncate">PROC_VAULT_{lead.id.slice(0, 12)}</p>
                </div>
                <div className="p-4 bg-muted/5 rounded-2xl border-2 space-y-1">
                  <p className="text-[8px] font-black uppercase text-muted-foreground">Build Timeline</p>
                  <p className="text-[10px] font-bold uppercase">{lead.onboarding?.tier === 'Tier A' ? '72 Hours (Express)' : '2 Weeks (Standard)'}</p>
                </div>
              </div>
              <Button className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-xs bg-foreground text-background hover:bg-primary transition-all" asChild><Link href="/">Return to Site —</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* STEP 1: ACCOUNT SETUP */}
            {step === 1 && (
              <div className="space-y-10">
                <div className="space-y-3">
                  <h2 className="text-5xl md:text-7xl font-black font-headline tracking-tighter uppercase italic leading-[0.85] text-foreground">Account <br/><span className="text-primary">Architecture</span></h2>
                  <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Phase 01 — Let's establish your infrastructure credentials.</p>
                </div>
                <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-card">
                  <CardContent className="p-10 space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60 text-foreground">Build Registry Email</Label>
                        <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="h-14 rounded-2xl bg-muted/5 border-2 text-lg font-bold" placeholder="alex@neonstickers.com" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60 text-foreground">Store Password</Label>
                        <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="h-14 rounded-2xl bg-muted/5 border-2 text-lg font-bold" placeholder="••••••••" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60 text-foreground">Corporate Business Name</Label>
                      <Input value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} className="h-14 rounded-2xl bg-muted/5 border-2 text-lg font-bold" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60 text-foreground">HQ Physical Address</Label>
                        <Input value={formData.physicalAddress} onChange={e => setFormData({...formData, physicalAddress: e.target.value})} className="h-14 rounded-2xl bg-muted/5 border-2" placeholder="Street, City, State, ZIP" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60 text-foreground">Public Store URL (Draft)</Label>
                        <Input value={formData.storeAddress} onChange={e => setFormData({...formData, storeAddress: e.target.value})} className="h-14 rounded-2xl bg-muted/5 border-2 font-mono" placeholder="store.printsociety.co/..." />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Button className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90 shadow-2xl" onClick={handleNext}>
                  Vault Assets <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* STEP 2: ASSETS */}
            {step === 2 && (
              <div className="space-y-10">
                <div className="space-y-3">
                  <h2 className="text-5xl md:text-7xl font-black font-headline tracking-tighter uppercase italic leading-[0.85] text-foreground">Brand <br/><span className="text-primary">Assets</span></h2>
                  <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Phase 02 — Identity ingest for your portal.</p>
                </div>
                <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-card">
                  <CardContent className="p-10 space-y-10">
                    <div className="flex flex-col items-center gap-8">
                      <div 
                        className={cn(
                          "w-48 h-48 rounded-[3rem] border-4 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-muted/10",
                          formData.logoUrl ? "border-emerald-500 bg-emerald-500/5" : "border-muted"
                        )}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input type="file" ref={fileInputRef} className="hidden" onChange={e => handleFileUpload(e, 'logoUrl')} accept="image/*" />
                        {formData.logoUrl ? (
                          <div className="relative w-full h-full p-6">
                            <Image src={formData.logoUrl} alt="Logo Preview" fill className="object-contain" unoptimized />
                          </div>
                        ) : uploadProgress > 0 ? (
                          <div className="space-y-4 text-center px-6 w-full">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                            <Progress value={uploadProgress} className="h-1.5" />
                          </div>
                        ) : (
                          <div className="text-center space-y-2 opacity-40">
                            <CloudUpload className="h-10 w-10 mx-auto" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Logo File</p>
                          </div>
                        )}
                      </div>
                      <div className="text-center space-y-2">
                        <h4 className="text-xl font-black uppercase italic">Primary Identity Mark</h4>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">SVG or High-Res PNG recommended.</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-center gap-4">
                      <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest opacity-40" onClick={handleNext}>Skip / Upload Later —</Button>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2" onClick={handleBack}>Back</Button>
                  <Button className="flex-[2] h-16 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary shadow-xl" onClick={handleNext}>Migration Details <ChevronRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            )}

            {/* STEP 3: MIGRATION */}
            {step === 3 && (
              <div className="space-y-10">
                <div className="space-y-3">
                  <h2 className="text-5xl md:text-7xl font-black font-headline tracking-tighter uppercase italic leading-[0.85] text-foreground">Data <br/><span className="text-primary">Migration</span></h2>
                  <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Phase 03 — Ingesting existing product inventory.</p>
                </div>
                <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-card">
                  <CardContent className="p-10 space-y-8">
                    <div className="flex items-center justify-between p-8 bg-muted/5 border-2 rounded-[2rem] transition-all hover:border-primary/20">
                      <div className="flex items-center gap-6">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border shadow-sm">
                          <Zap className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase">Moving Existing Store?</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Toggle to activate migration protocols.</p>
                        </div>
                      </div>
                      <Switch checked={formData.isMigration} onCheckedChange={v => setFormData({...formData, isMigration: v})} />
                    </div>

                    {formData.isMigration && (
                      <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="grid gap-6">
                          <div className="grid gap-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Source Architecture</Label>
                            <Select value={formData.migrationSource} onValueChange={v => setFormData({...formData, migrationSource: v})}>
                              <SelectTrigger className="h-14 rounded-2xl bg-muted/5 border-2 font-bold"><SelectValue placeholder="Select platform..." /></SelectTrigger>
                              <SelectContent className="rounded-2xl">
                                <SelectItem value="Shopify">Shopify Registry</SelectItem>
                                <SelectItem value="BigCommerce">BigCommerce Cloud</SelectItem>
                                <SelectItem value="Ecwid">Ecwid Store</SelectItem>
                                <SelectItem value="Custom">Custom / Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="grid gap-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Product Manifest (CSV)</Label>
                            <div 
                              className={cn(
                                "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer",
                                formData.csvUploaded ? "border-emerald-500 bg-emerald-500/5" : "border-muted hover:border-primary/50"
                              )}
                              onClick={() => csvInputRef.current?.click()}
                            >
                              <input type="file" ref={csvInputRef} className="hidden" onChange={e => handleFileUpload(e, 'csvUploaded')} accept=".csv" />
                              {formData.csvUploaded ? (
                                <div className="flex items-center gap-4 text-emerald-600">
                                  <FileCheck className="h-10 w-10" />
                                  <div className="text-left">
                                    <p className="text-sm font-black uppercase italic">Manifest Registered</p>
                                    <p className="text-[9px] font-bold uppercase opacity-60">Technician will verify resolution.</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center space-y-2 opacity-40">
                                  <CloudUpload className="h-8 w-8 mx-auto" />
                                  <p className="text-[10px] font-black uppercase tracking-widest">Drop CSV Manifest</p>
                                </div>
                              )}
                            </div>
                            {!formData.csvUploaded && (
                              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                                <Info className="h-4 w-4 text-amber-600 mt-0.5" />
                                <p className="text-[9px] text-amber-700 font-bold uppercase leading-relaxed">If no manifest is uploaded, a Society Rep will reach out to facilitate the data bridge.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2" onClick={handleBack}>Back</Button>
                  <Button className="flex-[2] h-16 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary shadow-xl" onClick={handleNext}>Finalize Billing <ChevronRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            )}

            {/* STEP 4: PAYMENT */}
            {step === 4 && (
              <div className="space-y-10">
                <div className="space-y-3">
                  <h2 className="text-5xl md:text-7xl font-black font-headline tracking-tighter uppercase italic leading-[0.85] text-foreground">Secure <br/><span className="text-primary">Vault</span></h2>
                  <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Phase 04 — Authorize build fees and membership.</p>
                </div>
                <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-2xl bg-card">
                  <CardHeader className="bg-primary/5 p-10 border-b border-primary/10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <Badge className="bg-primary text-white font-black text-[9px] uppercase px-3 h-6 mb-2">{lead.onboarding?.tier || 'Premium'}</Badge>
                        <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">Infrastructure Auth</CardTitle>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black uppercase text-muted-foreground">Total Commitment</p>
                        <p className="text-3xl font-black font-headline italic text-primary">
                          {lead.onboarding?.tier === 'Tier A' ? '$800.00' : '$400.00'}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-10 space-y-10">
                    <div className="grid gap-6">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60 text-foreground">Cardholder Name</Label>
                        <Input value={formData.ccName} onChange={e => setFormData({...formData, ccName: e.target.value})} className="h-14 rounded-2xl bg-muted/5 border-2 text-lg font-bold" placeholder="EXACT NAME ON CARD" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60 text-foreground">Card Information</Label>
                        <div className="relative">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40" />
                          <Input value={formData.ccNumber} onChange={e => setFormData({...formData, ccNumber: e.target.value})} maxLength={16} className="h-14 pl-12 rounded-2xl bg-muted/5 border-2 font-mono" placeholder="4242 4242 4242 4242" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60 text-foreground">Expiration</Label>
                          <Input value={formData.ccExpiry} onChange={e => setFormData({...formData, ccExpiry: e.target.value})} className="h-14 rounded-2xl bg-muted/5 border-2 font-mono" placeholder="MM/YY" />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60 text-foreground">Security Key</Label>
                          <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40" />
                            <Input value={formData.ccCvc} onChange={e => setFormData({...formData, ccCvc: e.target.value})} maxLength={4} className="h-14 pl-12 rounded-2xl bg-muted/5 border-2 font-mono" placeholder="CVC" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Compliance Protocols</h4>
                      <div className="space-y-4">
                        <div className="flex items-start gap-4 p-5 bg-muted/5 rounded-[1.5rem] border-2">
                          <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                          <p className="text-[10px] font-medium leading-relaxed uppercase opacity-70">I authorize Print Society Co. to vault this payment method for the build fee and future monthly membership charges.</p>
                        </div>
                        <div className="flex items-start gap-4 p-5 bg-muted/5 rounded-[1.5rem] border-2">
                          <Clock className="h-5 w-5 text-primary shrink-0" />
                          <p className="text-[10px] font-medium leading-relaxed uppercase opacity-70">I understand that membership must be canceled at least 30 days prior to the next billing cycle to avoid automated charges.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-10 bg-muted/30 border-t">
                    <Button 
                      className="w-full h-20 rounded-[2rem] font-black uppercase tracking-widest text-sm bg-primary hover:bg-primary/90 shadow-2xl transition-all active:scale-[0.98]" 
                      onClick={handleFinalize}
                      disabled={isSubmitting || !formData.ccNumber || !formData.ccName}
                    >
                      {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <>Finalize Infrastructure Build —</>}
                    </Button>
                  </CardFooter>
                </Card>
                <div className="flex justify-center">
                  <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest opacity-40" onClick={handleBack}>Back to Migration —</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="w-full py-12 border-t bg-muted/5 text-center space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40">PROC_BUILD_VAULT — SOCIETY INFRASTRUCTURE</p>
        <div className="flex justify-center gap-8 opacity-40">
          <Link href="/legal/terms" className="text-[9px] font-black uppercase tracking-widest hover:text-primary">Terms</Link>
          <Link href="/legal/privacy" className="text-[9px] font-black uppercase tracking-widest hover:text-primary">Vault Protocol</Link>
        </div>
      </footer>
    </div>
  );
}
