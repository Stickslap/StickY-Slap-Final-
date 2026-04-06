'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { useCollection, useMemoFirebase, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, orderBy, limit, doc } from 'firebase/firestore';
import { BlogPost, BlogSettings } from '@/lib/types';
import { Loader2, ArrowRight, Calendar, User, Tag, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const DEFAULT_BLOG_SETTINGS: BlogSettings = {
  title: "Industry Journal",
  tagline: "The Society Dispatch",
  description: "Exploring the technical intersection of high-precision design, adhesive sciences, and professional brand logistics.",
  backgroundStyle: 'light',
  updatedAt: new Date().toISOString()
};

export default function BlogIndexPage() {
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch published blog posts, ordered by date
  const blogQuery = useMemoFirebase(() => 
    query(
      collection(db, 'blog_posts'), 
      where('status', '==', 'Published'), 
      orderBy('createdAt', 'desc'),
      limit(20)
    )
  , [db]);

  const { data: posts, isLoading } = useCollection<BlogPost>(blogQuery);

  // Fetch Blog Header Settings
  const blogSettingsRef = useMemoFirebase(() => doc(db, 'settings', 'blog'), [db]);
  const { data: blogSettingsData } = useDoc<BlogSettings>(blogSettingsRef);

  const blogSettings = blogSettingsData || DEFAULT_BLOG_SETTINGS;

  const featured = posts?.[0];
  const grid = posts?.slice(1) || [];

  if (!isMounted) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background font-body" suppressHydrationWarning>
      <Header />
      
      {/* SLIM FULL-WIDTH DYNAMIC HEADER */}
      <section className={cn(
        "w-full py-8 md:py-10 border-b relative overflow-hidden transition-colors duration-700",
        blogSettings.backgroundStyle === 'dark' ? "bg-foreground text-background" : "bg-muted/10 text-foreground"
      )}>
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <BookOpen className="h-48 w-48" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:justify-between gap-6 max-w-7xl mx-auto text-center md:text-left">
            <div className="space-y-3 max-w-3xl">
              <div className={cn(
                "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.3em]",
                blogSettings.backgroundStyle === 'dark' ? "bg-white/5 border-white/10 text-primary" : "bg-primary/10 border-primary/20 text-primary"
              )}>
                <Sparkles className="h-3 w-3" /> {blogSettings.tagline}
              </div>
              <h1 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase italic leading-[0.9]">
                {blogSettings.title.split(' ').map((word, i) => (
                  <React.Fragment key={i}>
                    {word === 'Journal' ? <span className="text-primary">{word}</span> : word}{' '}
                  </React.Fragment>
                ))}
              </h1>
              <p className={cn(
                "text-sm md:text-base font-medium leading-relaxed italic opacity-80 max-w-xl mx-auto md:mx-0",
                blogSettings.backgroundStyle === 'dark' ? "text-muted-foreground" : "text-muted-foreground"
              )}>
                {blogSettings.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 container max-w-6xl mx-auto px-4 py-12 md:py-16">
        {isLoading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="flex flex-col items-center gap-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Syncing Archives...</p>
            </div>
          </div>
        ) : !posts || posts.length === 0 ? (
          <div className="py-40 text-center space-y-10 opacity-30">
            <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center mx-auto border-4 border-dashed">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-black uppercase italic tracking-tighter">Archives Locked</h3>
              <p className="text-sm font-medium uppercase tracking-widest">Our editorial collective is currently drafting new entries.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-24 md:space-y-32">
            {/* Featured Impact Block */}
            {featured && (
              <Link href={`/blog/${featured.slug}`} className="block group">
                <Card className="border-none shadow-none bg-transparent overflow-hidden">
                  <div className="grid lg:grid-cols-12 gap-12 items-center">
                    <div className="lg:col-span-7 relative aspect-[16/10] rounded-[2.5rem] overflow-hidden border-2 shadow-2xl transition-all duration-1000 group-hover:scale-[1.01] group-hover:shadow-primary/10">
                      <Image 
                        src={featured.featuredImage || "https://picsum.photos/seed/editorial-1/1200/800"} 
                        alt={featured.title} 
                        fill 
                        className="object-cover transition-transform duration-1000 group-hover:scale-105"
                        priority
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    </div>
                    <div className="lg:col-span-5 space-y-8">
                      <div className="flex flex-wrap gap-2">
                        {featured.tags.map(tag => (
                          <Badge key={tag} className="bg-primary text-white border-none font-black text-[10px] uppercase tracking-[0.2em] px-4 py-1 shadow-lg shadow-primary/20">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="space-y-6">
                        <h2 className="text-5xl md:text-7xl font-black font-headline tracking-tighter uppercase italic leading-[0.85] group-hover:text-primary transition-colors duration-500 text-foreground">
                          {featured.title}
                        </h2>
                        <p className="text-xl text-muted-foreground font-medium italic leading-relaxed line-clamp-3 opacity-80">
                          {featured.excerpt}
                        </p>
                      </div>
                      <div className="flex items-center gap-8 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground border-t-2 pt-8 border-foreground/5">
                        <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-primary" /> {new Date(featured.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        <span className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-primary" /> {featured.authorName}</span>
                      </div>
                      <Button className="h-16 px-10 rounded-2xl font-black uppercase tracking-widest text-lg group-hover:gap-6 transition-all bg-foreground text-background hover:bg-primary hover:text-white shadow-xl">
                        Open Dispatch — <ArrowRight className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </Link>
            )}

            {/* Structured Grid: Investigation Archives */}
            {grid.length > 0 && (
              <div className="space-y-16">
                <div className="flex items-center gap-8">
                  <h3 className="text-3xl font-black uppercase italic tracking-tighter shrink-0 text-foreground">Recent Archives</h3>
                  <div className="flex-1 h-px bg-foreground/10" />
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16">
                  {grid.map(post => (
                    <Link key={post.id} href={`/blog/${post.slug}`} className="block group h-full">
                      <Card className="h-full border-none shadow-none bg-transparent flex flex-col space-y-8">
                        <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden border-2 shadow-lg transition-all duration-700 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:border-primary/20">
                          <Image 
                            src={post.featuredImage || `https://picsum.photos/seed/${post.slug}/800/600`} 
                            alt={post.title} 
                            fill 
                            className="object-cover transition-transform duration-1000 group-hover:scale-110"
                            unoptimized
                          />
                          <div className="absolute top-4 right-4">
                            <Badge className="bg-background/95 backdrop-blur-xl text-foreground border-2 border-foreground/5 font-black text-[8px] uppercase tracking-[0.2em] h-7 px-3 rounded-xl">
                              {post.tags[0] || 'Entry'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex-1 space-y-4 px-1">
                          <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                            <span className="opacity-60">{post.authorName}</span>
                          </div>
                          <h3 className="text-3xl font-black uppercase tracking-tight italic group-hover:text-primary transition-colors duration-500 line-clamp-2 leading-[0.9] text-foreground">
                            {post.title}
                          </h3>
                          <p className="text-base text-muted-foreground font-medium line-clamp-2 leading-relaxed italic opacity-70">
                            {post.excerpt}
                          </p>
                        </div>
                        <div className="pt-2 px-1 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-foreground group-hover:text-primary group-hover:gap-5 transition-all">
                          Full Investigation <ArrowRight className="h-4 w-4" />
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}