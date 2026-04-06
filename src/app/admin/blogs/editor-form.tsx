
'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, 
  Trash, 
  Plus, 
  Image as ImageIcon, 
  Type, 
  Video, 
  BarChart2, 
  GripVertical, 
  ChevronUp, 
  ChevronDown,
  Layout,
  Globe,
  Settings,
  Eye,
  ArrowLeft,
  ArrowRight,
  Upload,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { BlogPost, BlogBlock } from '@/lib/types';
import { useFirestore, setDocumentNonBlocking, addDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface BlogEditorProps {
  initialData?: Partial<BlogPost>;
  isNew?: boolean;
}

const CLOUDINARY_CLOUD_NAME = "dabgothkm";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_upload";

const DEFAULT_BLOCKS: BlogBlock[] = [
  { id: 'initial-text', type: 'text', content: 'Start writing your amazing story here...' }
];

const DEFAULT_POST: Partial<BlogPost> = {
  title: '',
  slug: '',
  status: 'Draft',
  excerpt: '',
  content: DEFAULT_BLOCKS,
  tags: [],
};

export function BlogEditorForm({ initialData, isNew }: BlogEditorProps) {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const blockImageInputRef = useRef<HTMLInputElement>(null);
  
  const [data, setData] = useState<Partial<BlogPost>>(initialData || DEFAULT_POST);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);

  const handleSave = () => {
    if (!data.title) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const updatedData = {
      ...data,
      authorId: user?.uid || 'anonymous',
      authorName: user?.displayName || 'Staff Member',
      updatedAt: new Date().toISOString(),
      slug: data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
    };

    if (isNew) {
      addDocumentNonBlocking(collection(db, 'blog_posts'), {
        ...updatedData,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Post Created", description: "Your article is now live in the system." });
    } else if (data.id) {
      setDocumentNonBlocking(doc(db, 'blog_posts', data.id), updatedData, { merge: true });
      toast({ title: "Post Saved", description: "Changes updated successfully." });
    }
    
    setTimeout(() => {
      setIsLoading(false);
      router.push('/admin/blogs');
    }, 500);
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'blog_banners');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress((event.loaded / event.total) * 100);
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        setData(prev => ({ ...prev, featuredImage: response.secure_url }));
        toast({ title: "Banner Uploaded", description: "Identity asset synchronized." });
      } else {
        toast({ title: "Upload Failed", variant: "destructive" });
      }
      setUploadProgress(null);
      setIsUploadingBanner(false);
    };

    xhr.onerror = () => {
      toast({ title: "Network Error", variant: "destructive" });
      setUploadProgress(null);
      setIsUploadingBanner(false);
    };

    xhr.send(formData);
  };

  const handleBlockImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingBlockId) return;

    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'blog_content');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress((event.loaded / event.total) * 100);
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        updateBlock(uploadingBlockId, { url: response.secure_url });
        toast({ title: "Image Uploaded" });
      } else {
        toast({ title: "Upload Failed", variant: "destructive" });
      }
      setUploadProgress(null);
      setUploadingBlockId(null);
    };

    xhr.onerror = () => {
      toast({ title: "Network Error", variant: "destructive" });
      setUploadProgress(null);
      setUploadingBlockId(null);
    };

    xhr.send(formData);
  };

  const addBlock = (type: BlogBlock['type']) => {
    const id = Math.random().toString(36).substr(2, 9);
    let newBlock: BlogBlock;

    switch (type) {
      case 'text': newBlock = { id, type: 'text', content: '' }; break;
      case 'image': newBlock = { id, type: 'image', url: '', caption: '' }; break;
      case 'video': newBlock = { id, type: 'video', url: '', provider: 'youtube' }; break;
      case 'poll': newBlock = { id, type: 'poll', question: 'What do you think?', options: [
        { id: 'opt1', label: 'Option A', votes: 0 },
        { id: 'opt2', label: 'Option B', votes: 0 }
      ] }; break;
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
            <h2 className="text-2xl font-bold">{isNew ? 'New Blog Post' : `Editing Post`}</h2>
            <p className="text-xs text-muted-foreground">Drafting content for PrintProof Blog.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && data.slug && (
            <Button variant="outline" asChild>
              <Link href={`/blog/${data.slug}`} target="_blank">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => router.back()}>Discard</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? 'Saving...' : (isNew ? 'Create Post' : 'Update Post')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="pb-4 px-0">
              <Input 
                className="text-4xl font-black font-headline tracking-tighter uppercase italic border-none px-0 focus-visible:ring-0 placeholder:opacity-30 h-auto py-2" 
                placeholder="Article Title"
                value={data.title}
                onChange={e => setData({...data, title: e.target.value})}
              />
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <Globe className="h-3 w-3" />
                <span>/blog/</span>
                <Input 
                  className="text-xs font-mono border-none px-0 h-6 focus-visible:ring-0 w-full" 
                  placeholder="url-slug-auto-generated"
                  value={data.slug}
                  onChange={e => setData({...data, slug: e.target.value})}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-12 px-0 py-8">
              <div className="space-y-12">
                <input type="file" ref={blockImageInputRef} className="hidden" onChange={handleBlockImageUpload} accept="image/*" />
                {data.content?.map((block, idx) => (
                  <div key={block.id} className="group relative border-l-2 border-transparent hover:border-primary/20 pl-6 transition-all">
                    <div className="absolute -left-12 top-0 opacity-0 group-hover:opacity-100 flex flex-col gap-1 transition-opacity">
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
                        className="border-none focus-visible:ring-0 text-xl leading-relaxed min-h-[600px] resize-y px-0 bg-transparent placeholder:italic overflow-visible" 
                        placeholder="Once upon a time in a print shop..."
                        value={block.content}
                        onChange={e => updateBlock(block.id, { content: e.target.value })}
                      />
                    )}

                    {block.type === 'image' && (
                      <div className="space-y-4">
                        <div 
                          className="aspect-video bg-muted rounded-[2rem] flex items-center justify-center relative overflow-hidden border-2 shadow-sm cursor-pointer group/img"
                          onClick={() => { setUploadingBlockId(block.id); blockImageInputRef.current?.click(); }}
                        >
                          {block.url ? (
                            <img src={block.url} alt="Block" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Click to Upload</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            {uploadingBlockId === block.id && uploadProgress !== null ? (
                              <div className="w-32 space-y-2">
                                <Loader2 className="h-6 w-6 animate-spin text-white mx-auto" />
                                <Progress value={uploadProgress} className="h-1 bg-white/20" />
                              </div>
                            ) : (
                              <>
                                <Upload className="h-8 w-8 text-white" />
                                <span className="text-[10px] font-black uppercase text-white tracking-widest">Replace Asset</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="grid gap-3">
                          <Input 
                            placeholder="Paste photo URL..." 
                            value={block.url} 
                            onChange={e => updateBlock(block.id, { url: e.target.value })}
                            className="h-10 rounded-xl bg-muted/10"
                          />
                          <Input 
                            placeholder="Add a technical caption..." 
                            value={block.caption} 
                            onChange={e => updateBlock(block.id, { caption: e.target.value })}
                            className="h-10 rounded-xl bg-muted/10 italic text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {block.type === 'video' && (
                      <div className="space-y-4 p-8 bg-muted/10 rounded-[2.5rem] border-2">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Video className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest">Video Narrative</span>
                        </div>
                        <div className="grid gap-3">
                          <Select 
                            value={block.provider} 
                            onValueChange={v => updateBlock(block.id, { provider: v as any })}
                          >
                            <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="youtube">YouTube</SelectItem>
                              <SelectItem value="vimeo">Vimeo</SelectItem>
                              <SelectItem value="tiktok">TikTok</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input 
                            placeholder="Enter video URL..." 
                            value={block.url} 
                            onChange={e => updateBlock(block.id, { url: e.target.value })}
                            className="h-10 rounded-xl"
                          />
                        </div>
                      </div>
                    )}

                    {block.type === 'poll' && (
                      <div className="p-10 bg-primary/5 border-2 border-primary/10 rounded-[3rem] space-y-6">
                        <div className="flex items-center gap-3">
                          <BarChart2 className="h-6 w-6 text-primary" />
                          <Input 
                            className="bg-transparent border-none font-black text-2xl focus-visible:ring-0 p-0 h-auto uppercase italic tracking-tight" 
                            placeholder="Consensus Question..."
                            value={block.question || ''}
                            onChange={e => updateBlock(block.id, { question: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-3">
                          {block.options?.map((opt, oIdx) => (
                            <div key={opt.id} className="flex gap-2">
                              <Input 
                                className="bg-background h-12 rounded-xl px-6 font-bold" 
                                value={opt.label}
                                onChange={e => {
                                  const newOpts = [...(block.options || [])];
                                  newOpts[oIdx].label = e.target.value;
                                  updateBlock(block.id, { options: newOpts });
                                }}
                              />
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-12 w-12 text-destructive hover:bg-destructive/10 rounded-xl"
                                onClick={() => {
                                  const newOpts = (block.options || []).filter(o => o.id !== opt.id);
                                  updateBlock(block.id, { options: newOpts });
                                }}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full h-12 rounded-xl border-dashed font-black uppercase text-[10px] tracking-widest mt-2"
                            onClick={() => {
                              const newOpts = [...(block.options || []), { id: Math.random().toString(), label: 'New Choice', votes: 0 }];
                              updateBlock(block.id, { options: newOpts });
                            }}
                          >
                            <Plus className="h-3 w-3 mr-2" /> Add Choice —
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="py-16 px-8 border-2 border-dashed rounded-[3rem] bg-muted/5 space-y-8 mt-12">
                <div className="text-center space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Editor Tools</h4>
                  <p className="text-xl font-black uppercase italic tracking-tighter">Append content module</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                  <button 
                    onClick={() => addBlock('text')}
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-background border-2 border-transparent hover:border-primary/30 hover:shadow-xl transition-all group"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Type className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Narrative</span>
                  </button>
                  <button 
                    onClick={() => addBlock('image')}
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-background border-2 border-transparent hover:border-primary/30 hover:shadow-xl transition-all group"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ImageIcon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Visual</span>
                  </button>
                  <button 
                    onClick={() => addBlock('video')}
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-background border-2 border-transparent hover:border-primary/30 hover:shadow-xl transition-all group"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Video className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Motion</span>
                  </button>
                  <button 
                    onClick={() => addBlock('poll')}
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-background border-2 border-transparent hover:border-primary/30 hover:shadow-xl transition-all group"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BarChart2 className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Consensus</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 py-4 px-6 border-b">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-60">Status Registry</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-2">
                <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Publishing Mode</Label>
                <Select value={data.status} onValueChange={v => setData({...data, status: v as any})}>
                  <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Draft">Draft Mode</SelectItem>
                    <SelectItem value="Published">Public Registry</SelectItem>
                    <SelectItem value="Archived">Archive State</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Identity Asset URL</Label>
                <div className="flex gap-2">
                  <Input 
                    value={data.featuredImage} 
                    onChange={e => setData({...data, featuredImage: e.target.value})} 
                    placeholder="Banner image URL..."
                    className="h-12 rounded-xl bg-muted/5 border-2 font-mono text-[10px] flex-1"
                  />
                  <input type="file" ref={bannerInputRef} className="hidden" onChange={handleBannerUpload} accept="image/*" />
                  <Button 
                    variant="outline" 
                    className="h-12 w-12 rounded-xl border-2 shrink-0 bg-background"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={isUploadingBanner}
                  >
                    {isUploadingBanner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
                {isUploadingBanner && uploadProgress !== null && (
                  <div className="space-y-1 mt-1">
                    <Progress value={uploadProgress} className="h-1" />
                    <p className="text-[8px] font-black uppercase text-primary text-right">Syncing: {Math.round(uploadProgress)}%</p>
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Social Metadata Excerpt</Label>
                <Textarea 
                  value={data.excerpt} 
                  onChange={e => setData({...data, excerpt: e.target.value})} 
                  placeholder="Short summary for social media feed..."
                  rows={4}
                  className="rounded-xl bg-muted/5 border-2 p-4 text-xs italic resize-none"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 py-4 px-6 border-b">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-60">Discovery Tags</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-2">
                <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Keywords (Comma separated)</Label>
                <Input 
                  placeholder="stickers, printing, design..." 
                  value={data.tags?.join(', ')}
                  onChange={e => setData({...data, tags: e.target.value.split(',').map(t => t.trim()).filter(t => !!t)})}
                  className="h-12 rounded-xl bg-muted/5 border-2"
                />
              </div>
              <Separator />
              <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground space-y-2">
                <div className="flex justify-between"><span>Author Clearance</span><span>{user?.displayName || 'Anonymous'}</span></div>
                <div className="flex justify-between"><span>Registry Intake</span><span>{isNew ? 'Pending' : new Date(data.createdAt || '').toLocaleDateString()}</span></div>
                <div className="flex justify-between text-primary"><span>Last Modification</span><span>{new Date().toLocaleTimeString()}</span></div>
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-widest text-xs border-2 shadow-lg group" asChild disabled={!data.slug}>
            <Link href={`/blog/${data.slug}`} target="_blank">
              Launch Preview Mode <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
