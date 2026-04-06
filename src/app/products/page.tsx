'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { ArrowRight, Zap, Loader2, Package, Layers, Sparkles, LayoutGrid, Scaling, MoveRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCollection, useMemoFirebase, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { ProductTemplate, CatalogSettings } from '@/lib/types';
import { cn } from '@/lib/utils';

const DEFAULT_CATALOG: CatalogSettings = {
  title: "Master Catalog",
  tagline: "The Society Collections",
  description: "High-precision manufacturing across DTF, Screen, Vinyl, and Bulk Roll architectures.",
  backgroundStyle: 'light',
  updatedAt: new Date().toISOString()
};

export default function ProductsPage() {
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const productsQuery = useMemoFirebase(() => 
    query(collection(db, 'products'), where('status', '==', 'Active')), 
  [db]);
  const { data: allProducts, isLoading } = useCollection<ProductTemplate>(productsQuery);

  // Fetch Catalog Header Settings
  const catalogRef = useMemoFirebase(() => doc(db, 'settings', 'catalog'), [db]);
  const { data: catalogData } = useDoc<CatalogSettings>(catalogRef);

  const catalog = catalogData || DEFAULT_CATALOG;

  const collections = useMemo(() => {
    if (!allProducts) return {};
    return allProducts.reduce((acc, product) => {
      const cat = product.category || 'Specialty Prints';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(product);
      return acc;
    }, {} as Record<string, ProductTemplate[]>);
  }, [allProducts]);

  if (!isMounted) return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <main className="container max-w-[1600px] mx-auto py-12 px-4 md:py-20">
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      
      {/* SLIM FULL-WIDTH DYNAMIC HEADER */}
      <section className={cn(
        "w-full py-8 md:py-10 border-b relative overflow-hidden transition-colors duration-700",
        catalog.backgroundStyle === 'dark' ? "bg-foreground text-background" : "bg-muted/10 text-foreground"
      )}>
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Package className="h-48 w-48" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:justify-between gap-6 max-w-[1600px] mx-auto text-center md:text-left">
            <div className="space-y-3 max-w-3xl">
              <div className={cn(
                "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.3em]",
                catalog.backgroundStyle === 'dark' ? "bg-white/5 border-white/10 text-primary" : "bg-primary/10 border-primary/20 text-primary"
              )}>
                <Sparkles className="h-3 w-3" /> {catalog.tagline}
              </div>
              <h1 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase italic leading-[0.9] text-foreground">
                {catalog.title.split(' ').map((word, i) => (
                  <React.Fragment key={i}>
                    {word === 'Catalog' ? <span className="text-primary">{word}</span> : word}{' '}
                  </React.Fragment>
                ))}
              </h1>
              <p className={cn(
                "text-sm md:text-base font-medium leading-relaxed italic opacity-80 max-w-xl mx-auto md:mx-0",
                catalog.backgroundStyle === 'dark' ? "text-muted-foreground" : "text-muted-foreground"
              )}>
                {catalog.description}
              </p>
            </div>
            {catalog.backgroundStyle === 'dark' && (
              <div className="hidden lg:block">
                <div className="h-24 w-24 rounded-full border-4 border-dashed border-primary/20 flex items-center justify-center animate-spin-slow">
                  <Scaling className="h-8 w-8 text-primary/40" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="container max-w-[1600px] mx-auto py-12 px-4 md:py-20">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Array(8).fill(0).map((_, i) => (
              <Card key={i} className="h-[400px] animate-pulse bg-muted/50 border-none rounded-[2rem]" />
            ))}
          </div>
        ) : Object.keys(collections).length === 0 ? (
          <div className="py-40 text-center space-y-10 opacity-30">
            <div className="h-32 w-32 rounded-[2.5rem] bg-muted flex items-center justify-center mx-auto border-4 border-dashed">
              <Scaling className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-black uppercase font-headline italic tracking-tighter text-foreground">Collections Synchronizing</h3>
              <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Our product architects are updating the active registry.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-24">
            {Object.entries(collections).map(([category, items]) => {
              return (
                <div key={category} className="space-y-10">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-foreground/5 pb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.4em] text-[10px] justify-center md:justify-start">
                        <Layers className="h-3 w-3" /> Verified Collection
                      </div>
                      <h2 className="text-3xl md:text-5xl font-black font-headline tracking-tighter uppercase italic leading-none text-center md:text-left text-foreground">{category}</h2>
                    </div>
                    <div className="text-center md:text-right">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">{items.length} Active Specs</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {items.map((product) => {
                      const isRoll = product.segment === 'Roll Printing' || product.uiTemplate === 'Rolls / DTF';
                      // Robust link generation: prioritize slug, fallback to unique id
                      const productHref = `/products/${product.slug && product.slug.trim() !== "" ? product.slug : product.id}`;
                      
                      if (isRoll) {
                        return (
                          <Link key={product.id} href={productHref} className="group block h-full">
                            <div 
                              className="h-full min-h-[400px] bg-[#0a0a0a] border border-white/10 rounded-[1.5rem] relative transition-all duration-500 hover:border-primary/50 group overflow-hidden flex flex-col justify-between p-10"
                              style={{ 
                                clipPath: 'polygon(0% 0%, 100% 0%, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0% 100%)' 
                              }}
                            >
                              <div className="space-y-8">
                                <h3 className="text-4xl md:text-5xl font-black font-headline uppercase leading-[0.85] tracking-tighter text-zinc-400 group-hover:text-primary transition-colors duration-500 italic">
                                  {product.name}
                                </h3>
                                
                                <div className="space-y-4">
                                  <div className="h-1 w-8 bg-zinc-800 group-hover:bg-primary transition-colors" />
                                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400 transition-colors leading-relaxed">
                                    {product.shortDescription || 'Technical Print Specification'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 text-zinc-700 group-hover:text-primary transition-colors">
                                <span className="text-2xl font-light opacity-30">[</span>
                                <ArrowRight className="h-6 w-6" />
                                <span className="text-2xl font-light opacity-30">]</span>
                              </div>

                              {/* Decorative corner cut accent */}
                              <div className="absolute bottom-0 right-0 w-10 h-10 pointer-events-none">
                                <div className="absolute bottom-0 right-0 w-[1px] h-[42px] bg-white/5 rotate-45 origin-bottom-right" />
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      return (
                        <Link key={product.id} href={productHref} className="group block h-full">
                          <Card className="h-full border-2 border-transparent transition-all duration-700 hover:border-primary/20 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-2 bg-card overflow-hidden rounded-[2rem]">
                            <CardContent className="p-0">
                              <div className="relative aspect-square bg-muted/5 flex items-center justify-center p-10">
                                {product.isFeatured && (
                                  <div className="absolute top-6 left-6 z-10">
                                    <Badge className="bg-primary text-white font-black h-10 w-10 rounded-full flex items-center justify-center p-0 shadow-xl animate-pulse">
                                      <Zap className="h-5 w-5 fill-current" />
                                    </Badge>
                                  </div>
                                )}
                                <div className="absolute top-6 right-6 z-10">
                                  <Badge variant="secondary" className="text-[7px] font-black uppercase tracking-widest px-2 h-5 rounded-full border bg-background/80 backdrop-blur-md">
                                    {product.segment}
                                  </Badge>
                                </div>
                                
                                <div className="relative w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out">
                                  {product.thumbnail ? (
                                    <Image 
                                      src={product.thumbnail} 
                                      alt={product.name} 
                                      fill
                                      className="object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.1)]"
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted/10 rounded-[1.5rem]">
                                      <Package className="h-16 w-16 text-muted-foreground/10" />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="p-8 text-center border-t-2 border-muted/30">
                                <h3 className="text-2xl font-black font-headline flex items-center justify-center gap-3 group-hover:text-primary transition-colors uppercase tracking-tight line-clamp-1 italic leading-none text-foreground">
                                  {product.name}
                                </h3>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-3 line-clamp-1 opacity-60">
                                  {product.shortDescription || 'Professional Engineering'}
                                </p>
                                <div className="pt-8">
                                  <div className="inline-flex items-center gap-3 bg-foreground text-background text-[9px] font-black uppercase tracking-[0.2em] px-6 py-3 rounded-xl group-hover:bg-primary group-hover:text-white transition-all shadow-md group-hover:gap-5">
                                    View Specification <ArrowRight className="h-3.5 w-3.5" />
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* RE-ARCHITECTED SLIM FULL-WIDTH CTA */}
      <section className="w-full bg-foreground text-background py-16 md:py-20 relative overflow-hidden border-y-4 border-primary/10 group mt-12">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-1000">
          <LayoutGrid className="h-64 w-64 rotate-12" />
        </div>
        <div className="container max-w-[1600px] mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left">
          <div className="space-y-4 max-w-2xl">
            <h3 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase italic leading-none">
              Custom <span className="text-primary">Society Quote</span>
            </h3>
            <p className="text-muted-foreground font-medium text-lg md:text-xl leading-relaxed italic opacity-80">
              Beyond the standard catalog. For high-volume contracts or complex manufacturing, contact the Lab technicians.
            </p>
          </div>
          <Button size="lg" className="h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-sm group-hover:gap-6 transition-all shadow-2xl shrink-0 w-full md:w-auto" asChild>
            <Link href="/contact">Message the Lab <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}