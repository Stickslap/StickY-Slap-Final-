
'use client';

import React, { useState, useRef, useMemo } from 'react';
import { 
  ImageIcon, 
  Plus, 
  Grid3X3, 
  List, 
  Search, 
  Upload, 
  MoreHorizontal, 
  Edit, 
  Trash, 
  Star, 
  StarOff,
  Filter,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown
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
import { useCollection, useMemoFirebase, useFirestore, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, useUser } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { GalleryItem } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const CLOUDINARY_CLOUD_NAME = "dabgothkm";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_upload";
const CATEGORIES = ['Die Cut', 'Kiss Cut', 'Sheets', 'Rolls', 'Large Format', 'Branding'];

export default function GalleryPage() {
  const db = useFirestore();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<GalleryItem> | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const galleryQuery = useMemoFirebase(() => query(collection(db, 'gallery'), orderBy('order', 'asc')), [db]);
  const { data: items, isLoading } = useCollection<GalleryItem>(galleryQuery);

  const filteredItems = useMemo(() => {
    return items?.filter(item => 
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];
  }, [items, searchTerm]);

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Permanently remove "${title}" from your showcase gallery?`)) {
      deleteDocumentNonBlocking(doc(db, 'gallery', id));
      
      addDocumentNonBlocking(collection(db, 'activity'), {
        userId: user?.uid || 'unknown',
        action: 'Gallery Item Removed',
        entityType: 'Gallery',
        entityId: id,
        details: `Deleted project: ${title}`,
        timestamp: new Date().toISOString()
      });
      
      toast({ title: "Gallery Item Removed", variant: "destructive" });
    }
  };

  const handleToggleFeatured = (item: GalleryItem) => {
    updateDocumentNonBlocking(doc(db, 'gallery', item.id), { isFeatured: !item.isFeatured });
    
    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: user?.uid || 'unknown',
      action: item.isFeatured ? 'Showcase Unfeatured' : 'Showcase Featured',
      entityType: 'Gallery',
      entityId: item.id,
      details: `${item.isFeatured ? 'Removed' : 'Added'} highlight status for: ${item.title}`,
      timestamp: new Date().toISOString()
    });
    
    toast({ title: item.isFeatured ? "Removed from Highlights" : "Marked as Featured" });
  };

  const handleMoveItem = (item: GalleryItem, direction: 'up' | 'down') => {
    if (!items) return;
    const currentIndex = items.findIndex(i => i.id === item.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= items.length) return;

    const targetItem = items[targetIndex];
    
    // Swap orders
    const currentOrder = item.order ?? currentIndex;
    const targetOrder = targetItem.order ?? targetIndex;

    updateDocumentNonBlocking(doc(db, 'gallery', item.id), { order: targetOrder });
    updateDocumentNonBlocking(doc(db, 'gallery', targetItem.id), { order: currentOrder });

    toast({ title: "Gallery Reorganized" });
  };

  const handleOpenEditor = (item: GalleryItem | null = null) => {
    setEditingItem(item || {
      title: '',
      description: '',
      imageUrl: '',
      category: 'Die Cut',
      isFeatured: false,
      order: items?.length || 0
    });
    setIsEditorOpen(true);
    setUploadProgress(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;

    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'gallery');

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
          
          setEditingItem(prev => ({
            ...prev!,
            title: prev?.title || file.name.split('.')[0],
            imageUrl: finalUrl
          }));
          toast({ title: "Asset Ingested", description: "Showcase file synchronized with Cloudinary." });
        } else {
          toast({ title: "Ingest Failed", description: "Cloudinary synchronization error.", variant: "destructive" });
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

  const handleSave = async () => {
    if (!editingItem?.title || !editingItem?.imageUrl) {
      toast({ title: "Validation Error", description: "Title and Image are mandatory.", variant: "destructive" });
      return;
    }

    const payload = {
      ...editingItem,
      updatedAt: new Date().toISOString()
    };

    if (editingItem.id) {
      updateDocumentNonBlocking(doc(db, 'gallery', editingItem.id), payload);
      
      addDocumentNonBlocking(collection(db, 'activity'), {
        userId: user?.uid || 'unknown',
        action: 'Gallery Updated',
        entityType: 'Gallery',
        entityId: editingItem.id,
        details: `Modified showcase details for: ${editingItem.title}`,
        timestamp: new Date().toISOString()
      });
      
      toast({ title: "Showcase Updated" });
    } else {
      const docRef = await addDocumentNonBlocking(collection(db, 'gallery'), {
        ...payload,
        order: items?.length || 0,
        createdAt: new Date().toISOString()
      });
      
      addDocumentNonBlocking(collection(db, 'activity'), {
        userId: user?.uid || 'unknown',
        action: 'Gallery Item Added',
        entityType: 'Gallery',
        entityId: docRef?.id || 'new',
        details: `Published new project to showcase: ${editingItem.title}`,
        timestamp: new Date().toISOString()
      });
      
      toast({ title: "Item Added to Gallery" });
    }
    setIsEditorOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline tracking-tight uppercase italic">Showcase Gallery</h2>
          <p className="text-muted-foreground">Manage your print shop portfolio and featured customer work.</p>
        </div>
        <Button onClick={() => handleOpenEditor()} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">
          <Plus className="mr-2 h-4 w-4" />
          Add Gallery Item —
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by project name or category..." 
              className="pl-8 bg-muted/20 border-none h-10 rounded-xl" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="rounded-xl">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-[120px]">
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/20">
            <TabsTrigger value="grid" className="rounded-lg"><Grid3X3 className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="list" className="rounded-lg"><List className="h-4 w-4" /></TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse bg-muted/50 h-[320px] rounded-[2rem]" />
            ))
          ) : filteredItems?.map((item, idx) => (
            <Card key={item.id} className="group overflow-hidden border-2 rounded-[2rem] hover:border-primary/50 transition-all shadow-sm">
              <div className="aspect-square bg-muted relative overflow-hidden">
                <img src={item.imageUrl} alt={item.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-2 right-2 flex gap-1">
                  {item.isFeatured && (
                    <Badge className="bg-amber-500 hover:bg-amber-600 shadow-sm border-none text-[10px] font-black uppercase">
                      <Star className="h-3 w-3 fill-current mr-1" />
                      Featured
                    </Badge>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1 h-8 rounded-xl font-bold text-[10px] uppercase" onClick={() => handleOpenEditor(item)}>
                      <Edit className="h-3 w-3 mr-1.5" /> Edit
                    </Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8 rounded-xl" onClick={() => handleDelete(item.id, item.title)}>
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              <CardHeader className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-bold line-clamp-1">{item.title}</CardTitle>
                    <CardDescription className="text-[10px] font-black text-primary uppercase tracking-widest">{item.category}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg"
                      onClick={() => handleMoveItem(item, 'up')}
                      disabled={idx === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg"
                      onClick={() => handleMoveItem(item, 'down')}
                      disabled={items && idx === items.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleToggleFeatured(item)}>
                      {item.isFeatured ? <Star className="h-4 w-4 fill-amber-500 text-amber-500" /> : <StarOff className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="rounded-[2rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px]">Project</th>
                  <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px]">Category</th>
                  <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px]">Display Status</th>
                  <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px]">Sequence</th>
                  <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems?.map((item, idx) => (
                  <tr key={item.id} className="border-b hover:bg-muted/10 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center shrink-0 overflow-hidden border">
                          <img src={item.imageUrl} className="h-full w-full object-cover" />
                        </div>
                        <span className="font-bold">{item.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">{item.category}</td>
                    <td className="px-6 py-4">
                      {item.isFeatured ? (
                        <Badge className="bg-amber-500 text-[9px] font-black uppercase tracking-tighter">Featured Highlight</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter">Standard Gallery</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg" 
                          onClick={() => handleMoveItem(item, 'up')}
                          disabled={idx === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg" 
                          onClick={() => handleMoveItem(item, 'down')}
                          disabled={items && idx === items.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpenEditor(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive" onClick={() => handleDelete(item.id, item.title)}>
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

      {/* Gallery Editor Sheet */}
      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto rounded-l-[3rem]">
          <SheetHeader>
            <SheetTitle className="text-2xl font-black font-headline tracking-tighter uppercase italic">{editingItem?.id ? 'Edit Showcase' : 'Add Gallery Piece'}</SheetTitle>
            <SheetDescription>Detail your work to inspire customers and show off print quality.</SheetDescription>
          </SheetHeader>
          
          <div className="grid gap-6 py-6">
            <div 
              className={cn(
                "border-2 border-dashed rounded-[2rem] p-8 transition-all flex flex-col items-center justify-center gap-3 bg-muted/10 cursor-pointer hover:bg-muted/20 hover:border-primary/50 relative overflow-hidden",
                uploadProgress !== null && "pointer-events-none opacity-50"
              )}
              onClick={() => !editingItem?.imageUrl && fileInputRef.current?.click()}
            >
              <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
              
              {editingItem?.imageUrl ? (
                <div className="relative w-full aspect-square">
                  <img src={editingItem.imageUrl} className="w-full h-full object-cover rounded-2xl" />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingItem({...editingItem!, imageUrl: ''});
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : uploadProgress !== null ? (
                <div className="w-full space-y-4 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="h-1.5" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Syncing: {Math.round(uploadProgress)}%</p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm font-black uppercase tracking-widest">Upload project photo</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Supports PNG, JPG (High Res)</p>
                </div>
              )}
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Project Title</Label>
              <Input 
                value={editingItem?.title} 
                onChange={e => setEditingItem({...editingItem!, title: e.target.value})} 
                placeholder="e.g. Neon Gradient Die Cut Bundle"
                className="h-12 rounded-xl"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Category</Label>
              <Select 
                value={editingItem?.category} 
                onValueChange={v => setEditingItem({...editingItem!, category: v})}
              >
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Description (Project Details)</Label>
              <Textarea 
                value={editingItem?.description} 
                onChange={e => setEditingItem({...editingItem!, description: e.target.value})} 
                placeholder="What makes this piece special? Mention materials or finish..."
                rows={3}
                className="rounded-xl resize-none"
              />
            </div>

            <div className="flex items-center justify-between p-4 border-2 rounded-2xl bg-muted/5">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  Featured Showcase
                </Label>
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Prioritize on shop landing page.</p>
              </div>
              <Switch 
                checked={editingItem?.isFeatured} 
                onCheckedChange={v => setEditingItem({...editingItem!, isFeatured: v})} 
              />
            </div>
          </div>

          <SheetFooter className="gap-2 sm:gap-0 mt-6 pb-10">
            <Button variant="outline" className="flex-1 rounded-xl font-bold uppercase text-[10px]" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
            <Button className="flex-1 rounded-xl font-bold uppercase text-[10px] bg-primary" onClick={handleSave} disabled={!!uploadProgress}>
              {editingItem?.id ? 'Update Project —' : 'Publish to Gallery —'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
