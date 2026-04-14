'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, 
  Trash, 
  Plus, 
  Upload,
  Loader2,
  X,
  Type, 
  ImageIcon, 
  Layout, 
  Globe, 
  Settings, 
  Eye, 
  ArrowLeft, 
  ArrowRight,
  GripVertical,
  ChevronUp,
  ChevronDown,
  SeparatorHorizontal,
  MousePointer2,
  Clock,
  User,
  ShoppingBag,
  List,
  Palette,
  CheckCircle2,
  PlusCircle,
  FileCheck
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { EmailTemplate, EmailBlock, EmailTemplateTrigger } from '@/lib/types';
import { useFirestore, setDocumentNonBlocking, addDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EmailEditorProps {
  initialData?: Partial<EmailTemplate>;
  isNew?: boolean;
}

const TRIGGERS: { value: EmailTemplateTrigger; label: string }[] = [
  { value: 'order_confirmed', label: 'Order Confirmation' },
  { value: 'order_status_changed', label: 'Status Transition' },
  { value: 'artwork_submitted', label: 'Artwork Ingest' },
  { value: 'artwork_approved', label: 'Design Authorized' },
  { value: 'artwork_rejected', label: 'Revision Request' },
  { value: 'payment_received', label: 'Payment Captured' },
  { value: 'order_shipped', label: 'Carrier Dispatch' },
  { value: 'order_ready', label: 'Ready for Pickup' },
  { value: 'proof_reminder', label: 'Proof Expiry Reminder' },
  { value: 'proof_ready', label: 'Proof Ready for Review' },
  { value: 'order_completed', label: 'Fulfillment Finalized' },
  { value: 'order_refunded', label: 'Refund Issued' },
  { value: 'order_cancelled', label: 'Order Cancelled' },
  { value: 'support_reply', label: 'Support Desk Reply' },
  { value: 'ticket_received', label: 'Support Ticket Intake' },
];

const DEFAULT_BLOCKS: EmailBlock[] = [
  { id: 'b1', type: 'logo', url: "https://res.cloudinary.com/dabgothkm/image/upload/v1743789000/sticky-slap-logo.png", alignment: 'center' },
  { id: 'b2', type: 'text', content: 'Hello {{customer_name}},', alignment: 'left' },
  { id: 'b3', type: 'text', content: 'Your project #{{order_id}} has been logged in the Society Registry.', alignment: 'left' },
];

const DEFAULT_TEMPLATE: Partial<EmailTemplate> = {
  name: '',
  trigger: 'order_confirmed',
  subject: 'Order Confirmation: #{{order_id}}',
  previewText: 'Your print project is now in the queue.',
  senderName: 'Sticky Slap',
  replyTo: 'lab@stickyslap.com',
  enabled: true,
  header: {
    bgColor: '#FFFFFF',
  },
  blocks: DEFAULT_BLOCKS,
};

const TOKENS = [
  '{{customer_name}}',
  '{{order_id}}',
  '{{order_status}}',
  '{{order_total}}',
  '{{order_date}}',
  '{{shipping_address}}',
  '{{tracking_number}}',
  '{{artwork_link}}',
  '{{proof_deadline}}',
  '{{pickup_location}}'
];

const CLOUDINARY_CLOUD_NAME = "dabgothkm";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_upload";

export function EmailEditorForm({ initialData, isNew }: EmailEditorProps) {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<Partial<EmailTemplate>>(initialData || DEFAULT_TEMPLATE);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handleSave = async () => {
    if (!data.name || !data.trigger) {
      toast({ title: "Blueprint Incomplete", description: "Name and Trigger are mandatory.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const updatedData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    if (isNew) {
      await addDocumentNonBlocking(collection(db, 'email_templates'), {
        ...updatedData,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Automation Registry Updated" });
    } else if (data.id) {
      setDocumentNonBlocking(doc(db, 'email_templates', data.id), updatedData, { merge: true });
      toast({ title: "Blueprint Synchronized" });
    }
    
    setTimeout(() => {
      setIsLoading(false);
      router.push('/admin/notifications/email-templates');
    }, 500);
  };

  const addBlock = (type: EmailBlock['type']) => {
    const id = Math.random().toString(36).substr(2, 9);
    let newBlock: EmailBlock;

    switch (type) {
      case 'text': newBlock = { id, type: 'text', content: 'New text block...', alignment: 'left' }; break;
      case 'image': newBlock = { id, type: 'image', url: 'https://picsum.photos/seed/email/600/400', alignment: 'center' }; break;
      case 'divider': newBlock = { id, type: 'divider' }; break;
      case 'button': newBlock = { id, type: 'button', label: 'View Order Registry —', link: '{{order_link}}', alignment: 'center' }; break;
      case 'countdown': newBlock = { id, type: 'countdown', timerLabel: 'Deadline:', endDateSource: 'dynamic', color: '#957DAD' }; break;
      default: newBlock = { id, type, alignment: 'center' };
    }

    setData({ ...data, blocks: [...(data.blocks || []), newBlock] });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'email_templates');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          const finalUrl = response.secure_url;
          
          setData({
            ...data,
            header: { ...data.header, logoUrl: finalUrl }
          });
          toast({ title: "Logo Synchronized", description: "Image ingest successful." });
        } else {
          toast({ title: "Ingest Failed", variant: "destructive" });
        }
        setUploadProgress(null);
      };

      xhr.onerror = () => {
        toast({ title: "Network Error", variant: "destructive" });
        setUploadProgress(null);
      };

      xhr.send(formData);
    } catch (err) {
      setUploadProgress(null);
    }
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (!data.blocks) return;
    const newBlocks = [...data.blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setData({ ...data, blocks: newBlocks });
  };

  const updateBlock = (id: string, updates: Partial<EmailBlock>) => {
    setData({
      ...data,
      blocks: data.blocks?.map(b => b.id === id ? { ...b, ...updates } : b)
    });
  };

  const insertToken = (blockId: string, token: string) => {
    const block = data.blocks?.find(b => b.id === blockId);
    if (!block || block.type !== 'text') return;
    updateBlock(blockId, { content: (block.content || '') + ' ' + token });
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between sticky top-16 bg-background/95 backdrop-blur z-30 py-6 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl border"><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h2 className="text-3xl font-black font-headline tracking-tighter uppercase italic">
              {isNew ? 'Build Automation' : 'Design Blueprint'}
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Registry Management: Email Templates</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl h-12 px-6 font-bold uppercase tracking-widest text-[10px]" onClick={() => router.back()}>Discard —</Button>
          <Button className="rounded-xl h-12 px-10 font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 shadow-xl" onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Publish Logic —
          </Button>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-12 items-start">
        
        <div className="lg:col-span-4 space-y-8">
          <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 py-4 px-6 border-b">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-60">Logic Setup</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-2">
                <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Template Label</Label>
                <Input value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder="e.g. Order Intake Confirmation" className="h-12 rounded-xl bg-muted/5 border-2 font-bold" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[9px] font-black uppercase tracking-widest ml-1 text-primary">Event Trigger</Label>
                <Select value={data.trigger} onValueChange={v => setData({...data, trigger: v as EmailTemplateTrigger})}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/5 border-2 font-black uppercase text-[10px] tracking-widest"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {TRIGGERS.map(t => <SelectItem key={t.value} value={t.value} className="text-[10px] font-bold uppercase">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border-2 border-primary/10">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Automation Active</Label>
                  <p className="text-[8px] font-bold uppercase text-muted-foreground">Toggle triggered dispatches.</p>
                </div>
                <Switch checked={data.enabled} onCheckedChange={v => setData({...data, enabled: v})} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 py-4 px-6 border-b">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-60">Envelope Metadata</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-2">
                <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Subject Line</Label>
                <Input value={data.subject} onChange={e => setData({...data, subject: e.target.value})} className="h-12 rounded-xl bg-muted/5 border-2" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Preview Snippet</Label>
                <Textarea value={data.previewText} onChange={e => setData({...data, previewText: e.target.value})} rows={2} className="rounded-xl bg-muted/5 border-2 p-3 text-xs italic" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Logo URL</Label>
                <div className="flex gap-2">
                  <Input value={data.header?.logoUrl || ''} onChange={e => setData({...data, header: {...data.header, logoUrl: e.target.value}})} className="h-12 rounded-xl bg-muted/5 border-2" placeholder="https://..." />
                  <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={() => fileInputRef.current?.click()} disabled={uploadProgress !== null}>
                    {uploadProgress !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                  <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
                </div>
                {uploadProgress !== null && <Progress value={uploadProgress} className="h-1" />}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Component Library</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: 'text', icon: Type, label: 'Text' },
                { type: 'image', icon: ImageIcon, label: 'Image' },
                { type: 'button', icon: MousePointer2, label: 'Button' },
                { type: 'divider', icon: SeparatorHorizontal, label: 'Divider' },
                { type: 'order_summary', icon: ShoppingBag, label: 'Summary' },
                { type: 'artwork_preview', icon: ImageIcon, label: 'Artwork' },
                { type: 'countdown', icon: Clock, label: 'Timer' },
                { type: 'customer_info', icon: User, label: 'Identity' },
              ].map((comp) => (
                <Button 
                  key={comp.type} 
                  variant="outline" 
                  className="h-20 rounded-2xl flex flex-col gap-2 border-2 hover:border-primary/50 hover:bg-primary/5 transition-all"
                  onClick={() => addBlock(comp.type as any)}
                >
                  <comp.icon className="h-5 w-5 text-primary opacity-60" />
                  <span className="text-[9px] font-black uppercase tracking-widest">{comp.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <Card className="border-2 rounded-[3rem] bg-zinc-50 overflow-hidden shadow-inner">
            <CardHeader className="bg-white border-b py-6 px-10 flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black uppercase italic tracking-tight">Visual Builder</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Architect the layout of the triggered email.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10">
              <div className="max-w-[600px] mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden border">
                <div className="p-8 border-b text-center relative group/header" style={{ backgroundColor: data.header?.bgColor }}>
                  <img src={data.header?.logoUrl || "https://res.cloudinary.com/dabgothkm/image/upload/v1743789000/sticky-slap-logo.png"} className="h-10 mx-auto object-contain" alt="Logo" />
                </div>

                <div className="p-10 space-y-10 min-h-[400px]">
                  {data.blocks?.map((block, idx) => (
                    <div key={block.id} className="relative group/block animate-in fade-in slide-in-from-bottom-2">
                      <div className="absolute -left-12 top-0 opacity-0 group-hover/block:opacity-100 transition-opacity flex flex-col gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-background border shadow-sm" onClick={() => moveBlock(idx, 'up')} disabled={idx === 0}><ChevronUp className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-background border shadow-sm" onClick={() => moveBlock(idx, 'down')} disabled={idx === (data.blocks?.length || 0) - 1}><ChevronDown className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-background border shadow-sm text-destructive" onClick={() => removeBlock(block.id)}><Trash className="h-4 w-4" /></Button>
                      </div>

                      {block.type === 'text' && (
                        <div className="space-y-3">
                          <Textarea 
                            value={block.content} 
                            onChange={e => updateBlock(block.id, { content: e.target.value })}
                            className={cn(
                              "border-none focus-visible:ring-0 p-0 text-base leading-relaxed bg-transparent resize-none h-auto",
                              block.alignment === 'center' ? "text-center" : block.alignment === 'right' ? "text-right" : "text-left"
                            )}
                          />
                        </div>
                      )}

                      {block.type === 'image' && (
                        <div className="space-y-4">
                          <div className={cn("relative aspect-video rounded-2xl overflow-hidden border-2", block.alignment === 'center' ? "mx-auto" : "")}>
                            <img src={block.url} className="object-cover w-full h-full" alt="Block" />
                          </div>
                          <Input value={block.url} onChange={e => updateBlock(block.id, { url: e.target.value })} className="h-8 text-[9px] font-mono rounded-lg bg-muted/5 border-dashed" placeholder="Image URL" />
                        </div>
                      )}

                      {block.type === 'button' && (
                        <div className={cn("flex", block.alignment === 'center' ? "justify-center" : block.alignment === 'right' ? "justify-end" : "justify-start")}>
                          <div className="space-y-3 w-fit text-center">
                            <Button className="h-12 px-10 rounded-xl font-black uppercase tracking-widest text-xs" onClick={() => toast({ title: "Preview Mode", description: `Link: ${block.link}` })}>{block.label}</Button>
                            <div className="grid gap-2 p-4 bg-muted/10 rounded-xl border-2 border-dashed opacity-0 group-hover/block:opacity-100 transition-all">
                              <Input value={block.label} onChange={e => updateBlock(block.id, { label: e.target.value })} className="h-8 text-[10px]" placeholder="Label" />
                              <Input value={block.link} onChange={e => updateBlock(block.id, { link: e.target.value })} className="h-8 text-[10px]" placeholder="Link URL" />
                            </div>
                          </div>
                        </div>
                      )}

                      {block.type === 'divider' && <Separator className="my-10" />}

                      {block.type === 'order_summary' && (
                        <div className="p-8 bg-muted/5 border-2 border-dashed rounded-3xl space-y-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-center opacity-40">Dynamic Block: Order Summary Registry</p>
                          <div className="space-y-2">
                            <div className="h-4 w-full bg-muted/20 rounded animate-pulse" />
                            <div className="h-4 w-2/3 bg-muted/20 rounded animate-pulse" />
                          </div>
                        </div>
                      )}

                      {block.type === 'artwork_preview' && (
                        <div className="p-10 border-4 border-dashed rounded-[3rem] bg-muted/5 text-center space-y-4">
                          <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground opacity-20" />
                          <p className="text-sm font-black uppercase italic tracking-tight">Artwork Verification Logic</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-10 border-t bg-muted/10 text-center space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Sticky Slap — Registry Portal</p>
                </div>
              </div>

              <div className="mt-12 py-10 border-2 border-dashed rounded-[3rem] text-center space-y-6">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Modify Blueprint Architecture</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="outline" size="sm" className="rounded-xl h-10 px-6 font-black uppercase text-[9px] tracking-widest bg-white shadow-sm" onClick={() => addBlock('text')}><Type className="h-3 w-3 mr-2" /> Insert Narrative</Button>
                  <Button variant="outline" size="sm" className="rounded-xl h-10 px-6 font-black uppercase text-[9px] tracking-widest bg-white shadow-sm" onClick={() => addBlock('button')}><MousePointer2 className="h-3 w-3 mr-2" /> Insert Action</Button>
                  <Button variant="outline" size="sm" className="rounded-xl h-10 px-6 font-black uppercase text-[9px] tracking-widest bg-white shadow-sm" onClick={() => addBlock('image')}><ImageIcon className="h-3 w-3 mr-2" /> Insert Visual</Button>
                  <Button variant="outline" size="sm" className="rounded-xl h-10 px-6 font-black uppercase text-[9px] tracking-widest bg-white shadow-sm" onClick={() => addBlock('divider')}><SeparatorHorizontal className="h-3 w-3 mr-2" /> Insert Break</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
