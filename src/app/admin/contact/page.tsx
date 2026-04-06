
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Instagram, 
  Twitter, 
  Save, 
  Loader2, 
  RefreshCw,
  Settings2,
  Building2,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useDoc, useMemoFirebase, useFirestore, setDocumentNonBlocking, useUser } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase';
import { ContactSettings } from '@/lib/types';

const DEFAULT_CONTACT: ContactSettings = {
  directLines: {
    email: 'print@printsocietyco.com',
    phone: '1-800-STICK-IT',
    address: '123 Adhesive Way, Los Angeles, CA 90210'
  },
  officeHours: {
    mondayFriday: '9:00 AM — 6:00 PM PST',
    saturday: '10:00 AM — 2:00 PM PST',
    sunday: 'Closed'
  },
  socials: {
    instagram: 'https://instagram.com',
    twitter: 'https://twitter.com'
  },
  connectSection: {
    title: "Let's Connect",
    description: "Have a custom project that needs special attention? Our team is standing by to help."
  },
  updatedAt: new Date().toISOString()
};

export default function ContactSettingsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch existing Contact settings
  const contactRef = useMemoFirebase(() => doc(db, 'settings', 'contact'), [db]);
  const { data: contactData, isLoading } = useDoc<ContactSettings>(contactRef);

  // Form State
  const [settings, setSettings] = useState<ContactSettings>(DEFAULT_CONTACT);

  useEffect(() => {
    if (contactData) {
      setSettings({
        ...DEFAULT_CONTACT,
        ...contactData,
        connectSection: contactData.connectSection || DEFAULT_CONTACT.connectSection
      });
    } else {
      setSettings(DEFAULT_CONTACT);
    }
  }, [contactData]);

  const handleSave = () => {
    if (!contactRef) return;
    setIsSaving(true);

    const updates: ContactSettings = {
      ...settings,
      updatedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(contactRef, updates, { merge: true });
    
    // Log activity
    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: user?.uid || 'unknown',
      action: 'Contact Details Updated',
      entityType: 'System',
      entityId: 'contact',
      details: `Updated shop contact info, connect section text, and office hours.`,
      timestamp: new Date().toISOString()
    });

    toast({ 
      title: "Contact Hub Updated", 
      description: "Public contact information has been synchronized." 
    });
    
    setTimeout(() => setIsSaving(false), 600);
  };

  const resetToDefault = () => {
    if (confirm('Reset to original Society contact info? This will discard your current changes.')) {
      setSettings(DEFAULT_CONTACT);
      toast({ title: "Restored Defaults" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic text-foreground">
            Contact <span className="text-primary">Hub</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Manage shop contact details and availability</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl h-12" onClick={resetToDefault}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Restore Defaults —
          </Button>
          <Button 
            className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 shadow-lg" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            Publish Changes —
          </Button>
        </div>
      </div>

      <div className="grid gap-8">
        {/* Connect Section Branding (About Page) */}
        <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm border-primary/20 bg-primary/5">
          <CardHeader className="bg-primary/10 border-b py-6 px-8">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Connect Section (About Page)
            </CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-widest text-primary/70">Manage the recruitment headline and narrative on the About page.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Section Title</Label>
              <Input 
                value={settings.connectSection?.title} 
                onChange={e => setSettings({...settings, connectSection: {...settings.connectSection!, title: e.target.value}})} 
                className="h-12 rounded-xl bg-background border-2 font-bold" 
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Narrative Description</Label>
              <Textarea 
                value={settings.connectSection?.description} 
                onChange={e => setSettings({...settings, connectSection: {...settings.connectSection!, description: e.target.value}})} 
                className="min-h-[100px] rounded-xl bg-background border-2 leading-relaxed" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Direct Lines */}
        <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
          <CardHeader className="bg-muted/30 border-b py-6 px-8">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" /> Direct Communication Lines
            </CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-widest">How customers reach the Lab directly.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Shop Email</Label>
                <Input 
                  value={settings.directLines.email} 
                  onChange={e => setSettings({...settings, directLines: {...settings.directLines, email: e.target.value}})} 
                  className="h-12 rounded-xl bg-muted/5 border-2 font-bold" 
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Shop Phone</Label>
                <Input 
                  value={settings.directLines.phone} 
                  onChange={e => setSettings({...settings, directLines: {...settings.directLines, phone: e.target.value}})} 
                  className="h-12 rounded-xl bg-muted/5 border-2 font-bold" 
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Studio & Lab Address</Label>
              <Input 
                value={settings.directLines.address} 
                onChange={e => setSettings({...settings, directLines: {...settings.directLines, address: e.target.value}})} 
                className="h-12 rounded-xl bg-muted/5 border-2" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Office Hours */}
        <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
          <CardHeader className="bg-muted/30 border-b py-6 px-8">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Lab Availability
            </CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-widest">Scheduled hours for production and support.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Mon — Fri</Label>
                <Input 
                  value={settings.officeHours.mondayFriday} 
                  onChange={e => setSettings({...settings, officeHours: {...settings.officeHours, mondayFriday: e.target.value}})} 
                  className="h-12 rounded-xl bg-muted/5 border-2" 
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Saturday</Label>
                <Input 
                  value={settings.officeHours.saturday} 
                  onChange={e => setSettings({...settings, officeHours: {...settings.officeHours, saturday: e.target.value}})} 
                  className="h-12 rounded-xl bg-muted/5 border-2" 
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Sunday</Label>
                <Input 
                  value={settings.officeHours.sunday} 
                  onChange={e => setSettings({...settings, officeHours: {...settings.officeHours, sunday: e.target.value}})} 
                  className="h-12 rounded-xl bg-muted/5 border-2" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
          <CardHeader className="bg-muted/30 border-b py-6 px-8">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" /> Social Channels
            </CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-widest">Connected social handles for the Society.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Instagram URL</Label>
                <div className="relative">
                  <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={settings.socials.instagram} 
                    onChange={e => setSettings({...settings, socials: {...settings.socials, instagram: e.target.value}})} 
                    className="h-12 rounded-xl bg-muted/5 border-2 pl-12" 
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Twitter (X) URL</Label>
                <div className="relative">
                  <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={settings.socials.twitter} 
                    onChange={e => setSettings({...settings, socials: {...settings.socials, twitter: e.target.value}})} 
                    className="h-12 rounded-xl bg-muted/5 border-2 pl-12" 
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
