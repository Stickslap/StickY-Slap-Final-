'use client';

import React, { useState, useEffect } from 'react';
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { 
  ArrowRight, 
  Truck, 
  ShieldCheck, 
  Globe, 
  ImageIcon,
  Loader2,
  Zap,
  Play,
  Video
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useCollection, useMemoFirebase, useFirestore, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import { GalleryItem, FAQSettings, LandingSettings } from '@/lib/types';
import { cn } from '@/lib/utils';

const LOGO_URL = "https://res.cloudinary.com/dabgothkm/image/upload/v1772217426/arlington-teheran-WL-oIapq6TY-unsplash_dps0i1.png";


const FALLBACK_FAQS = [
  { 
    id: 'f1', 
    question: 'What makes Print Society .co\'s custom stickers special?', 
    answer: 'We use military-grade vinyl and UV-resistant inks. Every order is inspected by a human, and we offer free digital proofs so you see exactly what you get.'
  },
  { 
    id: 'f2', 
    question: 'How long does shipping take?', 
    answer: 'Standard shipping takes 3-5 business days. We also offer expedited options for those urgent sticker needs.'
  },
  { 
    id: 'f3', 
    question: 'Can I get a proof before my order ships?', 
    answer: 'Yes! We provide a free digital proof within 24 hours of your order. We won\'t start production until you give the green light.'
  }
];

const FALLBACK_LANDING: LandingSettings = {
  heroSection: {
    title: "Print Custom Stickers and Prints",
    tagline: "The Sticky Slap Standard",
    description: "Express delivery as fast as 2-4 business days. Get an instant proof and free shipping!",
    buttonText: "Get Started",
    isActive: true
  },
  videoSection: {
    title: "The Sticky Slap Method",
    tagline: "Precision in Every Adhesive.",
    description: "Go behind the scenes of our boutique production lab. From digital proofing to precision die-cutting, see how we craft the world's most durable stickers.",
    buttonText: "Watch Video",
    videoUrl: "https://picsum.photos/seed/bts-vid/1200/800",
    thumbnailUrl: "https://picsum.photos/seed/bts-thumb/1200/800",
    isActive: true,
    backgroundStyle: 'dark'
  },
  featuredImage: LOGO_URL,
  updatedAt: new Date().toISOString()
};

export default function LandingPage() {
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const galleryQuery = useMemoFirebase(() => 
    query(collection(db, 'gallery'), orderBy('order', 'asc'), limit(10)), 
  [db]);
  
  const { data: galleryItems, isLoading: isGalleryLoading } = useCollection<GalleryItem>(galleryQuery);

  useEffect(() => {
    if (galleryItems && galleryItems.length > 0 && !activeItem) {
      setActiveItem(galleryItems[0]);
    }
  }, [galleryItems, activeItem]);

  const faqRef = useMemoFirebase(() => doc(db, 'settings', 'faqs'), [db]);
  const { data: faqData } = useDoc<FAQSettings>(faqRef);

  const landingRef = useMemoFirebase(() => doc(db, 'settings', 'landing'), [db]);
  const { data: landingData, isLoading: isLandingLoading } = useDoc<LandingSettings>(landingRef);

  const faqs = faqData?.items?.length ? faqData.items : FALLBACK_FAQS;
  const landing = landingData || FALLBACK_LANDING;
  const videoSection = landing.videoSection || FALLBACK_LANDING.videoSection;

  const displayItem = activeItem || (galleryItems && galleryItems[0]) || null;
  const gridItems = galleryItems?.slice(0, 9) || []; 

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getEmbedUrl = (url: string) => {
    const id = getYoutubeId(url);
    if (!id) return url;
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&rel=0`;
  };

  if (!isMounted || isLandingLoading) return (
    <div className="flex items-center justify-center min-h-dvh">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <Header />
      
      <main className="flex-1">
        <section className="w-full py-12 lg:py-24">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div className="flex flex-col justify-center space-y-8">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    {landing.heroSection.tagline}
                  </div>
                  <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tighter leading-tight uppercase italic text-foreground">
                    {landing.heroSection.title}
                  </h1>
                  <p className="max-w-[700px] text-muted-foreground text-lg md:text-xl font-medium leading-relaxed">
                    {landing.heroSection.description}
                  </p>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Button size="lg" className="h-14 px-10 text-lg font-bold rounded-full" asChild>
                    <Link href="/signup">Join Sticky Slap Crew</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-bold rounded-full group" asChild>
                    <Link href="/products" className="flex items-center gap-2">
                      All sticker products
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="relative aspect-square max-w-[600px] mx-auto lg:ml-auto flex items-center justify-center bg-muted/5 rounded-3xl p-8 md:p-12 overflow-hidden">
                <Image
                  src={landing.featuredImage || LOGO_URL}
                  width={500}
                  height={500}
                  alt="Featured Hero Asset"
                  className="object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-700 animate-float"
                  priority
                  unoptimized
                />
              </div>
            </div>
          </div>
        </section>

        <section className="w-full pb-12">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4 p-6 bg-background border-2 rounded-3xl shadow-sm transition-all hover:border-primary/20">
                <div className="bg-primary/10 p-3 rounded-2xl">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-foreground">Free ground shipping</p>
                  <p className="text-xs text-muted-foreground font-medium">on all orders</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-6 bg-background border-2 rounded-3xl shadow-sm transition-all hover:border-primary/20">
                <div className="bg-emerald-50 p-3 rounded-2xl">
                  <Globe className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-foreground">World Class quality</p>
                  <p className="text-xs text-muted-foreground font-medium">made in the US</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-6 bg-background border-2 rounded-3xl shadow-sm transition-all hover:border-primary/20">
                <div className="bg-blue-50 p-3 rounded-2xl">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-foreground">Free Online Proof</p>
                  <p className="text-xs text-muted-foreground font-medium">with all orders</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 lg:py-20 hidden">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 relative group rounded-3xl overflow-hidden bg-muted/20 border-2">
                <div className="aspect-[16/9] relative bg-muted/10">
                  {isGalleryLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                    </div>
                  ) : displayItem ? (
                    <>
                      <Image
                        key={displayItem.id}
                        src={displayItem.imageUrl}
                        fill
                        alt={displayItem.title}
                        className="object-cover transition-all duration-700 group-hover:scale-105 animate-in fade-in"
                      />
                      <div className="absolute bottom-6 left-6 bg-background/90 backdrop-blur-md p-4 rounded-2xl border shadow-xl animate-in fade-in slide-in-from-bottom-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">{displayItem.category || 'Featured Project'}</p>
                        <h4 className="text-lg font-black font-headline tracking-tighter uppercase">{displayItem.title}</h4>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 space-y-4">
                      <ImageIcon className="h-12 w-12 text-muted-foreground/20" />
                      <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Upload projects in Admin to see them here</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center justify-between">
                  <span>SHOWCASE</span>
                  {galleryItems && (
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-mono">{galleryItems.length} ITEMS</span>
                  )}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {isGalleryLoading ? (
                    Array(6).fill(0).map((_, i) => (
                      <div key={i} className="aspect-square bg-muted/30 rounded-xl animate-pulse" />
                    ))
                  ) : gridItems.length > 0 ? (
                    gridItems.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => setActiveItem(item)}
                        className={cn(
                          "aspect-square relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer group shadow-sm bg-muted/10",
                          displayItem?.id === item.id ? "border-primary ring-2 ring-primary/20 scale-95" : "border-transparent hover:border-primary/50"
                        )}
                      >
                        <Image src={item.imageUrl} fill alt={item.title} className="object-cover group-hover:scale-110 transition-transform" />
                      </div>
                    ))
                  ) : (
                    Array(6).fill(0).map((_, i) => (
                      <div key={i} className="aspect-square bg-muted/10 rounded-xl border-2 border-dashed flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-muted-foreground/10" />
                      </div>
                    ))
                  )}
                </div>
                <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest hover:bg-primary/5" asChild>
                  <Link href="/products">Get Custom Stickers <ArrowRight className="ml-2 h-3 w-3" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {videoSection.isActive && (
          <section className={cn(
            "w-full py-12 lg:py-32 border-y transition-colors duration-700",
            videoSection.backgroundStyle === 'dark' ? "bg-foreground text-background" : "bg-muted/5 text-foreground"
          )}>
            <div className="container px-4 md:px-6 mx-auto">
              <div className="grid gap-12 lg:grid-cols-2 items-center">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">{videoSection.tagline}</div>
                    <h2 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase italic leading-none">{videoSection.title}</h2>
                  </div>
                  <p className={cn(
                    "text-lg md:text-xl font-medium leading-relaxed",
                    videoSection.backgroundStyle === 'dark' ? "text-muted-foreground" : "text-muted-foreground"
                  )}>
                    {videoSection.description}
                  </p>
                  <div className="flex flex-wrap gap-4 pt-4">
                    <div className={cn(
                      "flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-colors",
                      videoSection.backgroundStyle === 'dark' ? "bg-white/5 border-white/10" : "bg-muted/20 border-muted"
                    )}>
                      <ShieldCheck className="h-5 w-5 text-emerald-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">UV-Resistant Inks</span>
                    </div>
                    <div className={cn(
                      "flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-colors",
                      videoSection.backgroundStyle === 'dark' ? "bg-white/5 border-white/10" : "bg-muted/20 border-muted"
                    )}>
                      <Zap className="h-5 w-5 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Precision Cutting</span>
                    </div>
                  </div>
                </div>
                <div 
                  className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl group border-4 border-muted/10 bg-muted/5"
                >
                  {videoSection.videoUrl ? (
                    videoSection.videoUrl.includes('youtube') || videoSection.videoUrl.includes('youtu.be') ? (
                      <iframe 
                        className="w-full h-full"
                        src={getEmbedUrl(videoSection.videoUrl)}
                        title="Process Video"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                      />
                    ) : (
                      <video 
                        className="w-full h-full object-cover"
                        src={videoSection.videoUrl}
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    )
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 space-y-4">
                      <Video className="h-12 w-12 text-muted-foreground/20" />
                      <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Video content pending</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="w-full py-12 lg:py-24 bg-muted/10 hidden">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="max-w-3xl mx-auto space-y-12">
              <div className="text-center space-y-2">
                <h2 className="text-4xl font-black font-headline tracking-tighter uppercase italic text-foreground">Frequently Asked Questions</h2>
                <p className="text-muted-foreground font-medium">Learn more about Print Society .co custom stickers and our services.</p>
              </div>
              <Accordion type="single" collapsible className="w-full space-y-4">
                {faqs.map((faq, idx) => (
                  <AccordionItem key={faq.id || idx} value={`item-${idx}`} className="border-2 rounded-2xl px-6 bg-background">
                    <AccordionTrigger className="hover:no-underline font-bold text-lg py-6 text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
