'use client';

import React, { useState, useMemo, useEffect, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { 
  Star, 
  Clock, 
  Truck, 
  Plus, 
  Zap, 
  Package, 
  Loader2, 
  ShieldCheck, 
  ShoppingBag, 
  ArrowRight, 
  Eye, 
  X, 
  Scaling, 
  Calculator, 
  FileText, 
  Upload, 
  ChevronLeft, 
  Info, 
  Check, 
  Timer, 
  Cloud,
  Layers,
  CheckCircle2,
  Box,
  AlertCircle,
  Settings,
  Ruler,
  Play,
  Video,
  FileCheck,
  Shapes,
  Hash,
  Coins,
  Maximize,
  ArrowUpDown,
  Scissors,
  Edit,
  Activity,
  Droplets,
  XCircle,
  Thermometer,
  Wind
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from "@/components/ui/carousel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCollection,
  useMemoFirebase,
  useFirestore,
  useUser,
  useDoc,
  updateDocumentNonBlocking
} from '@/firebase';
import { collection, query, where, limit, doc, onSnapshot } from 'firebase/firestore';
import { ProductTemplate, EmailTemplate } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { toast } from '@/hooks/use-toast';

const CLOUDINARY_CLOUD_NAME = "dabgothkm";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_upload";

function ProductDetailContent({ slug }: { slug: string }) {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState<number>(0);
  const [purchaseMode, setPurchaseMode] = useState<'roll' | 'yard'>('yard');
  const [selectedRollPresetId, setSelectedRollPresetId] = useState<string>('');
  const [selectedSizeId, setSelectedSizeId] = useState<string>('');
  const [isProceeding, setIsProceeding] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 2, height: 2 });
  const [isRush, setIsRush] = useState(false);
  const [notes, setNotes] = useState('');

  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null);
  const [finalArtworkUrl, setFinalArtworkUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadingArtwork, setIsUploadingArtwork] = useState(false);

  // Administrative Quick-Edit State
  const [isEditingTurnaround, setIsEditingTurnaround] = useState(false);
  const [tempTurnaround, setTempTurnaround] = useState<number>(5);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const productByIdRef = useMemoFirebase(() => {
    if (!slug) return null;
    return doc(db, 'products', slug);
  }, [db, slug]);
  const { data: productById, isLoading: isIdLoading } = useDoc<ProductTemplate>(productByIdRef);

  const productQuery = useMemoFirebase(() => {
    if (!slug || slug.trim() === "") return null;
    return query(collection(db, 'products'), where('slug', '==', slug), limit(1));
  }, [db, slug]);
  const { data: dbProducts, isLoading: isSlugLoading } = useCollection<ProductTemplate>(productQuery);

  const product = useMemo(() => {
    if (productById) return productById;
    if (dbProducts && dbProducts.length > 0) return dbProducts[0];
    return null;
  }, [productById, dbProducts]);

  const roleRef = useMemoFirebase(() => (user ? doc(db, 'roles', user.uid) : null), [db, user]);
  const { data: roleData } = useDoc<any>(roleRef);
  const isStaff = !!roleData?.role || user?.uid === 'Iit0JbEKytRkn35p4K0Rat6z4SE3';

  const isProductLoading = isSlugLoading && isIdLoading;

  const isRollLayout = useMemo(() => {
    return product?.segment === 'Roll Printing' || product?.segment === 'DTF' || product?.uiTemplate === 'Rolls / DTF';
  }, [product]);

  const allImages = useMemo(() => {
    if (!product) return [];
    const list = new Set<string>();
    if (product.thumbnail) list.add(product.thumbnail);
    const extraImages = [...(product.images || []), ...(product.imageURLs || [])];
    extraImages.forEach(img => {
      if (img) list.add(img);
    });
    return Array.from(list);
  }, [product]);

  const selectedSize = useMemo(() => 
    product?.segmentConfig?.roll?.rollSizes?.find(s => s.id === selectedSizeId),
  [product, selectedSizeId]);

  useEffect(() => {
    if (isMounted && product && product.optionGroups?.length > 0) {
      const initial: Record<string, string> = {};
      let hasFoundValidInitial = false;
      
      product.optionGroups.forEach(group => {
        if (group.options?.length > 0) {
          const defaultOpt = group.options.find(o => o.isActive) || group.options[0];
          initial[group.id] = defaultOpt.id;
          hasFoundValidInitial = true;
        }
      });
      
      const currentKeys = Object.keys(selectedOptions);
      if (hasFoundValidInitial && currentKeys.length === 0) {
        setSelectedOptions(initial);
      }
    }
  }, [product, isMounted, selectedOptions]);

  useEffect(() => {
    if (isMounted && isRollLayout && product?.segmentConfig?.roll?.rollSizes?.length > 0 && !selectedSizeId) {
      setSelectedSizeId(product.segmentConfig.roll.rollSizes[0].id);
    }
  }, [product, isMounted, selectedSizeId, isRollLayout]);

  useEffect(() => {
    if (isMounted && product && quantity === 0) {
      if (isRollLayout && product.segmentConfig?.roll) {
        const config = product.segmentConfig.roll;
        const mode = config.sellByYard ? 'yard' : 'roll';
        setPurchaseMode(mode);
        setQuantity(1);
        if (config.rollPresets?.length > 0) {
          setSelectedRollPresetId(config.rollPresets[0].id);
        }
      } else if (product.pricingModel?.tiers?.length > 0) {
        setQuantity(product.pricingModel.tiers[0].min);
      } else {
        setQuantity(1);
      }
    }
  }, [product, isMounted, quantity, isRollLayout]);

  useEffect(() => {
    if (product?.production?.turnaroundDays) {
      setTempTurnaround(product.production.turnaroundDays);
    }
  }, [product]);

  // Auto-select first vinyl finish if multiple options exist
  useEffect(() => {
    if (isMounted && selectedSize && isRollLayout) {
      const options = selectedSize.vinylFinish?.split('/').map(s => s.trim()).filter(s => !!s) || [];
      if (options.length > 1) {
        if (!selectedOptions['Vinyl Finish'] || !options.includes(selectedOptions['Vinyl Finish'])) {
          setSelectedOptions(prev => ({ ...prev, 'Vinyl Finish': options[0] }));
        }
      } else if (options.length === 1) {
        if (selectedOptions['Vinyl Finish'] !== options[0]) {
          setSelectedOptions(prev => ({ ...prev, 'Vinyl Finish': options[0] }));
        }
      } else {
        if (selectedOptions['Vinyl Finish']) {
          const { 'Vinyl Finish': _, ...rest } = selectedOptions;
          setSelectedOptions(rest);
        }
      }
    }
  }, [selectedSize, isMounted, isRollLayout, selectedOptions]);

  const handleUpdateTurnaround = () => {
    if (!product?.id) return;
    updateDocumentNonBlocking(doc(db, 'products', product.id), {
      'production.turnaroundDays': tempTurnaround,
      updatedAt: new Date().toISOString()
    });
    setIsEditingTurnaround(false);
    toast({ title: "Registry Updated", description: "Production turnaround time has been synchronized." });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "File Too Large", description: "Max file size is 50MB.", variant: "destructive" });
        return;
      }
      setArtworkFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setArtworkPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setArtworkPreview(null);
      }
      setIsUploadingArtwork(true);
      setUploadProgress(0);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', `artwork/pending/${user?.uid || 'guest'}`);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, true);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress((event.loaded / event.total) * 100);
          }
        };
        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            setFinalArtworkUrl(response.secure_url);
            setIsUploadingArtwork(false);
            toast({ title: "Artwork Synchronized", description: "File successfully ingested." });
          } else {
            toast({ title: "Sync Failed", description: "Could not upload artwork.", variant: "destructive" });
            setIsUploadingArtwork(false);
          }
        };
        xhr.onerror = () => {
          toast({ title: "Sync Failed", description: "Network error during upload.", variant: "destructive" });
          setIsUploadingArtwork(false);
        };
        xhr.send(formData);
      } catch (err) {
        setIsUploadingArtwork(false);
      }
    }
  };

  const FileInput = () => <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.ai,.eps,.png,.jpg,.jpeg,.svg" />;

  const calculateFullUnitPrice = (qty: number, options: Record<string, string>, dims: {width: number, height: number}, rush: boolean) => {
    if (!product) return 0;
    let unitPrice = 0;
    if (isRollLayout && product.segmentConfig?.roll) {
      const config = product.segmentConfig.roll;
      if (purchaseMode === 'roll') {
        if (selectedSize) {
          unitPrice = selectedSize.fullRollPrice;
        } else {
          const preset = config.rollPresets?.find(p => p.id === selectedRollPresetId);
          unitPrice = preset ? preset.price : config.pricePerRoll;
        }
      } else {
        if (selectedSize) {
          unitPrice = selectedSize.baseYardPrice;
        } else {
          const base = config.basePricePerYard;
          const matchingTier = [...(config.tierPricing || [])]
            .sort((a, b) => b.minYards - a.minYards)
            .find(t => qty >= t.minYards);
          unitPrice = matchingTier ? matchingTier.pricePerYard : base;
        }
      }
    } else {
      const tiers = product.pricingModel?.tiers || [];
      const applicableTier = [...tiers].sort((a, b) => b.min - a.min).find(t => qty >= t.min);
      unitPrice = applicableTier ? applicableTier.price : (product.pricingModel?.basePrice || 0);
      const vinylConfig = product.segmentConfig?.vinyl;
      const preset = vinylConfig?.presetSizes?.find(s => s.width === dims.width && s.height === dims.height);
      if (preset) {
        unitPrice += (preset.price || 0);
      }
    }
    Object.entries(options).forEach(([key, val]) => {
      const group = product.optionGroups?.find(g => g.id === key);
      const opt = group?.options?.find(o => o.id === val);
      if (opt?.priceImpact) {
        if (opt.priceImpact.type === 'fixed') unitPrice += opt.priceImpact.value;
        if (opt.priceImpact.type === 'percent') unitPrice += (unitPrice * opt.priceImpact.value / 100);
        if (opt.priceImpact.type === 'multiplier') unitPrice *= opt.priceImpact.value;
      }
    });
    if (rush && product.production?.rushSurchargePercent) {
      unitPrice += (unitPrice * product.production.rushSurchargePercent / 100);
    }
    return Math.max(0.01, unitPrice);
  };

  const currentPricePerUnit = useMemo(() => {
    return calculateFullUnitPrice(quantity, selectedOptions, dimensions, isRush);
  }, [product, quantity, purchaseMode, selectedRollPresetId, selectedSize, dimensions, selectedOptions, isRush, isRollLayout]);

  const totalPrice = currentPricePerUnit * quantity;

  const isInventoryBreach = useMemo(() => {
    if (!isRollLayout || !product?.segmentConfig?.roll) return false;
    if (selectedSize && (selectedSize.inventoryCount === 0)) return true;
    if (purchaseMode === 'roll' && selectedSize && (quantity > (selectedSize.inventoryCount || 0))) return true;
    return false;
  }, [quantity, purchaseMode, selectedSize, isRollLayout]);

  const isCapBreach = useMemo(() => {
    if (!isRollLayout || purchaseMode !== 'yard' || !selectedSize?.maxYardage) return false;
    return quantity > selectedSize.maxYardage;
  }, [purchaseMode, selectedSize, quantity, isRollLayout]);

  const handleAddToCart = () => {
    if (!product) return;
    if (isInventoryBreach || isCapBreach) {
      toast({ title: "Procurement Blocked", description: "Requested quantity exceeds available stock.", variant: "destructive" });
      return;
    }
    if (!finalArtworkUrl && product.artworkRequirements?.required && !isRollLayout) {
      toast({ title: "Artwork Required", description: "Please upload your design before proceeding.", variant: "destructive" });
      return;
    }

    const mappedOptions: Record<string, string> = {};
    Object.entries(selectedOptions).forEach(([key, val]) => {
      const group = product.optionGroups?.find(g => g.id === key);
      const opt = group?.options?.find(o => o.id === val);
      if (group && opt) {
        mappedOptions[group.name] = opt.label;
      } else if (key === 'Vinyl Finish') {
        mappedOptions[key] = val as string;
      }
    });

    if (selectedSize) {
      mappedOptions['Size'] = selectedSize.label;
      const finishOptions = selectedSize.vinylFinish?.split('/').map(s => s.trim()).filter(s => !!s) || [];
      if (finishOptions.length > 1 && selectedOptions['Vinyl Finish']) {
        mappedOptions['Vinyl Finish'] = selectedOptions['Vinyl Finish'];
      } else if (finishOptions.length === 1) {
        mappedOptions['Vinyl Finish'] = finishOptions[0];
      } else if (finishOptions.length === 0 && selectedSize.vinylFinish) {
        mappedOptions['Vinyl Finish'] = selectedSize.vinylFinish;
      }
    }

    let yardsPerUnit = 1;
    if (isRollLayout && product.segmentConfig?.roll) {
      if (purchaseMode === 'roll') {
        yardsPerUnit = selectedSize ? selectedSize.fullRollYards : product.segmentConfig.roll.yardsPerRoll;
      }
    }

    const cartItem = {
      cartId: Math.random().toString(36).substr(2, 9),
      productId: product.id,
      productName: product.name,
      category: product.category,
      quantity,
      selectedOptions: { 
        ...mappedOptions, 
        PurchaseMode: isRollLayout ? (purchaseMode === 'roll' ? 'VINYL ROLL' : 'CUSTOM YARDAGE') : 'PIECE',
        Dimensions: isRollLayout ? (selectedSize ? undefined : 'Full Width') : `${dimensions.width}" x ${dimensions.height}"`,
        Rush: isRush ? 'YES' : 'NO',
        Notes: notes,
        yardsPerUnit,
        turnaroundDays: product.production?.turnaroundDays || 5
      },
      pricePerUnit: currentPricePerUnit,
      thumbnail: product.thumbnail || allImages[0],
      artworkUrl: finalArtworkUrl,
      isProofRequired: product.proofing?.required !== false && !isRollLayout,
      slug: product.slug
    };

    const existingCart = JSON.parse(sessionStorage.getItem('society_cart') || '[]');
    sessionStorage.setItem('society_cart', JSON.stringify([...existingCart, cartItem]));
    
    toast({ 
      title: "Registry Updated", 
      description: `${product.name} has been added to your active cart.` 
    });
  };

  const handleProceedToCheckout = () => {
    handleAddToCart();
    setIsProceeding(true);
    router.push('/checkout');
  };

  const getEmbedUrl = (url: string, autoPlay?: boolean, loop?: boolean) => {
    const id = getYoutubeId(url);
    if (!id) return url;
    let base = `https://www.youtube.com/embed/${id}?`;
    const params = new URLSearchParams();
    if (autoPlay) { params.append('autoplay', '1'); params.append('mute', '1'); }
    if (loop) { params.append('loop', '1'); params.append('playlist', id); }
    params.append('controls', '1');
    params.append('rel', '0');
    params.append('modestbranding', '1');
    return base + params.toString();
  };

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (!isMounted || isProductLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-40">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">Syncing Society Archive...</p>
      </div>
    );
  }

  if (!product) return null;

  const hasOptionGroups = (product.optionGroups || []).some(g => g.options && g.options.length > 0);
  const hasPresetSizes = !isRollLayout && product.segmentConfig?.vinyl?.presetSizes && product.segmentConfig.vinyl.presetSizes.length > 0;
  const hasRollSizes = isRollLayout && product.segmentConfig?.roll?.rollSizes && product.segmentConfig.roll.rollSizes.length > 0;

  return (
    <div className="container max-w-[1600px] mx-auto px-4 py-8 md:py-12 space-y-12">
      <div className="grid lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-8 space-y-10">
          <div className="relative group rounded-2xl overflow-hidden bg-muted/5 border-2">
            <Carousel setApi={setApi} className="w-full">
              <CarouselContent>
                {allImages.map((img, idx) => (
                  <CarouselItem key={`main-${idx}`}>
                    <div className="relative aspect-[16/9] w-full">
                      <Image src={img} alt={product.name} fill className="object-cover" unoptimized priority />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="absolute inset-0 flex items-center justify-between p-6 pointer-events-none">
                <CarouselPrevious className="pointer-events-auto h-12 w-12 bg-black/20 hover:bg-black/40 border-none text-white transition-all backdrop-blur-sm relative left-0" />
                <CarouselNext className="pointer-events-auto h-12 w-12 bg-black/20 hover:bg-black/40 border-none text-white transition-all backdrop-blur-sm relative right-0" />
              </div>
              <div className="absolute top-8 right-8">
                <Badge className="bg-black/40 backdrop-blur-xl text-white border-none font-black text-[11px] h-8 px-4 rounded-xl">{current + 1} / {allImages.length}</Badge>
              </div>
            </Carousel>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <h1 className="text-5xl md:text-7xl font-black font-headline tracking-tighter uppercase italic leading-[0.8] text-foreground">{product.name}</h1>
              <p className="text-xl font-bold uppercase tracking-tight text-foreground/60 italic">
                {product.tagline || 'Print Society — Professional Engineering'}
              </p>
            </div>
            <div className="space-y-6 max-w-3xl">
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-medium">{product.longDescription}</p>
              <div className="flex flex-wrap gap-10 pt-4">
                {isRollLayout ? (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📦</span>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Inventory Status</p>
                      {isInventoryBreach ? (
                        <p className="text-sm font-black uppercase italic text-rose-500">Out of Stock</p>
                      ) : (
                        <p className="text-sm font-black uppercase italic text-emerald-600">
                          Currently in stock: {selectedSize?.inventoryCount || 0} Rolls
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3"><span className="text-2xl">⛈️</span><div className="space-y-0.5"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Durability</p><p className="text-sm font-black uppercase italic">4–5 years outdoors</p></div></div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⏱️</span>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Processing Time</p>
                    <div className="flex items-center gap-2">
                      {isEditingTurnaround ? (
                        <div className="flex items-center gap-2 animate-in fade-in">
                          <Input 
                            type="number" 
                            className="h-8 w-16 text-xs font-black" 
                            value={tempTurnaround} 
                            onChange={e => setTempTurnaround(parseInt(e.target.value) || 0)} 
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={handleUpdateTurnaround}><Check className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={() => setIsEditingTurnaround(false)}><X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-black uppercase italic">{product.production?.turnaroundDays || 5} Days</p>
                          {isStaff && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-40 hover:opacity-100 transition-opacity" onClick={() => setIsEditingTurnaround(true)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground ml-1">Showcase Gallery</h3>
          <div className="grid grid-cols-3 gap-4">
            {allImages.map((img, idx) => (
              <div 
                key={`thumb-${idx}`} 
                className={cn(
                  "aspect-square relative rounded-xl cursor-pointer transition-all duration-500 overflow-hidden bg-muted/10 shadow-lg border-2", 
                  current === idx ? "ring-2 ring-primary ring-offset-4 scale-90 border-primary" : "hover:scale-105 border-muted"
                )} 
                onClick={() => api?.scrollTo(idx)}
              >
                <Image src={img} alt="" fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
          <Card className="p-8 bg-muted/5 border-2 rounded-[2rem] border-dashed space-y-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <h4 className="text-lg font-black uppercase italic tracking-tight leading-none">
                {product.marketing?.qualityPromiseTitle || 'Quality Promise'}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium italic opacity-80">
              {product.marketing?.qualityPromiseDescription || 'Every project is hand-inspected by our boutique production team for precision and adhesive integrity.'}
            </p>
            <Button variant="outline" size="sm" className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-[10px] border-2" asChild>
              <Link href={product.marketing?.qualityPromiseButtonLink || '/help'}>
                {product.marketing?.qualityPromiseButtonText || 'View Artwork Guide —'}
              </Link>
            </Button>
          </Card>
        </div>
      </div>

      <Separator className="bg-muted/20" />

      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch", isRollLayout ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
        {hasOptionGroups && (
          product.optionGroups?.filter(g => g.options && g.options.length > 0).map((group) => {
            const getIcon = (name: string) => {
              if (name.toLowerCase().includes('cut') || name.toLowerCase().includes('shape')) return <Shapes className="h-6 w-6" />;
              if (name.toLowerCase().includes('finish') || name.toLowerCase().includes('material')) return <Box className="h-6 w-6" />;
              return <Layers className="h-6 w-6" />;
            };
            return (
              <Card key={group.id} className="border-2 rounded-[2rem] overflow-hidden shadow-sm flex flex-col bg-card">
                <CardHeader className="p-6 pb-4 flex flex-row items-center gap-3 border-b bg-muted/10">
                  <div className="text-primary">{getIcon(group.name)}</div>
                  <CardTitle className="text-xs font-black uppercase tracking-widest">Select {group.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className={cn("grid gap-3", group.options.length > 2 ? "grid-cols-2" : "grid-cols-1")}>
                    {group.options.map((opt) => (
                      <div key={opt.id} onClick={() => setSelectedOptions(prev => ({...prev, [group.id]: opt.id}))} className={cn("aspect-square p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-3 relative", selectedOptions[group.id] === opt.id ? "border-primary bg-primary/5 shadow-inner" : "border-muted hover:border-primary/20")}>
                        {selectedOptions[group.id] === opt.id && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />}
                        <div className="h-16 w-16 relative flex items-center justify-center">{opt.imageUrl ? <Image src={opt.imageUrl} alt={opt.label} fill className="object-contain" unoptimized /> : <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", selectedOptions[group.id] === opt.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/40")}>{getIcon(group.name)}</div>}</div>
                        <div className="space-y-1"><p className="text-[10px] font-black uppercase tracking-tight leading-tight">{opt.label}</p><p className="text-[8px] font-bold text-muted-foreground uppercase">{(opt.priceImpact?.value || 0) !== 0 ? `+$${opt.priceImpact.value.toFixed(2)}` : 'Included'}</p></div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {(hasPresetSizes || hasRollSizes) && (
          <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm flex flex-col bg-card">
            <CardHeader className="p-6 pb-4 flex flex-row items-center gap-3 border-b bg-muted/10">
              <div className="text-primary"><Scaling className="h-6 w-6" /></div>
              <CardTitle className="text-xs font-black uppercase tracking-widest">{isRollLayout ? 'Material Width' : 'Select Size'}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isRollLayout && product.segmentConfig?.roll?.displayType === 'dropdown' ? (
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Width Options</Label>
                  <Select value={selectedSizeId} onValueChange={setSelectedSizeId}>
                    <SelectTrigger className="h-14 rounded-2xl border-2 font-bold bg-muted/5">
                      <SelectValue placeholder="Select Width" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {product.segmentConfig.roll.rollSizes.map(size => (
                        <SelectItem key={size.id} value={size.id} className="font-bold uppercase py-3">
                          {size.label} {size.baseYardPrice > 0 ? `— $${size.baseYardPrice.toFixed(2)}/yd` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {isRollLayout ? (
                    product.segmentConfig?.roll?.rollSizes?.map((size) => {
                      const isSelected = selectedSizeId === size.id;
                      const netYardPrice = size.baseYardPrice || 0;
                      return (
                        <div key={size.id} className={cn("aspect-square p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-center text-center gap-3 relative", isSelected ? "border-primary bg-primary/5 shadow-inner" : "border-muted hover:border-primary/20")} onClick={() => setSelectedSizeId(size.id)}>
                          {isSelected && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />}
                          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/40")}><Ruler className="h-5 w-5" /></div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-tight leading-tight">{size.label}</p>
                            {(netYardPrice > 0) && <p className="text-[8px] font-bold text-muted-foreground uppercase">${netYardPrice.toFixed(2)}/yd</p>}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    product.segmentConfig?.vinyl?.presetSizes?.map((size, idx) => {
                      const netSizePrice = (size.price || 0) - (size.discount || 0);
                      const isSelected = dimensions.width === size.width && dimensions.height === size.height;
                      return (
                        <div key={`size-${idx}`} className={cn("aspect-square p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-3 relative", isSelected ? "border-primary bg-primary/5 shadow-inner" : "border-muted hover:border-primary/20")} onClick={() => setDimensions({ width: size.width, height: size.height })}>
                          {isSelected && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />}
                          <div className="h-16 w-16 relative flex items-center justify-center">{size.imageUrl ? <Image src={size.imageUrl} alt={size.label} fill className="object-contain" unoptimized /> : <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/40")}><Ruler className="h-5 w-5" /></div>}</div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-tight text-center leading-tight">{size.label}</p>
                            {netSizePrice !== 0 && <p className="text-[8px] font-bold text-muted-foreground uppercase">+{netSizePrice.toFixed(2)}</p>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {isRollLayout && selectedSize && (
                <div className="mt-6 pt-6 border-t-2 border-dashed space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Technical Finish Selection</Label>
                  {(() => {
                    const finishOptions = selectedSize.vinylFinish?.split('/').map(s => s.trim()).filter(s => !!s) || [];
                    if (finishOptions.length > 1) {
                      return (
                        <div className="grid grid-cols-2 gap-2">
                          {finishOptions.map((opt) => {
                            const isSelected = selectedOptions['Vinyl Finish'] === opt;
                            return (
                              <button
                                key={opt}
                                onClick={() => setSelectedOptions(prev => ({ ...prev, 'Vinyl Finish': opt }))}
                                className={cn(
                                  "h-12 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all",
                                  isSelected ? "bg-primary border-primary text-white shadow-lg" : "bg-muted/5 border-muted hover:border-primary/30"
                                )}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border-2 border-primary/10">
                        <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <Droplets className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Vinyl Finish</p>
                          <p className="text-sm font-black uppercase italic tracking-tight leading-none mt-0.5">{selectedSize.vinylFinish || 'Standard Factory Finish'}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm flex flex-col bg-card">
          <CardHeader className="p-6 pb-4 flex flex-row items-center gap-3 border-b bg-muted/10">
            <div className="text-primary"><Hash className="h-6 w-6" /></div>
            <CardTitle className="text-xs font-black uppercase tracking-widest">{isRollLayout ? 'Procurement' : 'Select Quantity'}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {isRollLayout ? (
              <div className="space-y-6">
                <div className="flex bg-muted/20 p-1 rounded-xl gap-1">
                  {product.segmentConfig?.roll?.sellByYard && <button onClick={() => setPurchaseMode('yard')} className={cn("flex-1 h-9 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", purchaseMode === 'yard' ? "bg-background shadow-sm text-primary" : "text-muted-foreground opacity-60")}>By the Yard</button>}
                  {product.segmentConfig?.roll?.sellByRoll && <button onClick={() => setPurchaseMode('roll')} className={cn("flex-1 h-9 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", purchaseMode === 'roll' ? "bg-background shadow-sm text-primary" : "text-muted-foreground opacity-60")}>Stickers</button>}
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase opacity-40 ml-1">{purchaseMode === 'roll' ? 'Quantity (Sticker pack)' : 'Custom Length (Yards)'}</Label>
                  <input type="number" step={purchaseMode === 'roll' ? 1 : 0.1} value={quantity || ''} onChange={e => setQuantity(parseFloat(e.target.value) || 0)} className="h-12 w-full rounded-xl bg-muted/5 border-2 text-lg font-black px-4" />
                  {isRollLayout && (
                    <div className="flex justify-between items-center px-1">
                      {isCapBreach ? <p className="text-[8px] font-black uppercase text-rose-500">Exceeds Max Length</p> : isInventoryBreach ? <p className="text-[8px] font-black uppercase text-rose-500">Stock Exhausted</p> : <p className="text-[8px] font-black uppercase text-emerald-600">Stock Verified</p>}
                      {selectedSize?.maxYardage && <p className="text-[8px] font-bold text-muted-foreground uppercase">MAX: {selectedSize.maxYardage}yd</p>}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {(product.pricingModel?.tiers || []).map((tier, idx) => {
                  const tierUnitPrice = calculateFullUnitPrice(tier.min, selectedOptions, dimensions, isRush);
                  const isSelected = quantity === tier.min;
                  const firstPrice = product.pricingModel?.tiers?.[0]?.price || product.pricingModel?.basePrice || 1;
                  const savePercent = Math.round((1 - (tierUnitPrice / firstPrice)) * 100);
                  return (
                    <div key={`tier-${idx}`} onClick={() => setQuantity(tier.min)} className={cn("p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group relative overflow-hidden", isSelected ? "border-primary bg-primary text-white shadow-lg" : "border-muted hover:border-primary/20")}>
                      <span className="text-xs font-black italic">{tier.min} Stickers</span>
                      <div className="flex items-center gap-3"><span className={cn("text-xs font-black", isSelected ? "text-white" : "text-foreground")}>${(tierUnitPrice * tier.min).toFixed(2)}</span>{savePercent > 0 && <span className={cn("text-[8px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded", isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary")}>Save {savePercent}%</span>}</div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="pt-4 space-y-4">
              <div className="p-6 bg-foreground text-background rounded-3xl shadow-xl flex flex-col items-center gap-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Order Total</p>
                <div className="flex items-baseline gap-3"><span className="text-4xl font-black font-headline italic tracking-tighter text-primary">${totalPrice.toFixed(2)}</span><Badge variant="outline" className="text-[9px] border-primary/20 text-primary font-black uppercase h-5">${currentPricePerUnit.toFixed(2)}/{isRollLayout && purchaseMode === 'yard' ? 'yd' : 'ea'}</Badge></div>
              </div>
              <div className="p-4 bg-amber-400 text-amber-950 rounded-2xl flex items-center gap-3 shadow-lg"><Coins className="h-5 w-5 shrink-0" /><p className="text-[10px] font-black uppercase leading-tight tracking-tight">Earn ${(totalPrice * 0.05).toFixed(2)} Society Credit</p></div>
            </div>
          </CardContent>
        </Card>

        {isRollLayout && (
          <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm flex flex-col bg-card">
            <CardHeader className="p-6 pb-4 flex flex-row items-center gap-3 border-b bg-muted/10">
              <div className="text-primary"><FileText className="h-6 w-6" /></div>
              <CardTitle className="text-xs font-black uppercase tracking-widest">Order Workflow</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-6">
              <FileInput />
              <div onClick={() => fileInputRef.current?.click()} className={cn("border-2 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center text-center gap-4 transition-all cursor-pointer group min-h-[180px]", artworkFile ? "border-emerald-500 bg-emerald-50/5 shadow-inner" : "border-muted hover:border-emerald-500/40 bg-muted/5")}>
                {isUploadingArtwork ? <div className="w-full space-y-4 text-center"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /><div className="space-y-2"><Progress value={uploadProgress} className="h-1.5" /></div></div> : artworkPreview ? <div className="relative h-24 w-24 rounded-2xl overflow-hidden border shadow-sm"><img src={artworkPreview} alt="Preview" className="object-cover h-full w-full" /></div> : <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform"><Upload className="h-6 w-6 text-emerald-600" /></div>}
                <div className="space-y-1"><p className="text-xs font-black uppercase italic tracking-tight truncate max-w-[240px]">{artworkFile ? artworkFile.name : "Click to Upload Artwork"}</p>{!artworkFile && <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">PDF, AI, PNG | MAX 50MB</p>}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Order Notes</Label>
                <Textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Add any special instructions or details for this order..." 
                  className="min-h-[100px] rounded-2xl border-2 bg-muted/5 font-medium text-sm"
                />
              </div>
              <div className="flex flex-col gap-3">
                <Button variant="outline" className="w-full h-12 rounded-xl border-2 font-black uppercase tracking-widest text-[10px] shadow-sm hover:bg-muted/10 transition-all active:scale-95" onClick={handleAddToCart}>
                  Add to Cart —
                </Button>
                <Button className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl transition-all active:scale-[0.98] group" onClick={handleProceedToCheckout} disabled={isProceeding || isUploadingArtwork || isInventoryBreach || isCapBreach}>
                  Checkout <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-2 transition-transform" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {!isRollLayout && (
        <div className="grid gap-6 pt-12 grid-cols-1 lg:grid-cols-2">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-card border-emerald-500/20">
            <CardHeader className="bg-emerald-500/5 py-3 px-8 border-b border-emerald-500/10 flex flex-row items-center gap-3"><Upload className="h-4 w-4 text-emerald-600" /><CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-60 text-emerald-600">Production Ingest</CardTitle></CardHeader>
            <CardContent className="p-8">
              <FileInput />
              <div onClick={() => fileInputRef.current?.click()} className={cn("border-2 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center text-center gap-4 transition-all cursor-pointer group min-h-[180px]", artworkFile ? "border-emerald-500 bg-emerald-50/5 shadow-inner" : "border-muted hover:border-emerald-500/40 bg-muted/5")}>
                {isUploadingArtwork ? <div className="w-full space-y-4 text-center"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /><div className="space-y-2"><Progress value={uploadProgress} className="h-1.5" /></div></div> : artworkPreview ? <div className="relative h-24 w-24 rounded-2xl overflow-hidden border shadow-sm"><img src={artworkPreview} alt="Preview" className="object-cover h-full w-full" /></div> : <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform"><Upload className="h-6 w-6 text-emerald-600" /></div>}
                <div className="space-y-1"><p className="text-xs font-black uppercase italic tracking-tight truncate max-w-[240px]">{artworkFile ? artworkFile.name : "Click to Upload Artwork"}</p>{!artworkFile && <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">PDF, AI, PNG | MAX 50MB</p>}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-card">
            <CardHeader className="bg-muted/30 py-3 px-8 border-b flex flex-row items-center gap-3"><FileText className="h-4 w-4 text-primary" /><CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-60">Order Workflow</CardTitle></CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Order Notes</Label>
                <Textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Add any special instructions or details for this order..." 
                  className="min-h-[100px] rounded-2xl border-2 bg-muted/5 font-medium text-sm"
                />
              </div>
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1 h-16 rounded-2xl border-2 font-black uppercase tracking-widest text-xs shadow-sm hover:bg-muted/10 transition-all active:scale-95" onClick={handleAddToCart}>Add to Cart —</Button>
                <Button className="flex-[2] h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs shadow-2xl transition-all active:scale-[0.98] group" onClick={handleProceedToCheckout} disabled={isProceeding || isUploadingArtwork || isInventoryBreach || isCapBreach}>Checkout <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-2 transition-transform" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {product.productionSpecs?.showChart && (
        <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-xl bg-card animate-in fade-in duration-700 mt-12">
          <CardHeader className="bg-muted/30 border-b py-6 px-10">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl font-black uppercase italic tracking-tight leading-none">Production Specifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-10">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Physical Architecture</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex justify-between items-center p-4 bg-muted/5 border-2 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground opacity-40" />
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Outdoor Life</span>
                      </div>
                      <span className="text-sm font-black italic">{product.productionSpecs.outdoorLife}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted/5 border-2 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <Scaling className="h-4 w-4 text-muted-foreground opacity-40" />
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Thickness</span>
                      </div>
                      <span className="text-sm font-black italic">{product.productionSpecs.thickness}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted/5 border-2 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <Thermometer className="h-4 w-4 text-muted-foreground opacity-40" />
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Pressure Sens.</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {product.productionSpecs.pressureSensitive ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-xs font-black italic">{product.productionSpecs.pressureSensitive ? 'YES' : 'NO'}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-muted/5 border-2 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <Wind className="h-4 w-4 text-muted-foreground opacity-40" />
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Air Release</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {product.productionSpecs.airRelease ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-xs font-black italic">{product.productionSpecs.airRelease ? 'YES' : 'NO'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Ink Compatibility Registry</h4>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { key: 'ecoSolvent', label: 'Eco-Solvent Technology' },
                    { key: 'latex', label: 'HP Latex Series' },
                    { key: 'solvent', label: 'True Solvent Inks' },
                    { key: 'uvInk', label: 'UV-LED Cure' },
                    { key: 'regularInkjet', label: 'Standard Water-based' }
                  ].map(ink => {
                    const isCompatible = (product.productionSpecs?.compatibility as any)?.[ink.key];
                    return (
                      <div key={ink.key} className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                        isCompatible ? "bg-emerald-50/10 border-emerald-500/20" : "bg-muted/5 border-muted opacity-40"
                      )}>
                        <span className="text-xs font-bold uppercase tracking-tight">{ink.label}</span>
                        {isCompatible ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {product.videoSection?.isActive && (
        <section className="mt-20 py-20 border-y-4 border-muted/5 bg-muted/5 rounded-3xl px-8 md:px-16 overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-[1600px] mx-auto">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-[0.3em]">
                  <ShieldCheck className="h-3.5 w-3.5" /> Production Insight
                </div>
                <h2 className="text-4xl md:text-6xl font-black font-headline tracking-tighter uppercase italic leading-none text-foreground">
                  {product.videoSection.title ? product.videoSection.title.split(' ').map((word, i, arr) => (
                    <React.Fragment key={i}>
                      {i === arr.length - 1 ? <span className="text-primary">{word}</span> : word}{' '}
                      {i === 0 && arr.length > 1 && <br/>}
                    </React.Fragment>
                  )) : (<>Manufacturing <br/><span className="text-primary">Mastery</span></>)}
                </h2>
              </div>
              <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed italic opacity-80">
                {product.videoSection.description}
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3 px-6 py-3 rounded-2xl border-2 bg-background shadow-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{product.videoSection.badge1 || "ISO Certified Flow"}</span>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 rounded-2xl border-2 bg-background shadow-sm">
                  <span className="text-[10px] font-black uppercase tracking-widest">{product.videoSection.badge2 || "Real-time Telemetry"}</span>
                </div>
              </div>
            </div>
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-[0_40px_100px_-15px_rgba(0,0,0,0.3)] border-8 border-background bg-zinc-950 group cursor-pointer transition-transform duration-700 hover:scale-[1.02]">
              {product.videoSection.url && (product.videoSection.url.includes('youtube') || product.videoSection.url.includes('youtu.be')) ? (
                <iframe className="w-full h-full" src={getEmbedUrl(product.videoSection.url, product.videoSection.autoPlay, product.videoSection.loop)} title="Production Insight" allowFullScreen />
              ) : product.videoSection.url ? (
                <video className="w-full h-full object-cover" src={product.videoSection.url} autoPlay={product.videoSection.autoPlay} loop={product.videoSection.loop} muted={product.videoSection.autoPlay} controls poster={product.videoSection.thumbnailUrl} />
              ) : (
                <>
                  <img src={product.videoSection.thumbnailUrl || "https://picsum.photos/seed/bts/1200/800"} alt="Production Insight" className="object-cover w-full h-full opacity-60 group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center shadow-2xl group-hover:scale-110 transition-all duration-500">
                      <Play className="h-10 w-10 text-white fill-current translate-x-1" />
                    </div>
                  </div>
                </>
              )}
              <div className="absolute top-8 left-8"><div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /></div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function ProductDetailPage(props: { params: Promise<{ slug: string }> }) {
  const resolvedParams = React.use(props.params);
  const slug = resolvedParams.slug;
  return (
    <div className="min-h-screen flex flex-col bg-background font-body">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<div className="flex-1 flex flex-col items-center justify-center gap-6 py-40"><div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" /><p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">Opening Specification...</p></div>}>
          <ProductDetailContent slug={slug} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
