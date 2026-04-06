
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Save, 
  Plus, 
  Trash, 
  Settings2, 
  ImageIcon, 
  Layout, 
  DollarSign, 
  Upload, 
  Clock, 
  PlusCircle,
  AlertCircle,
  Settings,
  ChevronRight,
  Calculator,
  X,
  Tag,
  Zap,
  ShieldCheck,
  FileText,
  Layers,
  ArrowRight,
  Loader2,
  Box,
  Palette,
  Scaling,
  Maximize,
  Scissors,
  Shapes,
  Ruler,
  Link as LinkIcon,
  CheckCircle2,
  Target,
  BarChart3,
  History,
  Video,
  Warehouse,
  Coins,
  Hash,
  Activity,
  Droplets,
  Thermometer,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ProductTemplate, OptionGroup, OptionValue, ProductSegment, YardTierPrice, RollInventoryUnit, RollPreset, RollSizeConfig, ProductionSpecs } from '@/lib/types';
import { useDoc, useMemoFirebase, useFirestore, setDocumentNonBlocking, useUser } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const CLOUDINARY_CLOUD_NAME = "dabgothkm";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_upload";

const MODERN_VINYL_DEFAULTS = {
  measurementUnit: 'inches' as const,
  pricingModel: 'square_inches' as const,
  presetSizes: [
    { label: '2 INCH', width: 2, height: 2, price: 0.35, discount: 0.05, imageUrl: '' },
    { label: '3 INCH', width: 3, height: 3, price: 0.55, discount: 0.08, imageUrl: '' },
    { label: '4 INCH', width: 4, height: 4, price: 0.85, discount: 0.12, imageUrl: '' },
    { label: '5 INCH', width: 5, height: 5, price: 1.25, discount: 0.15, imageUrl: '' }
  ],
  customSizeEnabled: true,
  minSize: 1,
  maxSize: 24,
  shapeOptions: [
    { id: 's1', name: 'Full Bleed Cut', multiplier: 1.0 },
    { id: 's2', name: 'White Border Cut', multiplier: 1.0 },
    { id: 's3', name: 'Die Cut Contour', multiplier: 1.15 }
  ],
  materialOptions: [
    { id: 'm1', name: 'SATIN & LAMINATION', description: 'Semi-gloss durable finish', baseRatePerSqIn: 0.08, multiplier: 1.0 },
    { id: 'm2', name: 'GLOSS & LAMINATION', description: 'High shine durable finish', baseRatePerSqIn: 0.08, multiplier: 1.0 },
    { id: 'm3', name: 'Holographic Vinyl', description: 'Rainbow reflective', baseRatePerSqIn: 0.14, multiplier: 1.6 }
  ],
  laminateOptions: [
    { id: 'l1', name: 'No Laminate', multiplier: 1.0 },
    { id: 'l2', name: 'Gloss UV Laminate', multiplier: 1.15 },
    { id: 'l3', name: 'Matte UV Laminate', multiplier: 1.15 }
  ],
  smartQuantityTiers: [
    { min: 50, max: 99, discountMultiplier: 1.0 },
    { min: 100, max: 499, discountMultiplier: 0.90 },
    { min: 500, max: null, discountMultiplier: 0.75 }
  ]
};

const DEFAULT_ROLL_CONFIG = {
  displayType: 'panels' as const,
  sellByRoll: true,
  sellByYard: true,
  yardsPerRoll: 50,
  costPerRoll: 200,
  pricePerRoll: 450,
  basePricePerYard: 12,
  tierPricing: [
    { id: 't1', minYards: 1, pricePerYard: 12 },
    { id: 't2', minYards: 10, pricePerYard: 10 },
    { id: 't3', minYards: 25, pricePerYard: 9 },
    { id: 't4', minYards: 50, pricePerYard: 8 }
  ],
  rollPresets: [
    { id: 'p1', label: '10 YARD MINI', yards: 10, price: 120 },
    { id: 'p2', label: '25 YARD HALF', yards: 25, price: 250 },
    { id: 'p3', label: '50 YARD FULL', yards: 50, price: 450 }
  ],
  rollSizes: [
    { id: 's1', label: '15 INCH WIDTH', fullRollYards: 50, fullRollPrice: 450, baseYardPrice: 12, allowYardage: true, inventoryTrait: '15-inch', inventoryCount: 10, vinylFinish: 'Gloss' },
    { id: 's2', label: '24 INCH WIDTH', fullRollYards: 50, fullRollPrice: 650, baseYardPrice: 18, allowYardage: true, inventoryTrait: '24-inch', inventoryCount: 5, vinylFinish: 'Gloss' }
  ],
  inventory: [],
  lowInventoryThreshold: 10
};

const DEFAULT_PROD_SPECS: ProductionSpecs = {
  showChart: false,
  outdoorLife: '3-5 years',
  thickness: '6 mil',
  pressureSensitive: true,
  airRelease: true,
  compatibility: {
    ecoSolvent: true,
    latex: true,
    solvent: true,
    uvInk: true,
    regularInkjet: false
  }
};

const DEFAULT_TEMPLATE: Partial<ProductTemplate> = {
  name: '',
  slug: '',
  tagline: 'Print Society — Professional Engineering',
  status: 'Draft',
  category: 'Stickers',
  uiTemplate: 'Standard',
  shortDescription: 'Custom stickers printed with a vibrant 8-color setup.',
  longDescription: 'High-quality custom sticker printing. Durable for 4-5 years outdoors.',
  isFeatured: false,
  images: [],
  imageURLs: [],
  thumbnail: '',
  optionGroups: [],
  pricingModel: {
    basePrice: 0.35,
    tiers: [
      { min: 50, price: 0.35 },
      { min: 100, price: 0.27 },
      { min: 500, price: 0.22 }
    ],
    minPrice: 25,
    costPerUnit: 0.05
  },
  marketing: {
    qualityPromiseTitle: 'Quality Promise',
    qualityPromiseDescription: 'Every project is hand-inspected by our boutique production team for precision and adhesive integrity.',
    qualityPromiseButtonText: 'View Artwork Guide —',
    qualityPromiseButtonLink: '/help'
  },
  productionSpecs: DEFAULT_PROD_SPECS,
  segmentConfig: {
    vinyl: MODERN_VINYL_DEFAULTS,
    roll: DEFAULT_ROLL_CONFIG
  },
  videoSection: {
    url: '',
    thumbnailUrl: '',
    title: 'Manufacturing Mastery',
    tagline: 'Processing Insight',
    description: 'Go behind the scenes of our boutique production lab.',
    isActive: false,
    autoPlay: false,
    loop: false,
    badge1: 'ISO Certified Flow',
    badge2: 'Real-time Telemetry'
  },
  artworkRequirements: {
    required: true,
    acceptedFormats: ['PDF', 'AI', 'SVG', 'PNG'],
    minDpi: 300,
    bleed: '0.125"',
    safeArea: '0.125"',
    maxFileSizeMb: 50,
    filesCount: 1,
    hasDesignServices: false,
    templateUrls: []
  },
  production: {
    turnaroundDays: 5,
    hasRushOption: true,
    rushSurchargePercent: 25,
    internalNotes: '',
    packagingNotes: '',
    shippingEligibility: 'Both',
    department: 'Production'
  }
};

export function ProductEditorForm({ initialData, isNew }: { initialData?: Partial<ProductTemplate>; isNew?: boolean }) {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoThumbnailInputRef = useRef<HTMLInputElement>(null);
  const optionImageInputRef = useRef<HTMLInputElement>(null);
  const sizeImageInputRef = useRef<HTMLInputElement>(null);
  
  const [data, setData] = useState<Partial<ProductTemplate>>(() => {
    const merged = {
      ...DEFAULT_TEMPLATE,
      ...initialData,
      pricingModel: {
        ...DEFAULT_TEMPLATE.pricingModel!,
        ...(initialData?.pricingModel || {})
      },
      marketing: {
        ...DEFAULT_TEMPLATE.marketing!,
        ...(initialData?.marketing || {})
      },
      productionSpecs: {
        ...DEFAULT_PROD_SPECS,
        ...(initialData?.productionSpecs || {})
      },
      segmentConfig: {
        vinyl: { ...MODERN_VINYL_DEFAULTS, ...(initialData?.segmentConfig?.vinyl || {}) },
        roll: { ...DEFAULT_ROLL_CONFIG, ...(initialData?.segmentConfig?.roll || {}) }
      },
      videoSection: {
        ...DEFAULT_TEMPLATE.videoSection!,
        ...(initialData?.videoSection || {})
      },
      artworkRequirements: {
        ...DEFAULT_TEMPLATE.artworkRequirements!,
        ...(initialData?.artworkRequirements || {})
      },
      production: {
        ...DEFAULT_TEMPLATE.production!,
        ...(initialData?.production || {})
      }
    };

    const galleryItems = initialData?.images || initialData?.imageURLs || [];
    merged.images = Array.isArray(galleryItems) ? galleryItems : [];
    merged.imageURLs = merged.images;

    return merged;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingOptionInfo, setUploadingOptionInfo] = useState<{ groupId: string, optionId: string } | null>(null);
  const [uploadingSizeIndex, setUploadingSizeIndex] = useState<number | null>(null);

  const isRollLayout = data.segment === 'Roll Printing' || data.segment === 'DTF' || data.uiTemplate === 'Rolls / DTF';

  const updateRollConfig = (updates: Partial<typeof DEFAULT_ROLL_CONFIG>) => {
    setData(prev => {
      const currentRoll = prev.segmentConfig?.roll || DEFAULT_ROLL_CONFIG;
      return {
        ...prev,
        segmentConfig: {
          ...prev.segmentConfig!,
          roll: { ...currentRoll, ...updates }
        }
      };
    });
  };

  const updateVinylConfig = (updates: Partial<typeof MODERN_VINYL_DEFAULTS>) => {
    setData(prev => {
      const currentVinyl = prev.segmentConfig?.vinyl || MODERN_VINYL_DEFAULTS;
      return {
        ...prev,
        segmentConfig: {
          ...prev.segmentConfig!,
          vinyl: { ...currentVinyl, ...updates }
        }
      };
    });
  };

  const moveRollSize = (index: number, direction: 'up' | 'down') => {
    const sizes = [...(data.segmentConfig?.roll?.rollSizes || [])];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= sizes.length) return;
    
    [sizes[index], sizes[target]] = [sizes[target], sizes[index]];
    updateRollConfig({ rollSizes: sizes });
  };

  const updateProductionSpecs = (updates: Partial<ProductionSpecs>) => {
    setData(prev => ({
      ...prev,
      productionSpecs: {
        ...(prev.productionSpecs || DEFAULT_PROD_SPECS),
        ...updates
      }
    }));
  };

  const updateCompatibility = (key: keyof ProductionSpecs['compatibility'], value: boolean) => {
    const current = data.productionSpecs?.compatibility || DEFAULT_PROD_SPECS.compatibility;
    updateProductionSpecs({
      compatibility: {
        ...current,
        [key]: value
      }
    });
  };

  const getIcon = (name: string) => {
    if (name.toLowerCase().includes('cut') || name.toLowerCase().includes('shape')) return <Shapes className="h-4 w-4" />;
    if (name.toLowerCase().includes('finish') || name.toLowerCase().includes('material')) return <Box className="h-4 w-4" />;
    return <Layers className="h-4 w-4" />;
  };

  const triggerOptionImageUpload = (groupId: string, optionId: string) => {
    setUploadingOptionInfo({ groupId, optionId });
    optionImageInputRef.current?.click();
  };

  const triggerSizeImageUpload = (index: number) => {
    setUploadingSizeIndex(index);
    sizeImageInputRef.current?.click();
  };

  const handleSave = () => {
    if (!data.name || !data.category || !data.segment) {
      toast({ title: "Required Fields", description: "Name, Category, and Segment are mandatory.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const finalSlug = data.slug || data.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || '';

    const sanitizedData = JSON.parse(JSON.stringify({
      ...data,
      images: data.images || [],
      imageURLs: data.images || [], 
      updatedAt: new Date().toISOString(),
      slug: finalSlug
    }));

    if (isNew) {
      delete sanitizedData.id;
      addDocumentNonBlocking(collection(db, 'products'), {
        ...sanitizedData,
        createdAt: new Date().toISOString()
      }).then((docRef) => {
        if (docRef) {
          addDocumentNonBlocking(collection(db, 'activity'), {
            userId: user?.uid || 'unknown',
            action: 'Product Created',
            entityType: 'Product',
            entityId: docRef.id,
            details: `Created new ${data.segment}: ${data.name}`,
            timestamp: new Date().toISOString()
          });
        }
      });
      toast({ title: "Product Created" });
    } else if (data.id) {
      setDocumentNonBlocking(doc(db, 'products', data.id), sanitizedData, { merge: true });
      toast({ title: "Product Saved" });
    }
    
    setTimeout(() => {
      setIsLoading(false);
      router.push('/admin/products');
    }, 600);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'thumbnail' | 'gallery' | 'video' | 'video_thumbnail' | 'option' | 'size') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const uploadSingleFile = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', target === 'video' ? 'videos' : 'products');

        const xhr = new XMLHttpRequest();
        const endpoint = target === 'video' ? 'video' : 'image';
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${endpoint}/upload`, true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress((event.loaded / event.total) * 100);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resolve(response.secure_url);
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.send(formData);
      });
    };

    if (target === 'gallery') {
      setIsLoading(true);
      const urls: string[] = [];
      try {
        for (let i = 0; i < files.length; i++) {
          const url = await uploadSingleFile(files[i]);
          urls.push(url);
        }
        setData(prev => ({ 
          ...prev, 
          images: [...(prev.images || []), ...urls],
          imageURLs: [...(prev.images || []), ...urls]
        }));
        toast({ title: `${urls.length} Photos Synchronized` });
      } catch (err) {
        toast({ title: "Ingest Failed", variant: "destructive" });
      } finally {
        setIsLoading(false);
        setUploadProgress(null);
      }
    } else {
      setUploadProgress(0);
      try {
        const finalUrl = await uploadSingleFile(files[0]);
        if (target === 'thumbnail') setData(prev => ({ ...prev, thumbnail: finalUrl }));
        else if (target === 'video') setData(prev => ({ ...prev, videoSection: { ...prev.videoSection!, url: finalUrl } }));
        else if (target === 'video_thumbnail') setData(prev => ({ ...prev, videoSection: { ...prev.videoSection!, thumbnailUrl: finalUrl } }));
        else if (target === 'option' && uploadingOptionInfo) {
          const { groupId, optionId } = uploadingOptionInfo;
          const groups = [...(data.optionGroups || [])];
          const gIdx = groups.findIndex(g => g.id === groupId);
          if (gIdx !== -1) {
            const oIdx = groups[gIdx].options.findIndex(o => o.id === optionId);
            if (oIdx !== -1) {
              groups[gIdx].options[oIdx].imageUrl = finalUrl;
              setData(prev => ({ ...prev, optionGroups: groups }));
            }
          }
        } else if (target === 'size' && uploadingSizeIndex !== null) {
          const sizes = [...(data.segmentConfig?.vinyl?.presetSizes || [])];
          if (sizes[uploadingSizeIndex]) {
            sizes[uploadingSizeIndex].imageUrl = finalUrl;
            updateVinylConfig({ presetSizes: sizes });
          }
        }
        toast({ title: "Asset Ingested" });
      } catch (err) {
        toast({ title: "Ingest Failed", variant: "destructive" });
      } finally {
        setUploadProgress(null);
        setUploadingOptionInfo(null);
        setUploadingSizeIndex(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between sticky top-16 bg-background/95 backdrop-blur z-20 py-4 border-b">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Scaling className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-headline tracking-tight uppercase italic">
              {isNew ? `Configure ${data.segment}` : `Architecting: ${data.name}`}
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Print Segment: {data.segment}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => router.back()}>Discard —</Button>
          <Button className="rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 shadow-lg" onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Publish Logic —
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basics" className="w-full">
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 h-auto flex-wrap bg-muted/50 p-1 rounded-2xl">
          <TabsTrigger value="basics" className="py-2 rounded-xl text-[9px] font-black uppercase tracking-widest"><Layout className="mr-2 h-3 w-3" /> Basics</TabsTrigger>
          <TabsTrigger value="segment" className="py-2 rounded-xl text-[9px] font-black uppercase tracking-widest"><Scaling className="mr-2 h-3 w-3" /> Config</TabsTrigger>
          <TabsTrigger value="pricing" className="py-2 rounded-xl text-[9px] font-black uppercase tracking-widest"><DollarSign className="mr-2 h-3 w-3" /> Engine</TabsTrigger>
          <TabsTrigger value="options" className="py-2 rounded-xl text-[9px] font-black uppercase tracking-widest"><Settings2 className="mr-2 h-3 w-3" /> Options</TabsTrigger>
          <TabsTrigger value="media" className="py-2 rounded-xl text-[9px] font-black uppercase tracking-widest"><ImageIcon className="mr-2 h-3 w-3" /> Media</TabsTrigger>
          <TabsTrigger value="workflow" className="py-2 rounded-xl text-[9px] font-black uppercase tracking-widest"><Clock className="mr-2 h-3 w-3" /> Workflow</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="basics" className="space-y-6 m-0 animate-in fade-in duration-500">
            <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
              <CardHeader className="bg-muted/30 border-b py-6 px-8">
                <CardTitle className="text-lg font-black uppercase tracking-tight">Identity & Status</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Catalog Name</Label>
                    <Input value={data.name ?? ''} onChange={e => setData({...data, name: e.target.value})} className="h-12 rounded-xl bg-muted/5 border-2 font-bold" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Interface Template</Label>
                    <Select value={data.uiTemplate || 'Standard'} onValueChange={v => setData({...data, uiTemplate: v as any})}>
                      <SelectTrigger className="h-12 rounded-xl bg-muted/5 border-2 font-bold"><SelectValue placeholder="Select UI Template" /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Standard" className="text-[10px] font-bold uppercase">Standard Product</SelectItem>
                        <SelectItem value="Rolls / DTF" className="text-[10px] font-bold uppercase">Rolls / DTF Master</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Product Tagline (Sub-header)</Label>
                  <Input value={data.tagline ?? ''} onChange={e => setData({...data, tagline: e.target.value})} className="h-12 rounded-xl bg-muted/5 border-2 italic font-medium" placeholder="e.g. Print Society — Professional Engineering" />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Sticker Pack</Label>
                    <Input value={data.category ?? ''} onChange={e => setData({...data, category: e.target.value})} className="h-12 rounded-xl bg-muted/5 border-2" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Status</Label>
                    <Select value={data.status || 'Draft'} onValueChange={v => setData({...data, status: v as any})}>
                      <SelectTrigger className="h-12 rounded-xl bg-muted/5 border-2 font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Active" className="text-[10px] font-bold uppercase">Active</SelectItem>
                        <SelectItem value="Draft" className="text-[10px] font-bold uppercase">Draft</SelectItem>
                        <SelectItem value="Archived" className="text-[10px] font-bold uppercase">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Meta Short Description</Label>
                  <Input value={data.shortDescription ?? ''} onChange={e => setData({...data, shortDescription: e.target.value})} className="h-12 rounded-xl bg-muted/5 border-2" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Full Long Description</Label>
                  <Textarea value={data.longDescription ?? ''} onChange={e => setData({...data, longDescription: e.target.value})} rows={6} className="rounded-xl bg-muted/5 border-2" />
                </div>

                <Separator />

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Marketing & Trust Module (Quality Promise)
                  </h4>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Module Title</Label>
                      <Input 
                        value={data.marketing?.qualityPromiseTitle || ''} 
                        onChange={e => setData({...data, marketing: {...data.marketing!, qualityPromiseTitle: e.target.value}})}
                        className="h-12 rounded-xl bg-muted/5 border-2 font-bold" 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Button Text</Label>
                      <Input 
                        value={data.marketing?.qualityPromiseButtonText || ''} 
                        onChange={e => setData({...data, marketing: {...data.marketing!, qualityPromiseButtonText: e.target.value}})}
                        className="h-12 rounded-xl bg-muted/5 border-2" 
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Narrative Description</Label>
                      <Textarea 
                        value={data.marketing?.qualityPromiseDescription || ''} 
                        onChange={e => setData({...data, marketing: {...data.marketing!, qualityPromiseDescription: e.target.value}})}
                        className="min-h-[100px] rounded-xl bg-muted/5 border-2" 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Button Action (URL)</Label>
                      <Input 
                        value={data.marketing?.qualityPromiseButtonLink || ''} 
                        onChange={e => setData({...data, marketing: {...data.marketing!, qualityPromiseButtonLink: e.target.value}})}
                        className="h-12 rounded-xl bg-muted/5 border-2 font-mono" 
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="segment" className="space-y-6 m-0 animate-in fade-in duration-500">
            <input type="file" ref={sizeImageInputRef} className="hidden" onChange={e => handleUpload(e, 'size')} accept="image/*" />
            
            {isRollLayout && (
              <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm border-primary/20 bg-primary/5">
                <CardHeader className="bg-primary/10 border-b border-primary/20 py-6 px-8 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg font-black uppercase tracking-tight text-primary">Production Specifications Chart</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={data.productionSpecs?.showChart ?? false} 
                      onCheckedChange={v => updateProductionSpecs({ showChart: v })} 
                    />
                    <Label className="text-[9px] font-black uppercase tracking-widest">Show on Storefront</Label>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  {data.productionSpecs?.showChart ? (
                    <div className="grid gap-8 animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Environmental Durability (Outdoor Life)</Label>
                          <Input 
                            value={data.productionSpecs.outdoorLife} 
                            onChange={e => updateProductionSpecs({ outdoorLife: e.target.value })} 
                            className="h-12 rounded-xl bg-background border-2 font-bold" 
                            placeholder="e.g. 3-5 years" 
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Material Thickness</Label>
                          <Input 
                            value={data.productionSpecs.thickness} 
                            onChange={e => updateProductionSpecs({ thickness: e.target.value })} 
                            className="h-12 rounded-xl bg-background border-2 font-bold" 
                            placeholder="e.g. 6 mil" 
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="flex items-center justify-between p-4 bg-background border-2 rounded-2xl">
                          <div className="space-y-0.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest">Pressure Sensitive</Label>
                            <p className="text-[8px] text-muted-foreground uppercase font-bold">Standard adhesive backing.</p>
                          </div>
                          <Switch 
                            checked={data.productionSpecs?.pressureSensitive ?? true} 
                            onCheckedChange={v => updateProductionSpecs({ pressureSensitive: v })} 
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-background border-2 rounded-2xl">
                          <div className="space-y-0.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest">Air Release Technology</Label>
                            <p className="text-[8px] text-muted-foreground uppercase font-bold">Prevents air bubbles during application.</p>
                          </div>
                          <Switch 
                            checked={data.productionSpecs?.airRelease ?? true} 
                            onCheckedChange={v => updateProductionSpecs({ airRelease: v })} 
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                          <Droplets className="h-3.5 w-3.5" /> Ink Compatibility Registry
                        </Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                          {[
                            { key: 'ecoSolvent', label: 'Eco-Solvent' },
                            { key: 'latex', label: 'Latex' },
                            { key: 'solvent', label: 'Solvent' },
                            { key: 'uvInk', label: 'UV Ink' },
                            { key: 'regularInkjet', label: 'Inkjet' }
                          ].map(ink => (
                            <div key={ink.key} className="flex items-center space-x-3 p-4 bg-background rounded-2xl border-2 transition-all hover:border-primary/30">
                              <Checkbox 
                                id={`ink-${ink.key}`} 
                                checked={(data.productionSpecs?.compatibility as any)?.[ink.key] ?? false}
                                onCheckedChange={v => updateCompatibility(ink.key as any, !!v)}
                              />
                              <label htmlFor={`ink-${ink.key}`} className="text-[10px] font-black uppercase tracking-tighter cursor-pointer">{ink.label}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center opacity-30 italic font-black uppercase tracking-widest text-[10px]">
                      Enable spec chart to configure technical data points.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {isRollLayout ? (
              <div className="space-y-8">
                <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
                  <CardHeader className="bg-primary/5 border-b border-primary/10 py-6 px-8 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-primary">
                      <Box className="h-5 w-5" /> Roll Architecture & Pricing
                    </CardTitle>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-3">
                        <Switch checked={data.segmentConfig?.roll?.sellByRoll} onCheckedChange={v => updateRollConfig({ sellByRoll: v })} />
                        <Label className="text-[9px] font-black uppercase">Sell by Roll</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={data.segmentConfig?.roll?.sellByYard} onCheckedChange={v => updateRollConfig({ sellByYard: v })} />
                        <Label className="text-[9px] font-black uppercase">Sell by Yard</Label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Global Yard Rate ($/yd)</Label>
                          <Input type="number" step="0.01" value={data.segmentConfig?.roll?.basePricePerYard} onChange={e => updateRollConfig({ basePricePerYard: parseFloat(e.target.value) || 0 })} className="h-12 border-2 rounded-xl font-black text-primary" />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Global Roll Rate ($/ea)</Label>
                          <Input type="number" step="0.01" value={data.segmentConfig?.roll?.pricePerRoll} onChange={e => updateRollConfig({ pricePerRoll: parseFloat(e.target.value) || 0 })} className="h-12 border-2 rounded-xl font-black text-emerald-600" />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Standard Yards/Roll</Label>
                          <Input type="number" value={data.segmentConfig?.roll?.yardsPerRoll} onChange={e => updateRollConfig({ yardsPerRoll: parseFloat(e.target.value) || 0 })} className="h-12 border-2 rounded-xl font-bold" />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Display Interface</Label>
                          <Select value={data.segmentConfig?.roll?.displayType || 'panels'} onValueChange={v => updateRollConfig({ displayType: v as any })}>
                            <SelectTrigger className="h-12 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="panels" className="text-[10px] font-bold uppercase">Grid Panels</SelectItem>
                              <SelectItem value="dropdown" className="text-[10px] font-bold uppercase">Dropdown Menu</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Material Width Specification (Differentiated Pricing)</Label>
                        <Button variant="outline" size="sm" className="rounded-xl h-8 border-2 font-bold uppercase text-[9px]" onClick={() => {
                          const sizes = [...(data.segmentConfig?.roll?.rollSizes || []), { id: Math.random().toString(36).substr(2,9), label: 'NEW WIDTH', fullRollYards: 50, fullRollPrice: 450, baseYardPrice: 12, allowYardage: true, inventoryTrait: 'new', inventoryCount: 0, vinylFinish: 'Gloss' }];
                          updateRollConfig({ rollSizes: sizes });
                        }}><Plus className="h-3 w-3 mr-1" /> Add Width —</Button>
                      </div>
                      <div className="grid gap-4">
                        {(data.segmentConfig?.roll?.rollSizes || []).map((size, idx) => (
                          <div className="p-6 bg-muted/5 border-2 rounded-[2rem] space-y-6 relative group flex gap-6" key={size.id}>
                            <div className="flex flex-col gap-1 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-background border shadow-sm" onClick={() => moveRollSize(idx, 'up')} disabled={idx === 0}><ArrowUp className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-background border shadow-sm" onClick={() => moveRollSize(idx, 'down')} disabled={idx === (data.segmentConfig?.roll?.rollSizes?.length || 0) - 1}><ArrowDown className="h-4 w-4" /></Button>
                            </div>
                            
                            <div className="flex-1 space-y-6">
                              <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
                                <div className="grid gap-1.5">
                                  <Label className="text-[8px] font-black uppercase opacity-40">Width Label</Label>
                                  <Input value={size.label} onChange={e => {
                                    const sizes = [...(data.segmentConfig?.roll?.rollSizes || [])];
                                    sizes[idx].label = e.target.value.toUpperCase();
                                    updateRollConfig({ rollSizes: sizes });
                                  }} className="h-10 font-bold" />
                                </div>
                                <div className="grid gap-1.5">
                                  <Label className="text-[8px] font-black uppercase opacity-40">Vinyl Finish</Label>
                                  <Input value={size.vinylFinish || ''} onChange={e => {
                                    const sizes = [...(data.segmentConfig?.roll?.rollSizes || [])];
                                    sizes[idx].vinylFinish = e.target.value;
                                    updateRollConfig({ rollSizes: sizes });
                                  }} className="h-10" placeholder="Gloss / Matte" />
                                  <p className="text-[7px] text-muted-foreground uppercase font-bold tracking-tighter">Use "/" for choice (e.g. Gloss / Matte)</p>
                                </div>
                                <div className="grid gap-1.5">
                                  <Label className="text-[8px] font-black uppercase opacity-40 text-emerald-600">Roll Price ($)</Label>
                                  <Input type="number" step="0.01" value={size.fullRollPrice} onChange={e => {
                                    const sizes = [...(data.segmentConfig?.roll?.rollSizes || [])];
                                    sizes[idx].fullRollPrice = parseFloat(e.target.value) || 0;
                                    updateRollConfig({ rollSizes: sizes });
                                  }} className="h-10 border-emerald-500/20" />
                                </div>
                                <div className="grid gap-1.5">
                                  <Label className="text-[8px] font-black uppercase opacity-40 text-primary">Yard Price ($)</Label>
                                  <Input type="number" step="0.01" value={size.baseYardPrice} onChange={e => {
                                    const sizes = [...(data.segmentConfig?.roll?.rollSizes || [])];
                                    sizes[idx].baseYardPrice = parseFloat(e.target.value) || 0;
                                    updateRollConfig({ rollSizes: sizes });
                                  }} className="h-10 border-primary/20" />
                                </div>
                                <div className="grid gap-1.5">
                                  <Label className="text-[8px] font-black uppercase opacity-40 text-emerald-700">Stock (Rolls)</Label>
                                  <div className="relative">
                                    <Hash className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-emerald-600 opacity-40" />
                                    <Input type="number" value={size.inventoryCount || 0} onChange={e => {
                                      const sizes = [...(data.segmentConfig?.roll?.rollSizes || [])];
                                      sizes[idx].inventoryCount = parseInt(e.target.value) || 0;
                                      updateRollConfig({ rollSizes: sizes });
                                    }} className="h-10 pl-7 border-emerald-500/30 font-black text-emerald-700" />
                                  </div>
                                </div>
                                <div className="grid gap-1.5">
                                  <Label className="text-[8px] font-black uppercase opacity-40">Trait</Label>
                                  <Input value={size.inventoryTrait} onChange={e => {
                                    const sizes = [...(data.segmentConfig?.roll?.rollSizes || [])];
                                    sizes[idx].inventoryTrait = e.target.value.toLowerCase();
                                    updateRollConfig({ rollSizes: sizes });
                                  }} className="h-10 font-mono" placeholder="e.g. 24-inch" />
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-8 pt-4 border-t border-dashed">
                                <div className="flex items-center gap-3">
                                  <Switch checked={size.allowYardage} onCheckedChange={v => {
                                    const sizes = [...(data.segmentConfig?.roll?.rollSizes || [])];
                                    sizes[idx].allowYardage = v;
                                    updateRollConfig({ rollSizes: sizes });
                                  }} />
                                  <Label className="text-[9px] font-black uppercase tracking-widest">Enable Custom Yardage</Label>
                                </div>
                                {size.allowYardage && (
                                  <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border">
                                    <Label className="text-[9px] font-black uppercase opacity-40">Max Cap (Yds)</Label>
                                    <Input type="number" value={size.maxYardage || 50} onChange={e => {
                                      const sizes = [...(data.segmentConfig?.roll?.rollSizes || [])];
                                      sizes[idx].maxYardage = parseFloat(e.target.value) || 0;
                                      updateRollConfig({ rollSizes: sizes });
                                    }} className="h-8 w-20 border-none bg-transparent font-black" />
                                  </div>
                                )}
                              </div>
                            </div>

                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                              const sizes = (data.segmentConfig?.roll?.rollSizes || []).filter(s => s.id !== size.id);
                              updateRollConfig({ rollSizes: sizes });
                            }}><Trash className="h-4 w-4" /></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-8">
                <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
                  <CardHeader className="bg-primary/5 border-b border-primary/10 py-6 px-8">
                    <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-primary">
                      <Ruler className="h-5 w-5" /> Sticker Size Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-4">
                    {(data.segmentConfig?.vinyl?.presetSizes || []).map((size, idx) => (
                      <div key={idx} className="flex flex-wrap gap-4 items-center p-6 bg-muted/5 border-2 rounded-[2rem] group hover:border-primary/30 transition-all">
                        <div 
                          className="h-14 w-14 rounded-xl border-2 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden relative group/img bg-muted/30"
                          onClick={() => triggerSizeImageUpload(idx)}
                        >
                          {size.imageUrl ? <img src={size.imageUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 opacity-20" />}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <Upload className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="grid gap-1.5 flex-1 min-w-[140px]">
                          <Label className="text-[9px] font-black uppercase tracking-tighter opacity-40">Preset Label</Label>
                          <Input value={size.label ?? ''} onChange={e => {
                            const sizes = [...(data.segmentConfig?.vinyl?.presetSizes || [])];
                            sizes[idx].label = e.target.value;
                            updateVinylConfig({ presetSizes: sizes });
                          }} className="h-10 font-bold" />
                        </div>
                        <div className="grid gap-1.5 w-24">
                          <Label className="text-[9px] font-black uppercase tracking-tighter opacity-40">Width (in)</Label>
                          <Input type="number" value={size.width} onChange={e => {
                            const sizes = [...(data.segmentConfig?.vinyl?.presetSizes || [])];
                            sizes[idx].width = parseFloat(e.target.value) || 0;
                            updateVinylConfig({ presetSizes: sizes });
                          }} className="h-10" />
                        </div>
                        <div className="grid gap-1.5 w-24">
                          <Label className="text-[9px] font-black uppercase tracking-tighter opacity-40">Height (in)</Label>
                          <Input type="number" value={size.height} onChange={e => {
                            const sizes = [...(data.segmentConfig?.vinyl?.presetSizes || [])];
                            sizes[idx].height = parseFloat(e.target.value) || 0;
                            updateVinylConfig({ presetSizes: sizes });
                          }} className="h-10" />
                        </div>
                        <div className="grid gap-1.5 w-28">
                          <Label className="text-[9px] font-black uppercase tracking-tighter text-primary">Price Modifier ($)</Label>
                          <Input type="number" step="0.01" value={size.price} onChange={e => {
                            const sizes = [...(data.segmentConfig?.vinyl?.presetSizes || [])];
                            sizes[idx].price = parseFloat(e.target.value) || 0;
                            updateVinylConfig({ presetSizes: sizes });
                          }} className="h-10 font-black text-primary border-primary/20" />
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive mt-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                          const sizes = (data.segmentConfig?.vinyl?.presetSizes || []).filter((_, i) => i !== idx);
                          updateVinylConfig({ presetSizes: sizes });
                        }}><Trash className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full h-16 border-dashed rounded-[2rem] font-black uppercase tracking-widest text-xs" onClick={() => {
                      const sizes = [...(data.segmentConfig?.vinyl?.presetSizes || []), { label: 'NEW SIZE', width: 2, height: 2, price: 0.50, discount: 0, imageUrl: '' }];
                      updateVinylConfig({ presetSizes: sizes });
                    }}><PlusCircle className="h-5 w-5 mr-2" /> Add Size —</Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6 m-0 animate-in fade-in duration-500">
            <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
              <CardHeader className="bg-muted/30 border-b py-6 px-8">
                <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" /> Pricing & Unit Economics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Base Unit Price ($)</Label>
                    <Input type="number" step="0.01" value={data.pricingModel?.basePrice} onChange={e => setData({...data, pricingModel: {...data.pricingModel!, basePrice: parseFloat(e.target.value) || 0}})} className="h-12 rounded-xl bg-muted/5 border-2 font-black text-primary" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Unit Production Cost ($)</Label>
                    <Input type="number" step="0.01" value={data.pricingModel?.costPerUnit} onChange={e => setData({...data, pricingModel: {...data.pricingModel!, costPerUnit: parseFloat(e.target.value) || 0}})} className="h-12 rounded-xl bg-muted/5 border-2" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60 text-emerald-600">Min Order Value ($)</Label>
                    <Input type="number" step="0.01" value={data.pricingModel?.minPrice} onChange={e => setData({...data, pricingModel: {...data.pricingModel!, minPrice: parseFloat(e.target.value) || 0}})} className="h-12 rounded-xl bg-muted/5 border-2 font-black text-emerald-600" />
                  </div>
                </div>
                <Separator />
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Volume Tiers (Qty vs Price)</Label>
                    <Button variant="outline" size="sm" className="rounded-xl h-8 border-2 font-bold uppercase text-[9px]" onClick={() => {
                      const tiers = [...(data.pricingModel?.tiers || []), { min: 100, price: 0.25 }];
                      setData({...data, pricingModel: {...data.pricingModel!, tiers}});
                    }}><Plus className="h-3 w-3 mr-1" /> Add Tier —</Button>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.pricingModel?.tiers?.map((tier, idx) => (
                      <div key={idx} className="p-4 bg-muted/5 border-2 rounded-2xl flex items-center gap-4 group">
                        <div className="grid gap-1.5 flex-1">
                          <Label className="text-[8px] font-black uppercase opacity-40">Min Qty</Label>
                          <Input type="number" value={tier.min} onChange={e => {
                            const tiers = [...(data.pricingModel?.tiers || [])];
                            tiers[idx].min = parseInt(e.target.value) || 0;
                            setData({...data, pricingModel: {...data.pricingModel!, tiers}});
                          }} className="h-10" />
                        </div>
                        <div className="grid gap-1.5 flex-1">
                          <Label className="text-[8px] font-black uppercase opacity-40">Price ($)</Label>
                          <Input type="number" step="0.01" value={tier.price} onChange={e => {
                            const tiers = [...(data.pricingModel?.tiers || [])];
                            tiers[idx].price = parseFloat(e.target.value) || 0;
                            setData({...data, pricingModel: {...data.pricingModel!, tiers}});
                          }} className="h-10 font-bold" />
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive mt-4 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                          const tiers = (data.pricingModel?.tiers || []).filter((_, i) => i !== idx);
                          setData({...data, pricingModel: {...data.pricingModel!, tiers}});
                        }}><Trash className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="options" className="space-y-6 m-0 animate-in fade-in duration-500">
            <input type="file" ref={optionImageInputRef} className="hidden" onChange={e => handleUpload(e, 'option')} accept="image/*" />
            <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
              <CardHeader className="bg-muted/30 border-b py-6 px-8">
                <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" /> Selection Modules
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-10">
                {(data.optionGroups || []).map((group, gIdx) => (
                  <div className="p-8 bg-muted/5 border-2 rounded-[2.5rem] space-y-8 relative group" key={group.id}>
                    <div className="grid md:grid-cols-3 gap-6 items-end">
                      <div className="grid gap-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Module Header</Label>
                        <Input value={group.name ?? ''} onChange={e => {
                          const groups = [...(data.optionGroups || [])];
                          groups[gIdx].name = e.target.value.toUpperCase();
                          setData({...data, optionGroups: groups});
                        }} className="h-12 font-black uppercase italic tracking-tight bg-background border-2" />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Display Interface</Label>
                        <Select value={group.displayType || 'buttons'} onValueChange={v => {
                          const groups = [...(data.optionGroups || [])];
                          groups[gIdx].displayType = v as any;
                          setData({...data, optionGroups: groups});
                        }}>
                          <SelectTrigger className="h-12 rounded-xl bg-background border-2 font-black uppercase text-[10px] tracking-widest"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="buttons" className="text-[10px] font-black uppercase">Grid Buttons</SelectItem>
                            <SelectItem value="dropdown" className="text-[10px] font-black uppercase">Dropdown Menu</SelectItem>
                            <SelectItem value="radio" className="text-[10px] font-black uppercase">Radio List</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-background border-2 rounded-xl h-12">
                        <Label className="text-[10px] font-black uppercase tracking-widest">Mandatory</Label>
                        <Switch checked={!!group.isRequired} onCheckedChange={v => {
                          const groups = [...(data.optionGroups || [])];
                          groups[gIdx].isRequired = v;
                          setData({...data, optionGroups: groups});
                        }} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Individual Choices</Label>
                      <div className="grid gap-3">
                        {group.options.map((opt, oIdx) => (
                          <div key={opt.id} className="flex flex-wrap gap-4 items-center p-4 bg-background border-2 rounded-2xl group/opt hover:border-primary/20 transition-all">
                            <div 
                              className="h-12 w-12 rounded-xl border-2 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden relative group/img bg-muted/30"
                              onClick={() => triggerOptionImageUpload(group.id, opt.id)}
                            >
                              {opt.imageUrl ? <Image src={opt.imageUrl} alt={opt.label} fill className="object-contain" unoptimized /> : <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", "bg-muted text-muted-foreground/40")}>{getIcon(group.name)}</div>}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <Upload className="h-3 w-3 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-[120px] grid gap-1">
                              <Label className="text-[8px] font-black uppercase opacity-40">Choice Label</Label>
                              <Input value={opt.label ?? ''} onChange={e => {
                                const groups = [...(data.optionGroups || [])];
                                groups[gIdx].options[oIdx].label = e.target.value;
                                setData({...data, optionGroups: groups});
                              }} className="h-10 font-bold uppercase text-xs" />
                            </div>
                            <div className="w-32 grid gap-1">
                              <Label className="text-[8px] font-black uppercase opacity-40">Impact Mode</Label>
                              <Select value={opt.priceImpact.type || 'fixed'} onValueChange={v => {
                                const groups = [...(data.optionGroups || [])];
                                groups[gIdx].options[oIdx].priceImpact.type = v as any;
                                setData({...data, optionGroups: groups});
                              }}>
                                <SelectTrigger className="h-10 text-[10px] font-bold uppercase"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fixed">+$ Additive</SelectItem>
                                  <SelectItem value="percent">+% Percent</SelectItem>
                                  <SelectItem value="multiplier">x Multiplier</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="w-24 grid gap-1">
                              <Label className="text-[8px] font-black uppercase opacity-40">Value</Label>
                              <Input type="number" step="0.01" value={opt.priceImpact.value} onChange={e => {
                                const groups = [...(data.optionGroups || [])];
                                groups[gIdx].options[oIdx].priceImpact.value = parseFloat(e.target.value) || 0;
                                setData({...data, optionGroups: groups});
                              }} className="h-10 font-black text-primary" />
                            </div>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive mt-4" onClick={() => {
                              const groups = [...(data.optionGroups || [])];
                              groups[gIdx].options = groups[gIdx].options.filter((_, i) => i !== oIdx);
                              setData({...data, optionGroups: groups});
                            }}><X className="h-4 w-4" /></Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="w-fit h-10 rounded-xl border-dashed px-6 font-black uppercase tracking-widest text-[9px]" onClick={() => {
                          const groups = [...(data.optionGroups || [])];
                          groups[gIdx].options.push({ id: Math.random().toString(36).substr(2,9), label: 'NEW CHOICE', code: 'NEW', isActive: true, priceImpact: { type: 'fixed', value: 0 } });
                          setData({...data, optionGroups: groups});
                        }}><Plus className="h-3 w-3 mr-2" /> Add Choice Modifier</Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full h-16 border-dashed rounded-[2rem] font-black uppercase tracking-widest text-xs" onClick={() => {
                  const groups = [...(data.optionGroups || []), { id: Math.random().toString(36).substr(2,9), name: 'NEW MODULE', displayType: 'buttons' as const, isRequired: false, options: [] }];
                  setData({...data, optionGroups: groups});
                }}><PlusCircle className="h-5 w-5 mr-2" /> Add Selection Module —</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-6 m-0 animate-in fade-in duration-500">
            <input type="file" ref={thumbnailInputRef} className="hidden" onChange={e => handleUpload(e, 'thumbnail')} accept="image/*" />
            <input type="file" ref={galleryInputRef} className="hidden" multiple onChange={e => handleUpload(e, 'gallery')} accept="image/*" />
            <input type="file" ref={videoInputRef} className="hidden" onChange={e => handleUpload(e, 'video')} accept="video/*" />
            <input type="file" ref={videoThumbnailInputRef} className="hidden" onChange={e => handleUpload(e, 'video_thumbnail')} accept="image/*" />
            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
                <CardHeader className="bg-muted/30 border-b py-6 px-8">
                  <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" /> Core Identity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-10 space-y-12">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identity Thumbnail</Label>
                    <div className="flex gap-8 items-start">
                      <div className="h-32 w-32 rounded-3xl border-4 border-dashed border-muted flex items-center justify-center bg-muted/5 shrink-0 overflow-hidden relative group" onClick={() => thumbnailInputRef.current?.click()}>
                        {data.thumbnail ? <img src={data.thumbnail} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="h-8 w-8 text-muted-foreground/20" />}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                          <Upload className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-4">
                        <Input value={data.thumbnail ?? ''} onChange={e => setData({...data, thumbnail: e.target.value})} placeholder="Asset URL" className="h-12 rounded-xl border-2 font-mono text-[10px]" />
                        <p className="text-[10px] text-muted-foreground italic">Primary image shown in catalog and cart.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
                <CardHeader className="bg-muted/30 border-b py-6 px-8 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <Layout className="h-5 w-5 text-primary" /> Showcase Gallery
                  </CardTitle>
                  <Button variant="outline" size="sm" className="rounded-xl h-9 border-2 font-bold uppercase text-[9px]" onClick={() => galleryInputRef.current?.click()}>
                    <Plus className="h-3 w-3 mr-1" /> Add Photos —
                  </Button>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {(data.images || []).map((url, idx) => (
                      <div key={idx} className="aspect-square relative rounded-2xl overflow-hidden border-2 group/img">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full" onClick={() => {
                            const images = (data.images || []).filter((_, i) => i !== idx);
                            setData({ ...data, images, imageURLs: images });
                          }}><Trash className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {uploadProgress !== null && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="h-1" />
                      <p className="text-[8px] font-black uppercase tracking-widest text-primary text-right">Syncing Vault: {Math.round(uploadProgress)}%</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm mt-8">
              <CardHeader className="bg-muted/30 border-b py-6 px-8 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg font-black uppercase tracking-tight">Production Insight Video</CardTitle>
                </div>
                <div className="flex items-center gap-3 bg-background px-4 py-2 rounded-2xl border">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active</span>
                  <Switch 
                    checked={data.videoSection?.isActive} 
                    onCheckedChange={v => setData({...data, videoSection: {...data.videoSection!, isActive: v}})} 
                  />
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Video Heading</Label>
                      <Input value={data.videoSection?.title} onChange={e => setData({...data, videoSection: {...data.videoSection!, title: e.target.value}})} className="h-12 rounded-xl bg-muted/5 border-2 font-bold" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Tagline</Label>
                      <Input value={data.videoSection?.tagline} onChange={e => setData({...data, videoSection: {...data.videoSection!, tagline: e.target.value}})} className="h-12 rounded-xl bg-muted/5 border-2" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Description</Label>
                      <Textarea value={data.videoSection?.description} onChange={e => setData({...data, videoSection: {...data.videoSection!, description: e.target.value}})} className="min-h-[100px] rounded-xl bg-muted/5 border-2" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Highlight Badge 1</Label>
                        <Input value={data.videoSection?.badge1} onChange={e => setData({...data, videoSection: {...data.videoSection!, badge1: e.target.value}})} className="h-10 rounded-xl border-2" placeholder="e.g. ISO Certified Flow" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Highlight Badge 2</Label>
                        <Input value={data.videoSection?.badge2} onChange={e => setData({...data, videoSection: {...data.videoSection!, badge2: e.target.value}})} className="h-10 rounded-xl border-2" placeholder="e.g. Real-time Telemetry" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Video Source (URL or Upload)</Label>
                      <div className="flex gap-2">
                        <Input value={data.videoSection?.url} onChange={e => setData({...data, videoSection: {...data.videoSection!, url: e.target.value}})} className="h-12 rounded-xl bg-muted/5 border-2 font-mono text-[10px]" placeholder="YouTube or Direct URL" />
                        <Button variant="outline" className="h-12 w-12 rounded-xl border-2" onClick={() => videoInputRef.current?.click()}>
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Thumbnail Cover</Label>
                      <div className="flex gap-2">
                        <Input value={data.videoSection?.thumbnailUrl} onChange={e => setData({...data, videoSection: {...data.videoSection!, thumbnailUrl: e.target.value}})} className="h-12 rounded-xl bg-muted/5 border-2 font-mono text-[10px]" placeholder="Thumbnail URL" />
                        <Button variant="outline" className="h-12 w-12 rounded-xl border-2" onClick={() => videoThumbnailInputRef.current?.click()}>
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 p-4 bg-muted/5 border-2 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <Switch checked={data.videoSection?.autoPlay} onCheckedChange={v => setData({...data, videoSection: {...data.videoSection!, autoPlay: v}})} />
                        <Label className="text-[10px] font-black uppercase">AutoPlay</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={data.videoSection?.loop} onCheckedChange={v => setData({...data, videoSection: {...data.videoSection!, loop: v}})} />
                        <Label className="text-[10px] font-black uppercase">Loop</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workflow" className="space-y-6 m-0 animate-in fade-in duration-500">
            <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm">
              <CardHeader className="bg-muted/30 border-b py-6 px-8">
                <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" /> Processing Protocol
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Turnaround Time (Days)</Label>
                    <Input type="number" value={data.production?.turnaroundDays} onChange={e => setData({...data, production: {...data.production!, turnaroundDays: parseInt(e.target.value) || 0}})} className="h-12 rounded-xl bg-muted/5 border-2 font-bold" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Rush Mark-up (%)</Label>
                    <Input type="number" value={data.production?.rushSurchargePercent} onChange={e => setData({...data, production: {...data.production!, rushSurchargePercent: parseFloat(e.target.value) || 0}})} className="h-12 rounded-xl bg-muted/5 border-2 font-bold" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
