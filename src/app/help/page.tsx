'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { HelpArticle } from '@/lib/types';
import { Search, BookOpen, ChevronRight, HelpCircle, LayoutGrid, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function HelpCenterIndex() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const articlesQuery = useMemoFirebase(() => 
    query(collection(db, 'help_articles'), where('status', '==', 'Published'), orderBy('updatedAt', 'desc'))
  , [db]);

  const { data: articles, isLoading } = useCollection<HelpArticle>(articlesQuery);

  const filtered = articles?.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.keywords?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const categories = Array.from(new Set(articles?.map(a => a.category) || []));

  // Prevent hydration mismatch
  if (!isMounted) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background font-body">
      <Header />
      
      <section className="w-full py-8 md:py-10 bg-muted/10 border-b relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <HelpCircle className="h-48 w-48" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:justify-between gap-8 max-w-7xl mx-auto text-center md:text-left">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-[0.3em] mx-auto md:mx-0">
                <BookOpen className="h-3 w-3" /> The Society Knowledge Base
              </div>
              <h1 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase italic leading-none text-foreground">
                How Can We <span className="text-primary">Assist?</span>
              </h1>
            </div>
            <div className="relative w-full max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search guide categories or keywords..." 
                className="h-12 pl-10 pr-4 rounded-xl border-2 text-sm shadow-lg group-focus-within:border-primary transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 container max-w-6xl mx-auto px-4 py-16 md:py-24">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <Card key={i} className="h-48 rounded-[2rem] border-none bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-24">
            {categories.length > 0 ? categories.map(cat => {
              const catArticles = filtered?.filter(a => a.category === cat) || [];
              if (catArticles.length === 0) return null;

              return (
                <div key={cat} className="space-y-8">
                  <div className="flex flex-col sm:flex-row items-center gap-4 border-b-2 border-foreground/5 pb-4 text-center sm:text-left">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <LayoutGrid className="h-5 w-5" />
                    </div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tight">{cat}</h2>
                    <Badge variant="secondary" className="sm:ml-auto font-black h-6">{catArticles.length} Guides</Badge>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {catArticles.map(article => (
                      <Link key={article.id} href={`/help/${article.slug}`}>
                        <Card className="group border-2 rounded-3xl hover:border-primary/20 hover:shadow-xl transition-all h-full bg-card">
                          <CardContent className="p-8 space-y-4">
                            <h3 className="text-xl font-black uppercase tracking-tight group-hover:text-primary transition-colors leading-tight">
                              {article.title}
                            </h3>
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                Updated {new Date(article.updatedAt).toLocaleDateString()}
                              </span>
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                <ChevronRight className="h-4 w-4" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }) : (
              <div className="py-20 text-center space-y-6 opacity-40">
                <Search className="h-16 w-16 mx-auto" />
                <p className="text-xl font-black uppercase italic">No matching guides found</p>
                <Button variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-xs" onClick={() => setSearchTerm('')}>
                  Clear Search Filter
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
