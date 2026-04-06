
'use client';

import React, { useState, useEffect } from 'react';
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle2, 
  Globe, 
  Play, 
  Linkedin, 
  Twitter, 
  Instagram, 
  Mail, 
  Phone, 
  MapPin,
  Loader2,
  Users,
  ShieldCheck,
  Building2,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import Link from "next/link";
import { useFirestore, useUser, addDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { TeamSettings, TeamMember, AboutSettings, ContactSettings } from '@/lib/types';

const DEFAULT_LOGO = "https://res.cloudinary.com/dabgothkm/image/upload/v1772217426/arlington-teheran-WL-oIapq6TY-unsplash_dps0i1.png";

const FALLBACK_TEAM: TeamMember[] = [
  { id: '1', name: "Alex Rivet", role: "Master Printer", bio: "15 years of vinyl expertise.", imageUrl: "https://picsum.photos/seed/member-0/600/800", order: 0 },
  { id: '2', name: "Sarah Inks", role: "Lead Designer", bio: "Visionary behind our custom proofs.", imageUrl: "https://picsum.photos/seed/member-1/600/800", order: 1 },
  { id: '3', name: "Marcus Die", role: "Ops Manager", bio: "Ensuring 2-day turnarounds always.", imageUrl: "https://picsum.photos/seed/member-2/600/800", order: 2 },
  { id: '4', name: "Chloe Gloss", role: "QC Director", bio: "Nothing leaves without her stamp.", imageUrl: "https://picsum.photos/seed/member-3/600/800", order: 3 }
];

const FALLBACK_ABOUT: Partial<AboutSettings> = {
  mission: {
    title: "Our Mission",
    tagline: "Stick to Greatness.",
    description1: "Founded in 2024, Print Society .co was born from a simple observation: ordering custom stickers was either too expensive or too difficult. We set out to change that by combining professional-grade equipment with a boutique service experience.",
    description2: "Every project we touch is treated as a piece of art. From our choice of military-grade vinyl to our UV-resistant ink sets, we ensure your brand stands out and stays stuck.",
    videoUrl: "https://www.youtube.com/watch?v=MJ9JaM7tI3w",
    videoThumbnailUrl: "https://picsum.photos/seed/about-vid/1200/800",
    highlights: ["100% Waterproof", "Hand Inspected"]
  },
  partners: [
    { id: 'p1', name: 'Brand A', imageUrl: 'https://picsum.photos/seed/p1/200/100', order: 0 },
    { id: 'p2', name: 'Brand B', imageUrl: 'https://picsum.photos/seed/p2/200/100', order: 1 },
    { id: 'p3', name: 'Brand C', imageUrl: 'https://picsum.photos/seed/p3/200/100', order: 2 },
    { id: 'p4', name: 'Brand D', imageUrl: 'https://picsum.photos/seed/p4/200/100', order: 3 },
  ]
};

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
  connectSection: {
    title: "Let's Connect",
    description: "Have a custom project that needs special attention? Our team is standing by to help."
  },
  updatedAt: new Date().toISOString()
};

const getYoutubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function AboutPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    details: ''
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch Branding
  const appearanceRef = useMemoFirebase(() => doc(db, 'settings', 'appearance'), [db]);
  const { data: appearance } = useDoc<any>(appearanceRef);
  const logoUrl = appearance?.logoUrl || DEFAULT_LOGO;

  // Fetch Team
  const teamRef = useMemoFirebase(() => doc(db, 'settings', 'team'), [db]);
  const { data: teamData, isLoading: isTeamLoading } = useDoc<TeamSettings>(teamRef);

  // Fetch About Content
  const aboutRef = useMemoFirebase(() => doc(db, 'settings', 'about'), [db]);
  const { data: aboutData, isLoading: isAboutLoading } = useDoc<AboutSettings>(aboutRef);

  // Fetch Contact Content for the Connect Section
  const contactRef = useMemoFirebase(() => doc(db, 'settings', 'contact'), [db]);
  const { data: contactData } = useDoc<ContactSettings>(contactRef);

  const teamMembers = teamData?.members?.length ? teamData.members : FALLBACK_TEAM;
  const about = aboutData || FALLBACK_ABOUT;
  const mission = about.mission || FALLBACK_ABOUT.mission!;
  const partners = about.partners || FALLBACK_ABOUT.partners!;
  const contact = contactData || FALLBACK_CONTACT;
  const connectSection = contact.connectSection || FALLBACK_CONTACT.connectSection!;

  const ytId = getYoutubeId(mission.videoUrl);
  const thumbSrc = mission.videoThumbnailUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : "https://picsum.photos/seed/about-vid/1200/800");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.details) {
      toast({ title: "Required Fields", description: "Please provide your email and project details.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const ticketData = {
      userId: user?.uid || 'guest_' + Date.now(),
      customerEmail: formData.email,
      subject: `New Inquiry from About Us Page`,
      priority: 'Medium',
      status: 'open',
      message: `Customer Name: ${formData.name}\nSource: About Us Page\n\n${formData.details}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };

    try {
      await addDocumentNonBlocking(collection(db, 'support_tickets'), ticketData);
      toast({ 
        title: "Message Sent!", 
        description: "Your inquiry has been logged. Our team will review it shortly." 
      });
      setFormData({ name: '', email: '', details: '' });
    } catch (error) {
      // Error is handled by global listener
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 lg:py-24 bg-muted/5">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center text-center space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                <Globe className="h-3 w-3" /> Based in the USA
              </div>
              <div className="mb-4">
                <Image 
                  src={logoUrl} 
                  alt="Print Society .co" 
                  width={280} 
                  height={70} 
                  className="h-16 w-auto object-contain"
                  unoptimized
                />
              </div>
              {/* Removed heading */}
              <p className="max-w-[700px] text-muted-foreground text-lg md:text-xl font-medium leading-relaxed">
                We aren't just a sticker shop. We are a collective of designers and printers dedicated to the art of the perfect adhesive.
              </p>
            </div>
          </div>
        </section>

        {/* Story & Video Section */}
        <section className="w-full py-12 lg:py-24">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black font-headline tracking-tighter uppercase italic text-foreground">{mission.title}</h2>
                  <p className="text-muted-foreground text-lg">{mission.tagline}</p>
                </div>
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {mission.description1}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {mission.description2}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 pt-4">
                  {mission.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 px-4 py-2 bg-muted/20 rounded-xl border border-muted-foreground/10">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{h}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl group border-4 border-muted/10 bg-muted/5 cursor-pointer">
                    {ytId ? (
                      <div className="absolute inset-0 pointer-events-none scale-110">
                        <iframe
                          className="w-full h-full"
                          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=0&controls=0&modestbranding=1&showinfo=0&rel=0&enablejsapi=1`}
                          allow="autoplay; encrypted-media"
                        />
                      </div>
                    ) : mission.videoUrl ? (
                      <video 
                        src={mission.videoUrl}
                        autoPlay
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <Image 
                        src={thumbSrc} 
                        fill 
                        alt="Our Story Video" 
                        className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                        unoptimized
                      />
                    )}
                    
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                      <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center shadow-xl group-hover:scale-110 transition-all duration-500">
                        <Play className="h-8 w-8 text-white fill-current translate-x-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-6 left-6 flex items-center gap-2 text-white/80">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">Watch Full Story</span>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black border-none rounded-[2rem] aspect-video">
                  {ytId ? (
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                      title="Society Story"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      controls
                      autoPlay
                      className="w-full h-full"
                      src={mission.videoUrl}
                    />
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </section>

        {/* Partners Section */}
        {partners && partners.length > 0 && (
          <section className="w-full py-12 lg:py-20 border-t bg-muted/5">
            <div className="container px-4 md:px-6 mx-auto">
              <div className="text-center mb-12 space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Trusted By the Best</h3>
                <h2 className="text-3xl font-black font-headline tracking-tighter uppercase italic">Society <span className="text-primary">Collaborators</span></h2>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-12 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
                {partners.sort((a, b) => a.order - b.order).map((partner) => (
                  <div key={partner.id} className="relative h-12 w-32 md:h-16 md:w-40">
                    <Image 
                      src={partner.imageUrl} 
                      alt={partner.name} 
                      fill 
                      className="object-contain" 
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Team Section */}
        <section className="w-full py-12 lg:py-24 border-t hidden">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic">The Society Team</h2>
              <p className="text-muted-foreground font-medium">A group of dedicated specialists making sure your prints are perfect.</p>
            </div>
            
            {isTeamLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {teamMembers.map((member, i) => (
                  <Card key={member.id} className="border-2 rounded-3xl overflow-hidden group hover:border-primary/20 transition-all duration-500">
                    <CardContent className="p-0">
                      <div className="aspect-[4/5] relative bg-muted overflow-hidden">
                        <Image 
                          src={member.imageUrl || `https://picsum.photos/seed/member-${i}/600/800`} 
                          fill 
                          alt={member.name} 
                          className="object-cover group-hover:scale-110 transition-transform duration-700"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                          <div className="flex gap-3">
                            <Linkedin className="h-4 w-4 text-white hover:text-primary cursor-pointer" />
                            <Twitter className="h-4 w-4 text-white hover:text-primary cursor-pointer" />
                          </div>
                        </div>
                      </div>
                      <div className="p-6 text-center space-y-1">
                        <h4 className="font-bold text-lg">{member.name}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">{member.role}</p>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{member.bio}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Contact Section */}
        <section className="w-full py-12 lg:py-32 bg-foreground text-background hidden">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-12 lg:grid-cols-2">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase italic leading-none">
                    {connectSection.title.split(' ').map((word, i, arr) => (
                      <React.Fragment key={i}>
                        {i === arr.length - 1 ? <span className="text-primary">{word}</span> : word}{' '}
                        {i === 0 && arr.length > 1 && <br/>}
                      </React.Fragment>
                    ))}
                  </h2>
                  <p className="text-muted-foreground font-medium max-w-md italic">
                    {connectSection.description}
                  </p>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center gap-4 group">
                    <div className="h-12 w-12 rounded-2xl bg-muted/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-500">
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email Us</p>
                      <p className="text-lg font-bold">{contact.directLines.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="h-12 w-12 rounded-2xl bg-muted/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-500">
                      <Phone className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Call Us</p>
                      <p className="text-lg font-bold">{contact.directLines.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="h-12 w-12 rounded-2xl bg-muted/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-500">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Visit The Lab</p>
                      <p className="text-sm font-bold max-w-xs">{contact.directLines.address}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-muted/20 hover:bg-primary hover:border-primary transition-all duration-500" asChild>
                    <a href={contact.socials.instagram} target="_blank" rel="noopener noreferrer"><Instagram className="h-5 w-5" /></a>
                  </Button>
                  <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-muted/20 hover:bg-primary hover:border-primary transition-all duration-500" asChild>
                    <a href={contact.socials.twitter} target="_blank" rel="noopener noreferrer"><Twitter className="h-5 w-5" /></a>
                  </Button>
                </div>
              </div>

              <Card className="bg-white/5 border-white/10 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
                <CardContent className="p-8 md:p-12 space-y-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">Full Name</Label>
                      <input 
                        className="bg-white/10 border-white/10 h-12 rounded-xl text-white focus-visible:ring-primary px-4 outline-none" 
                        placeholder="Enter your name" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">Email Address</Label>
                      <input 
                        type="email"
                        className="bg-white/10 border-white/10 h-12 rounded-xl text-white focus-visible:ring-primary px-4 outline-none" 
                        placeholder="Enter your email" 
                        required
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-white/60">Project Details</Label>
                      <textarea 
                        className="bg-white/10 border-white/10 rounded-xl text-white focus-visible:ring-primary min-h-[150px] p-4 outline-none resize-none" 
                        placeholder="Tell us about your stickers..." 
                        required
                        value={formData.details}
                        onChange={e => setFormData({...formData, details: e.target.value})}
                      />
                    </div>
                    <Button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-14 text-lg font-black uppercase tracking-widest rounded-xl bg-primary hover:bg-primary/90"
                    >
                      {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                      {isSubmitting ? 'Sending...' : 'Send Message —'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
