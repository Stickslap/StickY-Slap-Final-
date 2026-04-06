'use client';

import React from 'react';
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ShieldCheck, 
  Lock, 
  Database, 
  Truck, 
  CreditCard, 
  FileImage,
  ArrowRight
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const LOGO_URL = "https://res.cloudinary.com/dabgothkm/image/upload/v1772217426/arlington-teheran-WL-oIapq6TY-unsplash_dps0i1.png";

export default function PrivacyPage() {
  const sections = [
    {
      icon: <Database className="h-6 w-6 text-primary" />,
      title: "Data Collection",
      content: "We collect information necessary to process your custom print orders, including your name, shipping address, email, and phone number. We also collect metadata related to your browsing experience to improve our shop's performance."
    },
    {
      icon: <FileImage className="h-6 w-6 text-primary" />,
      title: "Artwork & Intellectual Property",
      content: "Your designs are yours. We only store your uploaded artwork for the purpose of production and re-ordering. We do not use your custom designs for marketing purposes without your explicit written consent."
    },
    {
      icon: <CreditCard className="h-6 w-6 text-primary" />,
      title: "Payment Security",
      content: "All payments are processed through secure, PCI-compliant third-party gateways. Print Society .co does not store your full credit card information on our servers."
    },
    {
      icon: <Truck className="h-6 w-6 text-primary" />,
      title: "Third-Party Sharing",
      content: "We share your shipping details with verified carriers (UPS, FedEx, USPS) to ensure delivery. We never sell your personal data to third-party marketing agencies."
    },
    {
      icon: <Lock className="h-6 w-6 text-primary" />,
      title: "Data Retention",
      content: "Account information and order history are kept to facilitate easy re-ordering. You may request the deletion of your account and associated personal data at any time via our contact portal."
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-primary" />,
      title: "Your Rights",
      content: "Depending on your location, you have rights regarding access to, correction of, and deletion of your personal information. We comply with all applicable regional privacy laws (GDPR, CCPA)."
    }
  ];

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 lg:py-24 bg-muted/10">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                <ShieldCheck className="h-3 w-3" /> Secure Society
              </div>
              <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tighter leading-tight uppercase italic">
                Privacy <span className="text-primary">Protocol</span>
              </h1>
              <p className="max-w-[700px] text-muted-foreground text-lg md:text-xl font-medium">
                How we protect your brand, your data, and your vision. 
                <br /><span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Last Updated: February 2024</span>
              </p>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="w-full py-12 lg:py-24">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {sections.map((section, idx) => (
                <Card key={idx} className="border-2 rounded-[2rem] overflow-hidden transition-all hover:border-primary/20 hover:shadow-xl">
                  <CardContent className="p-8 space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-muted/10 flex items-center justify-center border">
                      {section.icon}
                    </div>
                    <h3 className="text-xl font-bold uppercase tracking-tight">{section.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {section.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-16 p-8 md:p-12 bg-foreground text-background rounded-[3rem] space-y-8">
              <div className="max-w-2xl space-y-4">
                <h2 className="text-3xl md:text-4xl font-black font-headline tracking-tighter uppercase italic leading-none">
                  Questions regarding <br/><span className="text-primary">Your Data?</span>
                </h2>
                <p className="text-muted-foreground font-medium">
                  Our compliance team is ready to assist with any concerns regarding your privacy or data handling.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Data Request</p>
                    <Link href="/contact" className="text-lg font-bold hover:text-primary transition-colors underline underline-offset-4">
                      Open a Ticket <ArrowRight className="inline-block h-4 w-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
