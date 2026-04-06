'use client';

import React from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { useCollection, useMemoFirebase, useFirestore, useUser, useDoc } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { HelpArticle, BlogBlock } from '@/lib/types';
import { Loader2, ChevronLeft, BookOpen, Clock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const RenderBlock = ({ block }: { block: BlogBlock }) => {
  switch (block.type) {
    case 'text':
      return <div className="prose prose-neutral dark:prose-invert max-w-none mb-10 text-lg leading-relaxed whitespace-pre-wrap">{block.content}</div>;
    case 'image':
      if (!block.url) return null;
      return (
        <figure className="mb-10 space-y-3">
          <div className="relative aspect-video rounded-[2rem] overflow-hidden border-2 shadow-sm">
            <img src={block.url} alt={block.caption || ""} className="object-cover w-full h-full" />
          </div>
          {block.caption && <figcaption className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground italic">{block.caption}</figcaption>}
        </figure>
      );
    case 'video':
      if (!block.url) return null;
      const getEmbedUrl = (url: string) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          const id = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();
          return `https://www.youtube.com/embed/${id}`;
        }
        return url;
      };
      return (
        <div className="mb-10 aspect-video rounded-[2rem] overflow-hidden border-2 bg-black shadow-xl">
          <iframe src={getEmbedUrl(block.url)} className="w-full h-full" allowFullScreen />
        </div>
      );
    default:
      return null;
  }
};

export default function HelpArticlePage(props: { params: Promise<{ slug: string }> }) {
  const resolvedParams = React.use(props.params);
  const slug = resolvedParams.slug;
  const db = useFirestore();
  const { user } = useUser();

  // Check if user is staff for draft preview
  const roleRef = useMemoFirebase(() => (user ? doc(db, 'roles', user.uid) : null), [db, user]);
  const { data: roleData } = useDoc<any>(roleRef);
  const isStaff = !!roleData?.role || user?.uid === 'Iit0JbEKytRkn35p4K0Rat6z4SE3';

  const articleQuery = useMemoFirebase(() => 
    slug ? query(collection(db, 'help_articles'), where('slug', '==', slug), limit(1)) : null
  , [db, slug]);

  const { data: articles, isLoading } = useCollection<HelpArticle>(articleQuery);
  const article = articles?.[0];

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  // If article is draft and user is not staff, treat as 404
  if (!article || (article.status !== 'Published' && !isStaff)) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
          <BookOpen className="h-10 w-10 text-muted-foreground opacity-20" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">Guide Not Found</h1>
          <p className="text-muted-foreground max-w-xs mx-auto">This guide might have been archived or is still being drafted by the Society.</p>
        </div>
        <Button variant="outline" className="rounded-xl px-8 font-bold uppercase tracking-widest text-xs" asChild>
          <Link href="/help">Return to Help Center</Link>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background font-body">
      <Header />
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-12 md:py-20">
        <div className="mb-16 space-y-8">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild className="hover:bg-primary/5 rounded-xl font-bold uppercase tracking-widest text-[10px]">
              <Link href="/help"><ChevronLeft className="mr-2 h-3.5 w-3.5" /> All Guides</Link>
            </Button>
            {article.status !== 'Published' && (
              <Badge variant="outline" className="border-amber-500 text-amber-600 font-black uppercase tracking-tighter h-6">
                <ShieldCheck className="mr-1 h-3 w-3" /> Admin Preview
              </Badge>
            )}
          </div>
          
          <div className="space-y-6">
            <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-widest px-3 py-1">
              {article.category}
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black font-headline tracking-tighter uppercase italic leading-[0.9] text-foreground">
              {article.title}
            </h1>
            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <span className="flex items-center gap-3"><Clock className="h-3.5 w-3.5" /> Updated {new Date(article.updatedAt).toLocaleDateString()}</span>
              <span className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5" /> Guide ID: {article.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>

        <article className="max-w-none">
          {article.content?.map(block => (
            <RenderBlock key={block.id} block={block} />
          ))}
        </article>

        {article.keywords?.length > 0 && (
          <div className="mt-20 pt-10 border-t-2 border-dashed flex flex-wrap gap-2">
            {article.keywords.map(kw => (
              <Badge key={kw} variant="secondary" className="text-[9px] uppercase font-black tracking-widest px-3">#{kw}</Badge>
            ))}
          </div>
        )}

        <section className="mt-24 p-10 bg-muted/10 border-2 rounded-[2.5rem] text-center space-y-6">
          <h3 className="text-2xl font-black uppercase italic tracking-tight">Still Need Assistance?</h3>
          <p className="text-muted-foreground font-medium max-w-md mx-auto">
            If this guide didn't resolve your issue, open a resolution thread with our lab technicians.
          </p>
          <Button className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px]" asChild>
            <Link href="/contact">Open Support Ticket —</Link>
          </Button>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
