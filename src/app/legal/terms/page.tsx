'use client';

import React from 'react';
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  ShieldCheck, 
  Scale, 
  Truck, 
  Printer, 
  AlertCircle,
  ArrowRight,
  Clock
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const LOGO_URL = "https://res.cloudinary.com/dabgothkm/image/upload/v1772217426/arlington-teheran-WL-oIapq6TY-unsplash_dps0i1.png";

export default function TermsPage() {
  const sections = [
    {
      icon: <Scale className="h-6 w-6 text-primary" />,
      title: "Agreement to Terms",
      content: "By accessing Print Society .co, you agree to be bound by these Terms of Service. These terms apply to all visitors, users, and others who access our boutique printing services."
    },
    {
      icon: <Printer className="h-6 w-6 text-primary" />,
      title: "Ordering & Production",
      content: "All orders are custom-manufactured. Once a proof is approved, production begins immediately. Changes cannot be made once an order enters the production queue."
    },
    {
      icon: <FileText className="h-6 w-6 text-primary" />,
      title: "Artwork Requirements",
      content: "Customers are responsible for providing high-resolution artwork (300 DPI+). Print Society .co is not liable for low-quality prints resulting from poor-quality source files."
    },
    {
      icon: <Truck className="h-6 w-6 text-primary" />,
      title: "Shipping & Fulfillment",
      content: "Delivery dates are estimates. While we strive for 2-4 business day delivery, we are not responsible for delays caused by shipping carriers or weather events."
    },
    {
      icon: <AlertCircle className="h-6 w-6 text-primary" />,
      title: "Refunds & Returns",
      content: "Due to the custom nature of our products, all sales are final. If there is a manufacturing defect, we will issue a replacement or shop credit at our discretion."
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-primary" />,
      title: "Intellectual Property",
      content: "You retain ownership of your designs. By uploading, you grant us a limited license to print your designs for the purpose of fulfilling your order."
    }
  ];

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 lg:py-24 bg-muted/10 border-b">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                <FileText className="h-3 w-3" /> The Society Rules
              </div>
              <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tighter leading-tight uppercase italic">
                Terms of <span className="text-primary">Service</span>
              </h1>
              <p className="max-w-[700px] text-muted-foreground text-lg md:text-xl font-medium">
                The standard for custom print precision and professional collaboration.
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
                <Card key={idx} className="border-2 rounded-[2rem] overflow-hidden transition-all hover:border-primary/20 hover:shadow-xl group">
                  <CardContent className="p-8 space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-muted/10 flex items-center justify-center border group-hover:bg-primary transition-colors duration-500">
                      <div className="group-hover:text-white transition-colors duration-500">
                        {section.icon}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold uppercase tracking-tight">{section.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {section.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detailed Clause Note */}
            <div className="mt-16 p-8 md:p-12 bg-foreground text-background rounded-[3rem] space-y-8">
              <div className="max-w-2xl space-y-4">
                <h2 className="text-3xl md:text-4xl font-black font-headline tracking-tighter uppercase italic leading-none">
                  Fair Play & <br/><span className="text-primary">Professional Ethics</span>
                </h2>
                <p className="text-muted-foreground font-medium">
                  We stand by our work. If you feel your experience has fallen below the Print Society standard, reach out directly to our resolution desk.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Resolution Speed</p>
                    <Link href="/contact" className="text-lg font-bold hover:text-primary transition-colors underline underline-offset-4">
                      24 Hour Reply <ArrowRight className="inline-block h-4 w-4 ml-1" />
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
