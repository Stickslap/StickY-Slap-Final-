'use client';

import React, { useState, useRef, useEffect } from 'react';
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Upload, 
  Loader2, 
  MessageSquare,
  FileText,
  X,
  Instagram,
  Twitter
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useFirestore, useUser, addDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ContactSettings } from '@/lib/types';

const LOGO_URL = "https://res.cloudinary.com/dabgothkm/image/upload/v1772217426/arlington-teheran-WL-oIapq6TY-unsplash_dps0i1.png";

const CATEGORIES = [
  { value: 'General Inquiry', label: 'General Inquiry' },
  { value: 'Custom Quote', label: 'Custom Quote / Bulk Pricing' },
  { value: 'Order Status', label: 'Order Status & Tracking' },
  { value: 'Artwork Assistance', label: 'Artwork & Design Assistance' },
  { value: 'Wholesale', label: 'Wholesale & Partnerships' },
];

const FALLBACK_CONTACT: ContactSettings = {
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
  updatedAt: new Date().toISOString()
};

export default function ContactPage() {
  const db = useFirestore();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'General Inquiry',
    details: ''
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch dynamic contact settings
  const contactRef = useMemoFirebase(() => doc(db, 'settings', 'contact'), [db]);
  const { data: contactData } = useDoc<ContactSettings>(contactRef);

  const contact = contactData || FALLBACK_CONTACT;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile({
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.details) {
      toast({ title: "Required Fields", description: "Email and message are required.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const ticketData = {
      userId: user?.uid || 'guest_' + Math.random().toString(36).substr(2, 9),
      customerEmail: formData.email,
      subject: `${formData.category}: ${formData.name || 'Web Inquiry'}`,
      priority: formData.category === 'Order Status' ? 'High' : 'Medium',
      status: 'open',
      message: `Customer Name: ${formData.name}\nCategory: ${formData.category}\nSource: Main Contact Page\nAttachment: ${attachedFile ? attachedFile.name : 'None'}\n\n${formData.details}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };

    try {
      await addDocumentNonBlocking(collection(db, 'support_tickets'), ticketData);
      toast({ 
        title: "Inquiry Received", 
        description: "Your support ticket has been opened. Check your email for updates." 
      });
      setFormData({ name: '', email: '', category: 'General Inquiry', details: '' });
      setAttachedFile(null);
    } catch (error) {
      // Handled by global listener
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col min-h-dvh bg-background font-body">
      <Header />
      
      <main className="flex-1">
        <section className="w-full py-12 lg:py-20 bg-muted/10 border-b">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">Connect with us</div>
              <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tighter leading-tight uppercase italic text-foreground">
                Get in <span className="text-primary">Touch</span>
              </h1>
              <p className="max-w-[600px] text-muted-foreground text-lg font-medium">
                Whether it's a custom quote or design help, the Society is here to assist.
              </p>
            </div>
          </div>
        </section>

        <section className="w-full py-12 lg:py-24">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-12 lg:grid-cols-5 items-start">
              
              <div className="lg:col-span-2 space-y-12">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Direct Lines</h3>
                  <div className="space-y-8">
                    <div className="flex items-start gap-4 group">
                      <div className="h-12 w-12 rounded-2xl bg-muted/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-500 shrink-0 border">
                        <Mail className="h-5 w-5 text-foreground group-hover:text-white" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Support & Sales</p>
                        <p className="text-lg font-bold">{contact.directLines.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 group">
                      <div className="h-12 w-12 rounded-2xl bg-muted/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-500 shrink-0 border">
                        <Phone className="h-5 w-5 text-foreground group-hover:text-white" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Call the Shop</p>
                        <p className="text-lg font-bold">{contact.directLines.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 group">
                      <div className="h-12 w-12 rounded-2xl bg-muted/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-500 shrink-0 border">
                        <MapPin className="h-5 w-5 text-foreground group-hover:text-white" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">HQ & Lab</p>
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{contact.directLines.address}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-muted/5 border-2 rounded-[2rem] space-y-4">
                  <h4 className="text-sm font-black uppercase tracking-widest">Office Hours</h4>
                  <div className="space-y-2 text-xs font-medium text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Mon — Fri</span>
                      <span className="text-foreground">{contact.officeHours.mondayFriday}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Saturday</span>
                      <span className="text-foreground">{contact.officeHours.saturday}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sunday</span>
                      <span className={cn(contact.officeHours.sunday.toLowerCase() === 'closed' ? "text-primary font-black uppercase" : "text-foreground")}>
                        {contact.officeHours.sunday}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-muted hover:bg-primary hover:border-primary transition-all duration-500" asChild>
                    <a href={contact.socials.instagram} target="_blank" rel="noopener noreferrer"><Instagram className="h-5 w-5" /></a>
                  </Button>
                  <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-muted hover:bg-primary hover:border-primary transition-all duration-500" asChild>
                    <a href={contact.socials.twitter} target="_blank" rel="noopener noreferrer"><Twitter className="h-5 w-5" /></a>
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-3">
                <Card className="bg-card border-2 shadow-2xl rounded-[2.5rem] overflow-hidden">
                  <CardContent className="p-8 md:p-12">
                    <form onSubmit={handleSubmit} className="space-y-8">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Identity</Label>
                          <Input 
                            placeholder="Full Name" 
                            className="h-14 rounded-xl bg-muted/5 border-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Return Email</Label>
                          <Input 
                            type="email"
                            required
                            placeholder="Email Address" 
                            className="h-14 rounded-xl bg-muted/5 border-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Reason for contact</Label>
                        <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                          <SelectTrigger className="h-14 rounded-xl bg-muted/5 border-2 focus:ring-primary">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Inquiry Details</Label>
                        <Textarea 
                          required
                          placeholder="How can we help? Please include order numbers if applicable." 
                          className="min-h-[180px] rounded-xl bg-muted/5 border-2 focus-visible:ring-primary focus-visible:border-primary transition-all resize-none"
                          value={formData.details}
                          onChange={e => setFormData({...formData, details: e.target.value})}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Attachments (Artwork / References)</Label>
                        <div 
                          className={cn(
                            "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer",
                            attachedFile ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50 hover:bg-muted/5"
                          )}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <input 
                            type="file" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileChange}
                          />
                          
                          {attachedFile ? (
                            <div className="flex items-center gap-4 animate-in zoom-in-95">
                              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white">
                                <FileText className="h-6 w-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate">{attachedFile.name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">{attachedFile.size}</p>
                              </div>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAttachedFile(null);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                              <p className="text-sm font-bold uppercase tracking-tighter">Click to upload files</p>
                              <p className="text-[10px] text-muted-foreground font-medium mt-1">PDF, AI, PNG, or SVG (Max 10MB)</p>
                            </>
                          )}
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full h-16 text-lg font-black uppercase tracking-widest rounded-2xl bg-foreground text-background hover:bg-primary hover:text-white transition-all duration-500 shadow-xl"
                      >
                        {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <MessageSquare className="h-6 w-6 mr-3" />}
                        {isSubmitting ? 'Opening Ticket...' : 'Send Inquiry —'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
