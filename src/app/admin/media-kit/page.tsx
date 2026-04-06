'use client';

import React, { useState, useRef } from 'react';
import { 
  Share2, 
  Download, 
  Upload, 
  File, 
  Search, 
  Plus, 
  Grid3X3, 
  List, 
  MoreHorizontal, 
  Edit, 
  Trash, 
  ExternalLink,
  Eye, 
  EyeOff,
  ImageIcon,
  Video,
  FileText,
  Filter,
  Loader2,
  X,
  FileArchive,
  Monitor,
  LayoutGrid,
  CheckCircle2,
  ShieldCheck,
  Maximize2,
  Globe
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useCollection, useMemoFirebase, useFirestore, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { MediaAsset } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const CLOUDINARY_CLOUD_NAME = "dabgothkm";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_upload";
const CATEGORIES = ['Logo', 'Photography', 'Video', 'Branding', 'Product'];
const TYPES = ['Image', 'Video', 'Document', 'Archive'];

export default function MediaKitPage() {
  const db = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Partial<MediaAsset> | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const assetsQuery = useMemoFirebase(() => query(collection(db, 'media_kit'), orderBy('createdAt', 'desc')), [db]);
  const { data: assets, isLoading } = useCollection<MediaAsset>(assetsQuery);

  const filteredAssets = assets?.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (confirm('Permanently remove this asset from the Society Registry?')) {
      deleteDocumentNonBlocking(doc(db, 'media_kit', id));
      toast({ title: "Asset Purged", variant: "destructive" });
    }
  };

  const handleOpenEditor = (asset: MediaAsset | null = null) => {
    setEditingAsset(asset || {
      title: '',
      category: 'Logo',
      type: 'Image',
      url: '',
      isPublic: true,
      description: ''
    });
    setIsEditorOpen(true);
    setUploadProgress(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingAsset) return;

    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'media_kit');

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
          
          let detectedType: MediaAsset['type'] = 'Document';
          if (file.type.startsWith('image/')) detectedType = 'Image';
          if (file.type.startsWith('video/')) detectedType = 'Video';
          if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) detectedType = 'Archive';

          const sizeMb = (file.size / 1024 / 1024).toFixed(2);

          setEditingAsset({
            ...editingAsset,
            title: editingAsset.title || file.name.split('.')[0],
            url: finalUrl,
            type: detectedType,
            fileSize: `${sizeMb} MB`,
          });
          toast({ title: "Asset Synchronized", description: "Vault ingest successful." });
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

  const handleSaveAsset = () => {
    if (!editingAsset?.title || !editingAsset?.url) {
      toast({ title: "Registry Incomplete", description: "Title and file are mandatory.", variant: "destructive" });
      return;
    }

    const data = { ...editingAsset, updatedAt: new Date().toISOString() };

    if (editingAsset.id) {
      updateDocumentNonBlocking(doc(db, 'media_kit', editingAsset.id), data);
      toast({ title: "Asset Updated" });
    } else {
      addDocumentNonBlocking(collection(db, 'media_kit'), { ...data, createdAt: new Date().toISOString() });
      toast({ title: "Asset Created" });
    }
    setIsEditorOpen(false);
  };

  const getIcon = (type: MediaAsset['type']) => {
    switch (type) {
      case 'Image': return <ImageIcon className="h-5 w-5" />;
      case 'Video': return <Video className="h-5 w-5" />;
      case 'Document': return <FileText className="h-5 w-5" />;
      case 'Archive': return <FileArchive className="h-5 w-5" />;
      default: return <File className="h-5 w-5" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-[0.3em]">
            <Monitor className="h-3 w-3" /> System Asset Registry
          </div>
          <h2 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase italic text-foreground leading-none">
            Media <span className="text-primary">Kit</span>
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs opacity-70">
            Control the visual identity and downloadable resources of the Society.
          </p>
        </div>
        <Button onClick={() => handleOpenEditor()} className="rounded-2xl h-16 px-10 font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/20 transition-all active:scale-95 group">
          <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" />
          Ingest Asset —
        </Button>
      </div>

      <Separator className="bg-foreground/5" />

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 flex-1 w-full max-w-2xl">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search by title, category, or file type..." 
              className="pl-12 h-14 rounded-[1.25rem] bg-muted/5 border-2 border-transparent focus-visible:border-primary/50 transition-all shadow-sm text-sm" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-14 w-14 rounded-[1.25rem] border-2">
            <Filter className="h-5 w-5" />
          </Button>
        </div>
        
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
          <TabsList className="h-14 p-1 rounded-[1.25rem] bg-muted/20 border-2">
            <TabsTrigger value="grid" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-lg"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="list" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-lg"><List className="h-4 w-4" /></TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Registry View */}
      {viewMode === 'grid' ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse bg-muted/30 h-[380px] rounded-[2.5rem]" />
            ))
          ) : filteredAssets?.map((asset) => (
            <Card key={asset.id} className="group overflow-hidden border-2 rounded-[2.5rem] hover:border-primary/30 hover:shadow-2xl transition-all duration-500 bg-card">
              <div className="aspect-[4/3] bg-muted/10 relative flex items-center justify-center overflow-hidden p-4">
                {asset.type === 'Image' ? (
                  <img src={asset.url} alt={asset.title} className="object-contain w-full h-full drop-shadow-xl group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="flex flex-col items-center gap-4 text-muted-foreground group-hover:text-primary transition-colors">
                    <div className="h-20 w-20 rounded-3xl bg-muted/5 flex items-center justify-center border-2 border-dashed group-hover:border-primary/20">
                      {getIcon(asset.type)}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{asset.type}</span>
                  </div>
                )}
                
                {/* Visual Status Overlays */}
                <div className="absolute top-6 right-6 flex gap-2">
                  <Badge className={cn(
                    "text-[8px] h-6 font-black uppercase px-3 shadow-xl border-none",
                    asset.isPublic ? "bg-emerald-500" : "bg-zinc-800"
                  )}>
                    {asset.isPublic ? <Eye className="h-3 w-3 mr-1.5" /> : <EyeOff className="h-3 w-3 mr-1.5" />}
                    {asset.isPublic ? 'Public' : 'Internal'}
                  </Badge>
                </div>

                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="text-lg font-black uppercase tracking-tight line-clamp-1 italic">{asset.title}</h4>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-40 hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-2xl">
                        <DropdownMenuItem className="rounded-xl font-bold uppercase text-[10px]" onClick={() => handleOpenEditor(asset)}>
                          <Edit className="mr-2 h-4 w-4" /> Modify Logic
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-xl font-bold uppercase text-[10px]" asChild>
                          <a href={asset.url} target="_blank" rel="noopener noreferrer">
                            <Maximize2 className="mr-2 h-4 w-4" /> Open Inspector
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 rounded-xl font-bold uppercase text-[10px]" onClick={() => handleDelete(asset.id)}>
                          <Trash className="mr-2 h-4 w-4" /> Purge Registry
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-[8px] font-black uppercase bg-primary/5 text-primary border-primary/10">{asset.category}</Badge>
                    <span className="text-[10px] font-bold text-muted-foreground opacity-40 uppercase tracking-tighter">{asset.fileSize || 'UNSIZED'}</span>
                  </div>
                </div>

                <Separator className="bg-foreground/5" />

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-xl h-10 font-black uppercase text-[9px] tracking-widest border-2" asChild>
                    <a href={asset.url} download={asset.title}>
                      <Download className="mr-2 h-3.5 w-3.5" /> Download —
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="rounded-[2.5rem] overflow-hidden border-2 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-8 py-5 text-left font-black uppercase tracking-[0.2em] text-[10px]">Asset Profile</th>
                  <th className="px-8 py-5 text-left font-black uppercase tracking-[0.2em] text-[10px]">Classification</th>
                  <th className="px-8 py-5 text-left font-black uppercase tracking-[0.2em] text-[10px]">Weight</th>
                  <th className="px-8 py-5 text-left font-black uppercase tracking-[0.2em] text-[10px]">Clearance</th>
                  <th className="px-8 py-5 text-right font-black uppercase tracking-[0.2em] text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets?.map((asset) => (
                  <tr key={asset.id} className="border-b hover:bg-muted/10 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-muted/20 rounded-xl flex items-center justify-center shrink-0 border group-hover:border-primary/30 transition-all overflow-hidden">
                          {asset.type === 'Image' ? (
                            <img src={asset.url} className="h-full w-full object-cover" />
                          ) : getIcon(asset.type)}
                        </div>
                        <div>
                          <span className="font-bold text-sm block">{asset.title}</span>
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter opacity-60">ID: {asset.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary">{asset.category}</Badge>
                    </td>
                    <td className="px-8 py-5 text-muted-foreground font-mono text-xs">{asset.fileSize || 'N/A'}</td>
                    <td className="px-8 py-5">
                      {asset.isPublic ? (
                        <Badge className="bg-emerald-500 text-[9px] font-black uppercase h-5">Public Release</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] font-black uppercase h-5">Registry Only</Badge>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-3">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => handleOpenEditor(asset)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive" onClick={() => handleDelete(asset.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty State Registry */}
      {!filteredAssets?.length && !isLoading && (
        <Card className="border-4 border-dashed rounded-[4rem] bg-muted/5">
          <CardContent className="flex flex-col items-center justify-center py-32 text-center space-y-8">
            <div className="h-24 w-24 rounded-[2.5rem] border-4 border-dashed border-muted flex items-center justify-center bg-background group animate-pulse">
              <Share2 className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black uppercase italic tracking-tighter">Registry Clear</h3>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest max-w-sm mx-auto">No assets matching your search were found in the Society archives.</p>
            </div>
            <Button variant="outline" className="h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2" onClick={() => handleOpenEditor()}>
              Ingest First Asset —
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Asset Editor Sheet */}
      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto rounded-l-[3rem] p-0 border-l-4">
          <SheetHeader className="p-10 bg-muted/20 border-b">
            <SheetTitle className="text-3xl font-black font-headline uppercase italic tracking-tighter">
              {editingAsset?.id ? 'Asset Architecture' : 'Ingest Asset'}
            </SheetTitle>
            <SheetDescription className="text-xs font-bold uppercase tracking-widest">Define the technical specs and clearance for this registry entry.</SheetDescription>
          </SheetHeader>
          
          <div className="p-10 space-y-10">
            {/* High-Fidelity Upload Section */}
            <div 
              className={cn(
                "border-4 border-dashed rounded-[2.5rem] p-12 transition-all flex flex-col items-center justify-center gap-6 bg-muted/5 cursor-pointer hover:bg-muted/10 hover:border-primary/50 relative overflow-hidden group",
                uploadProgress !== null && "pointer-events-none opacity-50"
              )}
              onClick={() => !editingAsset?.url && fileInputRef.current?.click()}
            >
              <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*,.zip,.rar,.pdf" />
              
              {editingAsset?.url ? (
                <div className="relative w-full aspect-square bg-background rounded-[2rem] border-2 p-4 shadow-inner">
                  {editingAsset.type === 'Image' ? (
                    <img src={editingAsset.url} className="w-full h-full object-contain" />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-4">
                      {getIcon(editingAsset.type as any)}
                      <span className="font-mono text-[10px] uppercase font-bold">{editingAsset.type}</span>
                    </div>
                  )}
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute -top-3 -right-3 h-10 w-10 rounded-full shadow-2xl border-2 border-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingAsset({...editingAsset!, url: ''});
                    }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              ) : uploadProgress !== null ? (
                <div className="w-full space-y-6 text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <div className="space-y-3">
                    <Progress value={uploadProgress} className="h-2 bg-muted rounded-full" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Vault Syncing: {Math.round(uploadProgress)}%</p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="h-16 w-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-black uppercase italic tracking-tight">Select Registry File</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1 opacity-60">Supports High-Res TIFF, AI, PDF, MP4</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-8">
              <div className="grid gap-3">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Asset Identity</Label>
                <Input 
                  value={editingAsset?.title} 
                  onChange={e => setEditingAsset({...editingAsset!, title: e.target.value})} 
                  placeholder="e.g. Primary Logo Mark (Industrial)"
                  className="h-14 rounded-2xl bg-muted/5 border-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="grid gap-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Classification</Label>
                  <Select 
                    value={editingAsset?.category} 
                    onValueChange={v => setEditingAsset({...editingAsset!, category: v as any})}
                  >
                    <SelectTrigger className="h-14 rounded-2xl bg-muted/5 border-2 font-bold uppercase text-[10px] tracking-widest"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-2xl">
                      {CATEGORIES.map(c => <SelectItem key={c} value={c} className="font-bold uppercase text-[10px]">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Logic Type</Label>
                  <Select 
                    value={editingAsset?.type} 
                    onValueChange={v => setEditingAsset({...editingAsset!, type: v as any})}
                  >
                    <SelectTrigger className="h-14 rounded-2xl bg-muted/5 border-2 font-bold uppercase text-[10px] tracking-widest"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-2xl">
                      {TYPES.map(t => <SelectItem key={t} value={t} className="font-bold uppercase text-[10px]">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2">
                  Metadata Narrative <span className="opacity-40">(Internal)</span>
                </Label>
                <Textarea 
                  value={editingAsset?.description} 
                  onChange={e => setEditingAsset({...editingAsset!, description: e.target.value})} 
                  placeholder="Usage guidelines or technical context..."
                  rows={4}
                  className="rounded-2xl bg-muted/5 border-2 p-5 resize-none italic text-sm"
                />
              </div>

              <div className="flex items-center justify-between p-6 border-2 rounded-[2rem] bg-primary/5 border-primary/10">
                <div className="space-y-1">
                  <Label className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> Public Ingest
                  </Label>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Show in customer-facing kit.</p>
                </div>
                <Switch 
                  checked={editingAsset?.isPublic} 
                  onCheckedChange={v => setEditingAsset({...editingAsset!, isPublic: v})} 
                />
              </div>
            </div>
          </div>

          <SheetFooter className="p-10 border-t bg-muted/10">
            <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs border-2" onClick={() => setIsEditorOpen(false)}>Abort Ingest</Button>
            <Button className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90" onClick={handleSaveAsset} disabled={!!uploadProgress}>
              {editingAsset?.id ? 'Sync Registry —' : 'Finalize Ingest —'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
