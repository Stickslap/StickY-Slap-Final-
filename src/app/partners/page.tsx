
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  Zap, 
  Globe, 
  Layers,
  ArrowUpRight,
  Calendar as CalendarIcon,
  Clock,
  Info,
  CalendarDays,
  Sparkles,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const LOGO_URL = "https://res.cloudinary.com/dabgothkm/image/upload/v1772217426/arlington-teheran-WL-oIapq6TY-unsplash_dps0i1.png";
const VIDEO_PLACEHOLDER = "https://firebasestorage.googleapis.com/v0/b/printssociety.appspot.com/o/assets%2Fpartner-onboarding-bg.mp4?alt=media&token=placeholder";

const TIME_SLOTS = [
  "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", 
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"
];

export default function PartnerOnboardingPage() {
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    websiteUrl: '',
    websiteTraffic: '',
    annualRevenue: '',
    currentPlatform: '',
    printingField: '',
    customBuildBudget: '',
    appointmentDate: undefined as Date | undefined,
    appointmentTime: '10:00 AM',
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.businessName || !formData.email) {
      toast({ title: "Validation Error", description: "Identity and contact details are required.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      let finalDate = null;
      if (formData.appointmentDate) {
        finalDate = new Date(formData.appointmentDate);
        const [time, modifier] = formData.appointmentTime.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        finalDate.setHours(hours, minutes, 0, 0);
      }

      const now = new Date().toISOString();
      const payload = {
        ...formData,
        appointmentDate: finalDate ? finalDate.toISOString() : null,
        status: 'New',
        activityLog: [{
          action: 'Intake Received',
          staffName: 'System',
          timestamp: now,
          details: 'Initial partner lead application submitted via web portal.'
        }],
        createdAt: now
      };

      await addDocumentNonBlocking(collection(db, 'partner_leads'), payload);
      setIsSuccess(true);
      toast({ title: "Intake Complete", description: "Your business profile has been ingested into the Society vault." });
    } catch (e) {
      // Handled by global emitter
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-dvh w-full flex flex-col lg:flex-row bg-background font-body overflow-hidden">
      
      {/* Left: Background Media (Desktop Only) */}
      <div className="hidden lg:block lg:w-1/2 relative bg-black">
        <div className="absolute inset-0 z-0">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="h-full w-full object-cover opacity-60 grayscale"
          >
            <source src={VIDEO_PLACEHOLDER} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
        </div>
        
        <div className="relative z-10 h-full flex flex-col justify-between p-16">
          <div className="space-y-6 max-w-lg">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.3em] backdrop-blur-xl">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Society Infrastructure
            </div>
            <h1 className="text-6xl xl:text-8xl font-black font-headline tracking-tighter uppercase italic text-white leading-[0.85]">
              The All-In-One <br /><span className="text-primary">Print Engine.</span>
            </h1>
            <p className="text-xl text-white/60 font-medium leading-relaxed italic">
              Stop paying for 10 apps. Build your own high-performance print shop on Print Society's unified infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-full animate-in slide-in-from-left duration-1000" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Unified Logistics</p>
            </div>
            <div className="space-y-2">
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[85%]" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Automated Pre-Press</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Intake Module */}
      <div className="flex-1 flex flex-col relative bg-muted/5 overflow-y-auto">
        <header className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-20">
          <Link href="/">
            <Image src={LOGO_URL} alt="Print Society" width={140} height={35} className="h-8 w-auto object-contain" unoptimized />
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex gap-1.5">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={cn("h-1.5 rounded-full transition-all duration-500", step === i ? "w-8 bg-primary" : "w-1.5 bg-muted")} />
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-24 relative z-10 pt-24">
          <Card className="w-full max-w-2xl border-none shadow-none bg-transparent">
            <CardContent className="p-0">
              {isSuccess ? (
                <div className="text-center space-y-8 animate-in zoom-in-95 duration-500">
                  <div className="h-24 w-24 rounded-[2.5rem] bg-emerald-500/10 border-4 border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500">
                    <CheckCircle2 className="h-12 w-12" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic leading-none">Intake <span className="text-emerald-500">Synchronized</span></h2>
                    <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs max-w-xs mx-auto leading-relaxed">
                      Your business profile has been ingested into our partner registry. A specialist will review your specs before our call.
                    </p>
                  </div>
                  <Button className="h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-xs bg-foreground text-background hover:bg-primary transition-all shadow-xl" asChild>
                    <Link href="/">Return to Entrance —</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  {/* STEP 1: IDENTITY */}
                  {step === 1 && (
                    <div className="space-y-10">
                      <div className="space-y-2">
                        <h2 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase italic leading-[0.85]">Strategic <br/><span className="text-primary">Identity</span></h2>
                        <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Step 01 — Let's establish your base registry.</p>
                      </div>
                      <div className="grid gap-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">First Name</Label>
                            <Input placeholder="Alex" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="h-14 rounded-2xl bg-muted/5 border-2 text-lg font-bold" />
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Last Name</Label>
                            <Input placeholder="Printsmith" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="h-14 rounded-2xl bg-muted/5 border-2 text-lg font-bold" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Contact Email</Label>
                            <Input type="email" placeholder="alex@business.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="h-14 rounded-2xl bg-muted/5 border-2 text-lg font-bold" />
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">US Phone Number</Label>
                            <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" />
                              <Input placeholder="(555) 000-0000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-14 pl-12 rounded-2xl bg-muted/5 border-2 text-lg font-bold" />
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Commercial Business Name</Label>
                          <Input placeholder="e.g. Neon Graphics LLC" value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} className="h-14 rounded-2xl bg-muted/5 border-2 text-lg font-bold" />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Current Web URL</Label>
                          <Input placeholder="https://..." value={formData.websiteUrl} onChange={e => setFormData({...formData, websiteUrl: e.target.value})} className="h-14 rounded-2xl bg-muted/5 border-2 font-mono text-sm" />
                        </div>
                      </div>
                      <Button className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90 shadow-2xl" onClick={handleNext}>
                        Continue Architecture <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* STEP 2: METRICS */}
                  {step === 2 && (
                    <div className="space-y-10">
                      <div className="space-y-2">
                        <h2 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase italic leading-[0.85]">Performance <br/><span className="text-primary">Metrics</span></h2>
                        <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Step 02 — Sizing your infrastructure needs.</p>
                      </div>
                      <div className="grid gap-6">
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Monthly Traffic</Label>
                          <Select value={formData.websiteTraffic} onValueChange={v => setFormData({...formData, websiteTraffic: v})}>
                            <SelectTrigger className="h-14 rounded-2xl bg-muted/5 border-2 font-bold"><SelectValue placeholder="Select volume..." /></SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              <SelectItem value="0-5k">0-5k Monthly</SelectItem>
                              <SelectItem value="5k-25k">5k-25k Monthly</SelectItem>
                              <SelectItem value="25k-100k">25k-100k Monthly</SelectItem>
                              <SelectItem value="100k+">100k+ High-Scale</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Approx. Annual Revenue</Label>
                          <Input placeholder="e.g. $250,000" value={formData.annualRevenue} onChange={e => setFormData({...formData, annualRevenue: e.target.value})} className="h-14 rounded-2xl bg-muted/5 border-2 text-lg font-bold" />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Current Platform Architecture</Label>
                          <Select value={formData.currentPlatform} onValueChange={v => setFormData({...formData, currentPlatform: v})}>
                            <SelectTrigger className="h-14 rounded-2xl bg-muted/5 border-2 font-bold"><SelectValue placeholder="Select platform..." /></SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {['Shopify', 'WooCommerce', 'Wix', 'Etsy', 'Printful/Printify', 'Other', 'None (New Build)'].map(p => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Button variant="outline" className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2" onClick={handleBack}>Back</Button>
                        <Button className="flex-[2] h-16 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary shadow-xl" onClick={handleNext}>Next Sequence —</Button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: SPECIFICS */}
                  {step === 3 && (
                    <div className="space-y-10">
                      <div className="space-y-2">
                        <h2 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase italic leading-[0.85]">System <br/><span className="text-primary">Focus</span></h2>
                        <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Step 03 — Defining technical requirements.</p>
                      </div>
                      <div className="grid gap-6">
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Primary Printing Field</Label>
                          <Select value={formData.printingField} onValueChange={v => setFormData({...formData, printingField: v})}>
                            <SelectTrigger className="h-14 rounded-2xl bg-muted/5 border-2 font-bold"><SelectValue placeholder="Select field..." /></SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {['Screen Printing', 'DTG/DTF', 'Embroidery', 'Large Format', 'Promotional Products'].map(f => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Infrastructure Budget</Label>
                          <Select value={formData.customBuildBudget} onValueChange={v => setFormData({...formData, customBuildBudget: v})}>
                            <SelectTrigger className="h-14 rounded-2xl bg-muted/5 border-2 font-bold"><SelectValue placeholder="Select budget range..." /></SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {['$5k-$10k', '$10k-$25k', '$25k-$50k', '$50k+'].map(b => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <Button variant="outline" className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2" onClick={handleBack}>Back</Button>
                        <Button className="flex-[2] h-16 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary shadow-xl" onClick={handleNext}>Schedule Briefing —</Button>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: SCHEDULING (Google Calendar Style) */}
                  {step === 4 && (
                    <div className="space-y-10 animate-in fade-in duration-700">
                      <div className="space-y-2">
                        <h2 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase italic leading-[0.85]">Strategy <br/><span className="text-primary">Call</span></h2>
                        <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Step 04 — Synchronize with our lab technicians.</p>
                      </div>
                      
                      <div className="grid lg:grid-cols-12 gap-8 items-start">
                        <div className="lg:col-span-7 space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">1. Select Briefing Date</Label>
                          <div className="p-6 bg-background border-2 rounded-[2rem] shadow-sm flex justify-center">
                            <Calendar
                              mode="single"
                              selected={formData.appointmentDate}
                              onSelect={d => setFormData({...formData, appointmentDate: d})}
                              className="rounded-xl border-none p-0"
                              classNames={{
                                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                day_today: "bg-muted text-foreground font-black",
                                head_cell: "text-[10px] font-black uppercase tracking-widest text-muted-foreground w-10",
                                cell: "h-10 w-10 p-0 relative",
                                day: "h-10 w-10 p-0 font-bold text-xs uppercase tracking-tighter",
                                caption_label: "text-sm font-black uppercase tracking-widest mb-4",
                                nav_button: "border-2 rounded-lg hover:bg-muted"
                              }}
                              disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
                            />
                          </div>
                        </div>

                        <div className="lg:col-span-5 space-y-6">
                          <div className="grid gap-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">2. Select Time (PST)</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {TIME_SLOTS.map(t => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setFormData({...formData, appointmentTime: t})}
                                  className={cn(
                                    "h-12 rounded-xl border-2 font-bold text-[10px] uppercase tracking-widest transition-all",
                                    formData.appointmentTime === t ? "bg-primary border-primary text-white shadow-lg scale-95" : "bg-background border-muted hover:border-primary/30"
                                  )}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>

                          {formData.appointmentDate && (
                            <Card className="p-6 bg-primary/5 rounded-[2rem] border-2 border-primary/10 space-y-4 animate-in slide-in-from-top-4 duration-500 shadow-inner">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                                  <CalendarDays className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Briefing Registry</h4>
                                  <p className="text-lg font-black uppercase italic tracking-tighter leading-none mt-0.5">
                                    {format(formData.appointmentDate, 'MMMM do, yyyy')}
                                  </p>
                                </div>
                              </div>
                              <Separator className="bg-primary/10" />
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">{formData.appointmentTime} (PST)</span>
                                </div>
                                <Badge className="bg-emerald-500 text-white border-none font-black text-[8px] uppercase tracking-widest h-5 px-2">Selection Verified</Badge>
                              </div>
                            </Card>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                        <Button variant="outline" className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2" onClick={handleBack}>Back</Button>
                        <Button 
                          className="flex-[2] h-16 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary shadow-xl transition-all active:scale-[0.98] group" 
                          onClick={handleSubmit}
                          disabled={isSubmitting || !formData.appointmentDate}
                        >
                          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Finalize Onboarding <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" /></>}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        <footer className="p-8 border-t bg-muted/5 text-center flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Registry ID: 8382-PARTNER-IN</p>
          <div className="flex gap-6">
            <Link href="/legal/terms" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Agreement</Link>
            <Link href="/legal/privacy" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Vault Protocol</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
