
'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { useCollection, useMemoFirebase, useFirestore, useUser, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, limit, orderBy, doc } from 'firebase/firestore';
import { BlogPost, BlogBlock, NewsletterSettings } from '@/lib/types';
import { 
  Loader2, 
  ChevronLeft, 
  Calendar, 
  User, 
  Tag, 
  Share2, 
  ArrowRight, 
  Zap,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const DEFAULT_NEWSLETTER: NewsletterSettings = {
  title: "Stay in the Print Cycle",
  description: "Join our private editorial registry for investigative design drops and technical print deep-dives.",
  buttonText: "Join —",
  placeholder: "Registry Email",
  updatedAt: new Date().toISOString()
};

const RenderBlock = ({ block }: { block: BlogBlock }) => {
  switch (block.type) {
    case 'text':
      return <div className="prose prose-neutral dark:prose-invert max-w-none mb-12 text-lg md:text-xl leading-relaxed whitespace-pre-wrap font-medium text-foreground/80 tracking-tight">{block.content}</div>;
    case 'image':
      if (!block.url) return null;
      return (
        <figure className="mb-16 space-y-6">
          <div className="relative aspect-video rounded-[2.5rem] overflow-hidden border-2 border-muted/10 shadow-xl">
            <img src={block.url} alt={block.caption || ""} className="object-cover w-full h-full" />
          </div>
          {block.caption && <figcaption className="text-center text-xs font-black uppercase tracking-[0.2em] text-muted-foreground italic px-8 opacity-60">{block.caption}</figcaption>}
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
        <div className="mb-16 aspect-video rounded-[2.5rem] overflow-hidden border-2 border-muted/10 bg-black shadow-xl">
          <iframe src={getEmbedUrl(block.url)} className="w-full h-full" allowFullScreen title="Society Media" />
        </div>
      );
    case 'poll':
      return (
        <div className="mb-16 p-10 md:p-16 bg-primary/5 border-2 border-primary/10 rounded-[3rem] space-y-8 shadow-inner relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.05]">
            <Zap className="h-24 w-24" />
          </div>
          <div className="space-y-2 relative z-10">
            <Badge className="bg-primary text-white text-[9px] font-black uppercase tracking-[0.2em] px-3 h-6">Member Consensus</Badge>
            <h4 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter leading-tight">{block.question}</h4>
          </div>
          <div className="grid gap-4 relative z-10">
            {block.options?.map(opt => (
              <Button key={opt.id} variant="outline" className="h-16 rounded-2xl border-2 justify-between px-8 font-black uppercase tracking-widest text-xs hover:bg-primary hover:text-white hover:border-primary transition-all">
                <span>{opt.label}</span>
                <span className="opacity-40 font-mono text-[10px]">{opt.votes} VOTES</span>
              </Button>
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
};

export default function BlogDetailPage(props: { params: Promise<{ slug: string }> }) {
  const params = React.use(props.params);
  const slug = params.slug;
  const db = useFirestore();
  const [isJoiningNewsletter, setIsJoiningNewsletter] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');

  const blogQuery = useMemoFirebase(() => 
    slug ? query(collection(db, 'blog_posts'), where('slug', '==', slug), limit(1)) : null
  , [db, slug]);

  const { data: posts, isLoading } = useCollection<BlogPost>(blogQuery);
  const post = posts?.[0];

  const nlRef = useMemoFirebase(() => doc(db, 'settings', 'newsletter'), [db]);
  const { data: newsletterData } = useDoc<NewsletterSettings>(nlRef);
  const newsletter = newsletterData || DEFAULT_NEWSLETTER;

  const handleJoinNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setIsJoiningNewsletter(true);

    try {
      await addDocumentNonBlocking(collection(db, 'newsletter_subscribers'), {
        email: newsletterEmail.trim().toLowerCase(),
        source: `blog_detail:${slug}`,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Welcome to the Registry", description: "You've been added to the Society mailing list." });
      setNewsletterEmail('');
    } catch (e) {
      // Error handled by global listener
    } finally {
      setIsJoiningNewsletter(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">Retrieving Dispatch State...</p>
    </div>
  );

  if (!post) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-8">
        <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mx-auto border-4 border-dashed animate-pulse">
          <Tag className="h-10 w-10 text-muted-foreground opacity-20" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-foreground">Dispatch Archived</h1>
          <p className="text-muted-foreground max-md mx-auto font-medium text-lg leading-relaxed opacity-70 italic">This investigative entry is currently unavailable in the public registry.</p>
        </div>
        <Button asChild className="h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-xs">
          <Link href="/blog">Return to Dispatch Feed —</Link>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background font-body">
      <Header />
      
      {post.featuredImage && (
        <div className="w-full aspect-[21/9] relative bg-muted border-b overflow-hidden">
          <Image src={post.featuredImage} alt={post.title} fill className="object-cover" priority unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
        </div>
      )}

      <main className="flex-1 container max-w-6xl mx-auto px-4 py-12 md:py-20">
        <div className={cn("space-y-12 mb-20", !post.featuredImage && "mt-12 md:mt-24")}>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild className="rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-primary/5 h-9 px-4 transition-all">
              <Link href="/blog"><ChevronLeft className="mr-2 h-3.5 w-3.5" /> Editorial Dispatch</Link>
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Entry ID: {post.id.slice(0, 8)}</span>
              <Separator orientation="vertical" className="h-3 bg-foreground/10" />
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 border transition-all hover:bg-primary hover:text-white">
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-8 max-w-4xl">
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <Badge key={tag} className="bg-primary text-white border-none font-black text-[9px] uppercase tracking-[0.2em] px-4 py-1 shadow-lg shadow-primary/20">
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="text-4xl md:text-7xl font-black font-headline tracking-tighter uppercase italic leading-[0.8] text-foreground">
              {post.title}
            </h1>
            <p className="text-xl md:text-2xl font-medium text-muted-foreground italic leading-relaxed line-clamp-3 opacity-80">
              {post.excerpt}
            </p>
          </div>

          <Separator className="bg-foreground/5" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground leading-none opacity-60">Verified Author</p>
                <p className="text-lg font-black uppercase italic tracking-tight">{post.authorName}</p>
              </div>
            </div>
            <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              <span className="flex items-center gap-3"><Calendar className="h-4 w-4 text-primary" /> {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5" /> Guide ID: {post.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>

        <article className="max-w-3xl mx-auto relative pb-24">
          {post.content?.map(block => (
            <RenderBlock key={block.id} block={block} />
          ))}
        </article>
      </main>

      <section className="w-full bg-foreground text-background py-16 relative overflow-hidden border-y-4 border-primary/10 group mt-20">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110" style={{ transitionDuration: '2000ms' }}>
          <BookOpen className="h-[300px] w-[300px] rotate-12" />
        </div>
        <div className="container max-w-6xl mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left max-w-2xl">
            <h3 className="text-3xl md:text-5xl font-black font-headline tracking-tighter uppercase italic leading-[0.9]">
              {newsletter.title}
            </h3>
            <p className="text-muted-foreground font-medium text-base md:text-lg leading-relaxed italic opacity-80">
              {newsletter.description}
            </p>
          </div>
          <form onSubmit={handleJoinNewsletter} className="flex flex-col sm:flex-row gap-4 w-full md:w-auto max-w-md">
            <Input 
              required
              type="email"
              placeholder={newsletter.placeholder} 
              className="h-14 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30 text-base px-6 focus-visible:border-primary transition-all shadow-inner w-full sm:w-64" 
              value={newsletterEmail}
              onChange={e => setNewsletterEmail(e.target.value)}
            />
            <Button 
              type="submit"
              disabled={isJoiningNewsletter}
              className="h-14 px-8 rounded-xl font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-background transition-all text-sm shadow-xl whitespace-nowrap"
            >
              {isJoiningNewsletter ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{newsletter.buttonText}</>}
            </Button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
}
