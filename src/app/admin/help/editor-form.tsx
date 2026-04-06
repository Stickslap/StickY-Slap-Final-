
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, 
  Trash, 
  Plus, 
  Image as ImageIcon, 
  Type, 
  Video, 
  ChevronUp, 
  ChevronDown,
  BookOpen,
  ArrowLeft,
  Layout,
  Settings,
  Eye,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { HelpArticle, BlogBlock } from '@/lib/types';
import { useFirestore, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface HelpEditorProps {
  initialData?: Partial<HelpArticle>;
  isNew?: boolean;
}

const CATEGORIES = ['Ordering', 'Shipping', 'Artwork', 'Products', 'Account'];

const DEFAULT_BLOCKS: BlogBlock[] = [
  { id: 'initial-text', type: 'text', content: 'Describe how this feature works...' }
];

const DEFAULT_ARTICLE: Partial<HelpArticle> = {
  title: '',
  slug: '',
  category: 'Ordering',
  status: 'Draft',
  content: DEFAULT_BLOCKS,
  keywords: [],
};

export function HelpEditorForm({ initialData, isNew }: HelpEditorProps) {
  const router = useRouter();
  const db = useFirestore();
  const [data, setData] = useState<Partial<HelpArticle>>(initialData || DEFAULT_ARTICLE);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = () => {
    if (!data.title) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const updatedData = {
      ...data,
      updatedAt: new Date().toISOString(),
      slug: data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
    };

    if (isNew) {
      addDocumentNonBlocking(collection(db, 'help_articles'), {
        ...updatedData,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Article Created" });
    } else if (data.id) {
      setDocumentNonBlocking(doc(db, 'help_articles', data.id), updatedData, { merge: true });
      toast({ title: "Article Updated" });
    }
    
    setTimeout(() => {
      setIsLoading(false);
      router.push('/admin/help');
    }, 500);
  };

  const addBlock = (type: 'text' | 'image' | 'video') => {
    const id = Math.random().toString(36).substr(2, 9);
    let newBlock: BlogBlock;

    switch (type) {
      case 'text': newBlock = { id, type: 'text', content: '' }; break;
      case 'image': newBlock = { id, type: 'image', url: '', caption: '' }; break;
      case 'video': newBlock = { id, type: 'video', url: '', provider: 'youtube' }; break;
      default: return;
    }

    setData({ ...data, content: [...(data.content || []), newBlock] });
  };

  const removeBlock = (id: string) => {
    setData({ ...data, content: data.content?.filter(b => b.id !== id) });
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (!data.content) return;
    const newBlocks = [...data.content];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setData({ ...data, content: newBlocks });
  };

  const updateBlock = (id: string, updates: Partial<BlogBlock>) => {
    setData({
      ...data,
      content: data.content?.map(b => b.id === id ? { ...b, ...updates } as any : b)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between sticky top-16 bg-background/95 backdrop-blur z-20 py-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{isNew ? 'New Help Article' : `Editing Article`}</h2>
            <p className="text-xs text-muted-foreground">Managing Knowledge Base documentation.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && data.slug && (
            <Button variant="outline" asChild>
              <Link href={`/help/${data.slug}`} target="_blank">
                <Eye className="mr-2 h-4 w-4" />
                View Article
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => router.back()}>Discard</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Saving...' : (isNew ? 'Create Article' : 'Update Article')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <Input 
                className="text-3xl font-bold border-none px-0 focus-visible:ring-0 placeholder:opacity-30" 
                placeholder="How to prepare artwork..."
                value={data.title}
                onChange={e => setData({...data, title: e.target.value})}
              />
              <Input 
                className="text-sm font-mono text-muted-foreground border-none px-0 h-6 focus-visible:ring-0" 
                placeholder="url-slug-auto-generated"
                value={data.slug}
                onChange={e => setData({...data, slug: e.target.value})}
              />
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-6">
                {data.content?.map((block, idx) => (
                  <div key={block.id} className="group relative border border-transparent hover:border-muted rounded-lg p-2 transition-all">
                    <div className="absolute -left-10 top-2 opacity-0 group-hover:opacity-100 flex flex-col gap-1 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveBlock(idx, 'up')} disabled={idx === 0}>
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeBlock(block.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveBlock(idx, 'down')} disabled={idx === (data.content?.length || 0) - 1}>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>

                    {block.type === 'text' && (
                      <Textarea 
                        className="border-none focus-visible:ring-0 text-lg leading-relaxed min-h-[100px] resize-none overflow-hidden" 
                        placeholder="Explain the process here..."
                        value={block.content}
                        onChange={e => updateBlock(block.id, { content: e.target.value })}
                      />
                    )}

                    {block.type === 'image' && (
                      <div className="space-y-2">
                        <div className="aspect-video bg-muted rounded-md flex items-center justify-center relative overflow-hidden">
                          {block.url ? (
                            <img src={block.url} alt="Block" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Paste reference image URL..." 
                            value={block.url} 
                            onChange={e => updateBlock(block.id, { url: e.target.value })}
                          />
                          <Input 
                            placeholder="Caption..." 
                            value={block.caption} 
                            onChange={e => updateBlock(block.id, { caption: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    {block.type === 'video' && (
                      <div className="space-y-2 p-4 bg-muted/20 rounded-md">
                        <div className="flex items-center gap-2 mb-2">
                          <Video className="h-4 w-4 text-primary" />
                          <span className="text-xs font-bold uppercase tracking-widest">Support Video</span>
                        </div>
                        <div className="flex gap-2">
                          <Select 
                            value={block.provider} 
                            onValueChange={v => updateBlock(block.id, { provider: v as any })}
                          >
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="youtube">YouTube</SelectItem>
                              <SelectItem value="vimeo">Vimeo</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input 
                            placeholder="Enter video URL..." 
                            value={block.url} 
                            onChange={e => updateBlock(block.id, { url: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-4 py-8 border-2 border-dashed rounded-xl bg-muted/10">
                <Button variant="secondary" size="sm" onClick={() => addBlock('text')}>
                  <Type className="h-4 w-4 mr-2" /> Text
                </Button>
                <Button variant="secondary" size="sm" onClick={() => addBlock('image')}>
                  <ImageIcon className="h-4 w-4 mr-2" /> Image
                </Button>
                <Button variant="secondary" size="sm" onClick={() => addBlock('video')}>
                  <Video className="h-4 w-4 mr-2" /> Video
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Publication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={data.status} onValueChange={v => setData({...data, status: v as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={data.category} onValueChange={v => setData({...data, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Search Optimization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Keywords (Comma separated)</Label>
                <Input 
                  placeholder="resolution, dpi, bleed..." 
                  value={data.keywords?.join(', ')}
                  onChange={e => setData({...data, keywords: e.target.value.split(',').map(t => t.trim()).filter(t => !!t)})}
                />
              </div>
              <Separator />
              <div className="text-xs space-y-1 text-muted-foreground italic">
                <p>Last Edit: {new Date().toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full" size="lg" asChild disabled={!data.slug}>
            <Link href={`/help/${data.slug}`} target="_blank">
              <Eye className="mr-2 h-4 w-4" /> Preview Help Center
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
