'use client';

import { GoogleGenAI } from "@google/genai";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Truck, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Package, 
  ShoppingBag, 
  ChevronRight, 
  FileCheck,
  DollarSign,
  CreditCard,
  Lock,
  Check,
  Zap,
  Timer,
  AlertCircle,
  Trash2,
  Plus,
  User,
  Building2,
  ChevronLeft,
  Search,
  FileText,
  Tag,
  X,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useUser, useAuth as useFirebaseAuth, useFirestore, useCollection, useMemoFirebase, useDoc, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, limit, getDocs } from 'firebase/firestore';
import { ShippingOption, ShippingSettings, Order, CheckoutSettings, UserProfile, EmailTemplate, ShippingEstimate } from '@/lib/types';
import { calculateEstimate } from '@/lib/shipping-utils';
import { dispatchSocietyEmail } from '@/app/actions/email';
import { createPaymentLink } from '@/app/actions/payments';
import Image from 'next/image';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getFriendlyErrorMessage, logError } from '@/lib/error-handler';
import { ContractDialog, CONTRACT_VERSION } from '@/components/checkout/contract-dialog';

const SQUARE_APP_ID = process.env.NEXT_PUBLIC_SQUARE_APP_ID || "sq0idp-zBKDnTXilwoxRhQx6CDOjw";
const SQUARE_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "L2SFYZ87NJK49";

declare global {
  interface Window {
    Square: any;
  }
}

const DEFAULT_SETTINGS: ShippingSettings = {
  businessDays: [1, 2, 3, 4, 5],
  holidays: [],
  defaultCutoffTime: '14:00',
  timezone: 'America/New_York'
};

const DEFAULT_LOGO = "https://res.cloudinary.com/dabgothkm/image/upload/v1743789000/sticky-slap-logo.png";
const DEFAULT_THUMBNAIL = "https://picsum.photos/seed/society-item/400/400";

export default function CheckoutPage() {
  const router = useRouter();
  const db = useFirestore();
  const auth = useFirebaseAuth();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [shippingAddress, setShippingAddress] = useState({
    street: '', city: '', state: '', zip: '', fullName: '', company: ''
  });
  const [selectedShippingId, setSelectedShippingId] = useState<string>('');
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, any>>({});
  const [requestProof, setRequestProof] = useState(true);
  const [agreements, setAgreements] = useState({ terms: false, artwork: false, sms: true });
  const [identity, setIdentity] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCreditApplied, setIsCreditApplied] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [groundingLinks, setGroundingLinks] = useState<any[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Contract State
  const [showContract, setShowContract] = useState(false);
  const [ipAddress, setIpAddress] = useState<string>('');
  const [userAgent, setUserAgent] = useState<string>('');

  // Discount State
  const [promoCode, setPromoCode] = useState('');
  const [activeDiscount, setActiveDiscount] = useState<any>(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const appearanceRef = useMemoFirebase(() => doc(db, 'settings', 'appearance'), [db]);
  const { data: appearance } = useDoc<any>(appearanceRef);
  const logoUrl = (isMounted && appearance?.logoUrl) ? appearance.logoUrl : DEFAULT_LOGO;

  const profileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: profile } = useDoc<UserProfile>(profileRef);

  const templatesQuery = useMemoFirebase(() => collection(db, 'email_templates'), [db]);
  const { data: templates } = useCollection<EmailTemplate>(templatesQuery);

  const optionsQuery = useMemoFirebase(() => query(collection(db, 'shipping_options'), where('active', '==', true)), [db]);
  const { data: rawShippingOptions, isLoading: isOptionsLoading } = useCollection<ShippingOption>(optionsQuery);
  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'shipping'), [db]);
  const { data: dbSettings } = useDoc<ShippingSettings>(settingsRef);

  const shippingSettings = dbSettings || DEFAULT_SETTINGS;

  const maxTurnaround = useMemo(() => {
    return cartItems.reduce((max, item) => Math.max(max, item.selectedOptions?.turnaroundDays || 0), 0);
  }, [cartItems]);

  const shippingOptions = useMemo(() => {
    if (!rawShippingOptions || cartItems.length === 0) return [];

    return rawShippingOptions.filter(option => {
      const rules = option.rules;
      if (!rules) return true;

      if (rules.allowedProductIds && rules.allowedProductIds.length > 0) {
        const anyItemInvalid = cartItems.some(item => !rules.allowedProductIds?.includes(item.productId));
        if (anyItemInvalid) return false;
      }

      if (rules.allowedCategories && rules.allowedCategories.length > 0) {
        const anyItemInvalid = cartItems.some(item => !rules.allowedCategories?.includes(item.category));
        if (anyItemInvalid) return false;
      }

      return true;
    });
  }, [rawShippingOptions, cartItems]);

  const pricing = useMemo(() => {
    if (cartItems.length === 0) return { subtotal: 0, shipping: 0, total: 0, creditValue: 0, discountValue: 0 };
    const subtotal = cartItems.reduce((acc, item) => acc + ((Number(item.pricePerUnit) || 0) * (Number(item.quantity) || 0)), 0);
    
    const activeOpt = shippingOptions?.find(o => o.id === selectedShippingId) || 
                      shippingOptions?.find(o => o.isDefault) || 
                      shippingOptions?.[0];
    
    const shipping = activeOpt?.pricing.baseRate || 0;
    
    let discountValue = 0;
    if (activeDiscount) {
      if (activeDiscount.type === 'Percent') {
        discountValue = (subtotal * activeDiscount.value) / 100;
      } else if (activeDiscount.type === 'Fixed') {
        discountValue = activeDiscount.value;
      }
    }

    const rawTotal = subtotal + shipping - discountValue;
    let creditValue = 0;
    if (isCreditApplied && profile?.storeCredit && profile.storeCredit > 0) {
      creditValue = Math.min(rawTotal, profile.storeCredit);
    }
    return { 
      subtotal, 
      shipping, 
      creditValue, 
      discountValue,
      total: Math.max(0, rawTotal - creditValue) 
    };
  }, [cartItems, shippingOptions, selectedShippingId, isCreditApplied, profile?.storeCredit, activeDiscount]);


  useEffect(() => {
    if (!isMounted) return;
    
    // Get IP and UA for contract
    const fetchMeta = async () => {
      try {
        const res = await fetch('/api/utils/get-ip');
        const data = await res.json();
        setIpAddress(data.ip);
        setUserAgent(window.navigator.userAgent);
      } catch (e) {
        setIpAddress('0.0.0.0');
      }
    };
    fetchMeta();

    const cart = JSON.parse(sessionStorage.getItem('society_cart') || '[]');
    if (cart.length === 0) {
      const single = sessionStorage.getItem('pending_checkout');
      if (single) {
        setCartItems([JSON.parse(single)]);
      } else {
        router.push('/products');
      }
    } else {
      setCartItems(cart);
    }
    if (user) {
      setShippingAddress(prev => ({ ...prev, fullName: user.displayName || '' }));
      setIdentity(prev => ({ ...prev, email: user.email || '', firstName: user.displayName?.split(' ')[0] || '', lastName: user.displayName?.split(' ').slice(1).join(' ') || '' }));
    }
  }, [user, router, isMounted]);

  const selectedOption = useMemo(() => 
    shippingOptions?.find(o => o.id === selectedShippingId) || 
    shippingOptions?.find(o => o.isDefault) || 
    shippingOptions?.[0], 
  [shippingOptions, selectedShippingId]);

  const shippingEstimates = useMemo(() => {
    if (cartItems.length === 0 || !shippingOptions) return {};
    
    const estimates: Record<string, ShippingEstimate> = {};
    shippingOptions.forEach(option => {
      estimates[option.id] = calculateEstimate(new Date().toISOString(), option, shippingSettings, { 
          isRush: false, 
          isProofRequired: requestProof, 
          isArtworkMissing: false,
          productTurnaroundDays: maxTurnaround
        });
    });
    return estimates;
  }, [shippingOptions, shippingSettings, cartItems, requestProof, maxTurnaround]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsCheckingPromo(true);
    try {
      const q = query(
        collection(db, 'discounts'), 
        where('code', '==', promoCode.trim().toUpperCase()), 
        where('status', '==', 'Active'), 
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        toast({ title: "Invalid Code", description: "This promotion is not active.", variant: "destructive" });
        setActiveDiscount(null);
      } else {
        const disc = snap.docs[0].data();
        const now = new Date();
        if (disc.startAt && new Date(disc.startAt) > now) {
           toast({ title: "Promotion Pending", description: "This code is not yet active.", variant: "destructive" });
           return;
        }
        if (disc.endAt && new Date(disc.endAt) < now) {
           toast({ title: "Promotion Expired", description: "This code has expired.", variant: "destructive" });
           return;
        }
        setActiveDiscount({ ...disc, id: snap.docs[0].id });
        toast({ title: "Discount Applied!" });
      }
    } catch (e) {
      toast({ title: "Sync Error", description: "Could not verify code.", variant: "destructive" });
    } finally {
      setIsCheckingPromo(false);
    }
  };

  const handleRemoveFromCart = (cartId: string) => {
    const updated = cartItems.filter(item => item.cartId !== cartId);
    setCartItems(updated);
    sessionStorage.setItem('society_cart', JSON.stringify(updated));
    if (updated.length === 0) {
      sessionStorage.removeItem('pending_checkout');
      router.push('/products');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast({ title: "Invalid file type", description: "Please upload a PNG or JPEG file.", variant: "destructive" });
    }
  };

  const validateAddress = async () => {
    setIsValidating(true);
    setValidationResult(null);
    setGroundingLinks([]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
      const address = `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state}, ${shippingAddress.zip}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Is this a valid physical address for shipping? ${address}`,
        config: {
          tools: [{googleMaps: {}}],
        },
      });
      
      setValidationResult(response.text || "No validation result.");
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        setGroundingLinks(chunks);
      }
    } catch (e) {
      console.error(e);
      setValidationResult("Error validating address.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (cartItems.length === 0 || !selectedOption) return;
    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.zip) {
      toast({ title: "Shipping Address Required", variant: "destructive" });
      return;
    }
    if (emailError) {
      toast({ title: "Invalid Email", description: emailError, variant: "destructive" });
      return;
    }
    if (!user && (!identity.firstName || !identity.lastName || !identity.email || !identity.password)) {
      toast({ title: "Identity Required", variant: "destructive" });
      return;
    }
    if (!agreements.terms || !agreements.artwork) {
      toast({ title: "Agreements Required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const newOrderRef = doc(collection(db, 'orders'));
      const orderId = newOrderRef.id;
      const orderNumber = orderId.slice(0, 8);
      const finalName = user?.displayName || `${identity.firstName} ${identity.lastName}`;

      let finalUserId = user?.uid;
      let finalEmail = user?.email || identity.email;

      if (!user) {
        const { createUserWithEmailAndPassword, updateProfile: updateAuthProfile } = await import('firebase/auth');
        const cred = await createUserWithEmailAndPassword(auth, identity.email, identity.password);
        await updateAuthProfile(cred.user, { displayName: `${identity.firstName} ${identity.lastName}` });
        finalUserId = cred.user.uid;
        setDocumentNonBlocking(doc(db, 'users', finalUserId), { 
          id: finalUserId, 
          email: finalEmail, 
          name: finalName, 
          createdAt: new Date().toISOString(), 
          role: 'Customer', 
          storeCredit: 0 
        }, { merge: true });
      }
      
      const orderData: any = {
        userId: finalUserId || null, 
        customerEmail: finalEmail || null, 
        status: 'PendingPayment',
        items: cartItems.map(item => ({
          productId: item.productId || null,
          productName: item.productName?.replace(/\s*\(Copy\)$/i, '') || 'Custom Print',
          quantity: Number(item.quantity) || 0,
          options: item.selectedOptions || {},
          artworkUrl: item.artworkUrl || null,
          productThumbnail: item.thumbnail || null
        })),
        pricing: { 
          subtotal: Number(pricing.subtotal) || 0, 
          discount: Number(pricing.creditValue + pricing.discountValue) || 0, 
          tax: 0, 
          shipping: Number(pricing.shipping) || 0, 
          total: Number(pricing.total) || 0 
        },
        shippingDetails: { 
          address: `${shippingAddress.fullName || finalName}\n${shippingAddress.street}\n${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`, 
          method: selectedOption.name,
          phone: identity.phone
        },
        contractSignature: {
          fullName: finalName,
          email: finalEmail,
          ipAddress: ipAddress,
          userAgent: userAgent,
          signedAt: new Date().toISOString(),
          contractVersion: CONTRACT_VERSION,
          billingAddress: `${shippingAddress.fullName || finalName}\n${shippingAddress.street}\n${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`,
          shippingAddress: `${shippingAddress.fullName || finalName}\n${shippingAddress.street}\n${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`,
          agreementText: "STICKY SLAP LLC – CUSTOM PRINT AGREEMENT & TERMS OF SALE"
        },
        paymentMethod: 'Square (Link)',
        checkoutInfo: { 
          ...customFieldsData, 
          smsConsent: agreements.sms, 
          proofingRequested: requestProof, 
          appliedDiscountId: activeDiscount?.id || null
        },
        estimate: shippingEstimates[selectedShippingId] ? {
          ...shippingEstimates[selectedShippingId],
          version: 1
        } : null, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(),
      };

      setDocumentNonBlocking(newOrderRef, orderData, { merge: true });

      if (pricing.total > 0) {
        const paymentLinkResult = await createPaymentLink({
          amount: pricing.total,
          currency: "USD",
          idempotencyKey: `idempotency-${orderId}`,
          orderId: orderNumber,
          customerEmail: finalEmail,
          redirectUrl: `${window.location.origin}/checkout/success?id=${orderId}&email=${finalEmail}`,
          items: cartItems
        });

        if (!paymentLinkResult.success || !paymentLinkResult.url) {
          throw new Error(paymentLinkResult.error || "Failed to create payment link.");
        }

        window.location.href = paymentLinkResult.url;
        return; // Redirecting
      }

      // Handle zero total
      router.push(`/checkout/success?id=${newOrderRef.id}&email=${finalEmail}`);
    } catch (e: any) { 
      logError(e, 'Checkout Submission');
      toast({ title: "System Fault", description: getFriendlyErrorMessage(e), variant: "destructive" });
      setIsSubmitting(false); 
    }
  };

  if (!isMounted || cartItems.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-background" suppressHydrationWarning>
      <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-body" suppressHydrationWarning>
      <div className="w-full h-24 flex items-center justify-center border-b bg-background sticky top-0 z-50">
        <Link href="/">
          <Image src={logoUrl} alt="Logo" width={200} height={50} className="h-10 w-auto object-contain" unoptimized priority />
        </Link>
      </div>

      <main className="w-full min-h-[calc(100vh-96px)] lg:h-[calc(100vh-96px)] overflow-hidden">
        <div className="flex flex-col lg:flex-row h-full">
          <div className="flex-1 lg:border-r border-muted lg:pr-12 py-12 px-4 md:px-16 overflow-y-auto scrollbar-hide">
            <div className="max-w-2xl ml-auto w-full space-y-12">
              <section className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter">Contact</h2>
                  {!user && (
                    <div className="text-[10px] font-bold uppercase tracking-widest">
                      Have an account? <Link href="/login" className="text-primary hover:underline">Sign In</Link>
                    </div>
                  )}
                </div>
                <div className="grid gap-4">
                  <Input 
                    placeholder="Email Address" 
                    className={cn("h-12 rounded-xl bg-muted/5 border-2 text-lg font-medium", emailError ? "border-destructive" : "")} 
                    value={identity.email} 
                    onChange={e => {
                      const newEmail = e.target.value;
                      setIdentity({...identity, email: newEmail});
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      if (!newEmail) {
                        setEmailError("Email is required.");
                      } else if (!emailRegex.test(newEmail)) {
                        setEmailError("Please enter a valid email address.");
                      } else {
                        setEmailError(null);
                      }
                    }} 
                    disabled={!!user}
                  />
                  {emailError && <p className="text-xs text-destructive font-bold uppercase">{emailError}</p>}
                  {!user && (
                    <div className="grid gap-2">
                      <Input 
                        type="password"
                        placeholder="Create Password" 
                        className="h-12 rounded-xl bg-muted/5 border-2 text-lg font-medium" 
                        value={identity.password} 
                        onChange={e => setIdentity({...identity, password: e.target.value})} 
                      />
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Shipping address</h2>
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input placeholder="First name" className="h-12 rounded-xl bg-muted/5 border-2 font-medium" value={identity.firstName} onChange={e => setIdentity({...identity, firstName: e.target.value})} />
                    <Input placeholder="Last name" className="h-12 rounded-xl bg-muted/5 border-2 font-medium" value={identity.lastName} onChange={e => setIdentity({...identity, lastName: e.target.value})} />
                  </div>
                  <Input placeholder="Company (Optional)" className="h-12 rounded-xl bg-muted/5 border-2 font-medium" value={shippingAddress.company} onChange={e => setShippingAddress({...shippingAddress, company: e.target.value})} />
                  <Input placeholder="Phone number" className="h-12 rounded-xl bg-muted/5 border-2 font-medium" value={identity.phone} onChange={e => setIdentity({...identity, phone: e.target.value})} />
                  <Input placeholder="Address" className="h-12 rounded-xl bg-muted/5 border-2 font-medium" value={shippingAddress.street} onChange={e => setShippingAddress({...shippingAddress, street: e.target.value})} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input placeholder="City" className="h-12 rounded-xl bg-muted/5 border-2 font-medium" value={shippingAddress.city} onChange={e => setShippingAddress({...shippingAddress, city: e.target.value})} />
                    <Input placeholder="State" className="h-12 rounded-xl bg-muted/5 border-2 font-medium uppercase" value={shippingAddress.state} onChange={e => setShippingAddress({...shippingAddress, state: e.target.value})} />
                    <Input placeholder="ZIP code" className="h-12 rounded-xl bg-muted/5 border-2 font-medium" value={shippingAddress.zip} onChange={e => setShippingAddress({...shippingAddress, zip: e.target.value})} />
                  </div>
                  <Button type="button" onClick={validateAddress} disabled={isValidating} className="h-12 rounded-xl bg-secondary text-secondary-foreground">
                    {isValidating ? <Loader2 className="animate-spin h-4 w-4" /> : "Validate Address"}
                  </Button>
                  {validationResult && (
                    <div className="p-4 bg-muted/10 rounded-xl text-sm mt-2">
                      <p>{validationResult}</p>
                      {groundingLinks.map((link, i) => (
                        <a key={i} href={link.maps?.uri} target="_blank" className="text-primary underline text-xs block mt-2">{link.maps?.title}</a>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-6">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Shipping method</h2>
                {isOptionsLoading ? (
                  <div className="py-8 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
                ) : (
                  <div className="border-2 rounded-2xl divide-y-2 overflow-hidden shadow-sm">
                    {shippingOptions?.map((option) => {
                      const isSelected = selectedShippingId === option.id || (selectedShippingId === '' && option.isDefault);
                      return (
                        <div key={option.id} onClick={() => setSelectedShippingId(option.id)} className={cn("p-6 flex items-center justify-between cursor-pointer transition-all hover:bg-muted/5", isSelected ? "bg-primary/5" : "")}>
                          <div className="flex items-center gap-4">
                            <div className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center", isSelected ? "border-primary bg-primary" : "border-muted")}>
                              {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-sm font-bold uppercase tracking-tight">{option.name}</p>
                              {shippingEstimates[option.id] && (
                                <div className="mt-2 text-[10px] text-muted-foreground uppercase font-black opacity-60 space-y-0.5">
                                  <p>Processing: {shippingEstimates[option.id].processingDaysMin}-{shippingEstimates[option.id].processingDaysMax} days</p>
                                  <p>Transit: {shippingEstimates[option.id].transitDaysMin}-{shippingEstimates[option.id].transitDaysMax} days</p>
                                  <p>Expected: {new Date(shippingEstimates[option.id].estimatedDeliveryDateMin).toLocaleDateString()} - {new Date(shippingEstimates[option.id].estimatedDeliveryDateMax).toLocaleDateString()}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-black italic">{option.pricing.baseRate === 0 ? 'FREE' : `$${option.pricing.baseRate.toFixed(2)}`}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>


              <section className="space-y-6">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Payment</h2>
                <div className="p-4 sm:p-8 border-2 rounded-[2rem] bg-muted/5 space-y-6">
                  {pricing.total > 0 ? (
                    <div className="p-6 bg-muted/10 border-2 border-muted/20 rounded-xl text-center">
                      <p className="font-bold uppercase tracking-tight">Proceed to secure payment</p>
                      <p className="text-xs text-muted-foreground mt-1">You will be redirected to Square to complete your payment.</p>
                    </div>
                  ) : (
                    <div className="p-6 bg-emerald-50 border-2 border-emerald-100 rounded-xl text-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-black uppercase italic text-emerald-800">Compementary Registry Transaction</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-4 pt-4">
                <div className="flex items-start space-x-4 p-5 bg-muted/5 border-2 rounded-2xl cursor-pointer">
                  <div className="flex items-center" onClick={() => setAgreements({...agreements, terms: !agreements.terms})}>
                    <Checkbox id="terms" checked={agreements.terms} onCheckedChange={v => setAgreements({...agreements, terms: !!v})} />
                  </div>
                  <Label htmlFor="terms" className="text-[10px] font-black uppercase leading-tight tracking-tight cursor-pointer">
                    I accept Sticky slap llc <span className="text-primary underline font-bold hover:text-primary/80 transition-colors" onClick={(e) => { e.preventDefault(); setShowContract(true); }}>terms of service and Privacy terms</span>.
                  </Label>
                </div>
                <div className="flex items-start space-x-4 p-5 bg-muted/5 border-2 rounded-2xl cursor-pointer" onClick={() => setAgreements({...agreements, artwork: !agreements.artwork})}>
                  <Checkbox checked={agreements.artwork} onCheckedChange={v => setAgreements({...agreements, artwork: !!v})} />
                  <p className="text-[10px] font-black uppercase leading-tight tracking-tight">sticky slap manufacturing standard with a transparent background.</p>
                </div>
              </section>

              <ContractDialog 
                open={showContract} 
                onOpenChange={setShowContract} 
                data={{
                  fullName: user?.displayName || (identity.firstName ? `${identity.firstName} ${identity.lastName}` : ''),
                  billingAddress: `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`,
                  shippingAddress: `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`,
                  email: user?.email || identity.email,
                  ipAddress: ipAddress,
                  timestamp: new Date().toLocaleString()
                }}
              />

              <Button 
                className="w-full h-20 text-xl font-black uppercase tracking-widest rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-2xl transition-all active:scale-[0.98]" 
                onClick={handleSubmit} 
                disabled={isSubmitting || !agreements.terms || !agreements.artwork || shippingOptions.length === 0}
              >
                {isSubmitting ? <Loader2 className="h-8 w-8 animate-spin" /> : <>Complete Order —</>}
              </Button>
            </div>
          </div>

          <div className="lg:w-[500px] xl:w-[600px] w-full bg-muted/10 lg:pl-12 lg:pr-16 py-12 px-4 md:px-8 overflow-y-auto scrollbar-hide border-l">
            <div className="max-w-md w-full mr-auto space-y-10">
              <div className="space-y-6">
                {cartItems.map((item, idx) => (
                  <div key={item.cartId || idx} className="flex gap-6 group relative">
                    <div className="relative shrink-0 flex gap-2">
                      <div className="w-16 h-16 relative rounded-xl border-2 bg-background overflow-hidden shadow-sm flex items-center justify-center">
                        <Image src={item.thumbnail || DEFAULT_THUMBNAIL} alt="Product" fill className="object-contain p-2" unoptimized />
                      </div>
                      {item.artworkUrl && (
                        <div className="w-16 h-16 relative rounded-xl border-2 bg-background overflow-hidden shadow-sm flex items-center justify-center">
                          <Image src={item.artworkUrl} alt="Artwork" fill className="object-cover" unoptimized />
                        </div>
                      )}
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-[10px] font-black text-white border-2 border-background">
                        {item.quantity}
                      </Badge>
                    </div>
                    <div className="flex-1 space-y-1 py-1">
                      <div className="flex justify-between items-start gap-4">
                        <h3 className="text-xs font-black uppercase italic tracking-tight truncate max-w-[180px]">{item.productName?.replace(/\s*\(Copy\)$/i, '')}</h3>
                        <span className="text-xs font-black italic">${((Number(item.pricePerUnit) || 0) * (Number(item.quantity) || 0)).toFixed(2)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 opacity-60">
                        {Object.values(item.selectedOptions || {}).slice(0, 3).map((val, i) => (
                          <span key={i} className="text-[8px] font-bold uppercase tracking-widest">{val as string} / </span>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 rounded-full" onClick={() => handleRemoveFromCart(item.cartId)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="DISCOUNT CODE" 
                    className="h-12 rounded-xl bg-background border-2 font-mono uppercase" 
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  />
                  <Button variant="outline" className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px]" onClick={handleApplyPromo} disabled={isCheckingPromo || !promoCode.trim()}>
                    {isCheckingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
                {activeDiscount && <Badge className="bg-emerald-500 text-white font-black uppercase h-6 px-3">{activeDiscount.label || activeDiscount.name} Applied</Badge>}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-sm font-bold uppercase tracking-tight">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${pricing.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold uppercase tracking-tight">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-foreground">{selectedOption ? (pricing.shipping === 0 ? 'FREE' : `$${pricing.shipping.toFixed(2)}`) : 'Calculated'}</span>
                </div>
                <div className="pt-4 flex justify-between items-center border-t">
                  <span className="text-xl font-black uppercase italic tracking-tighter">Total</span>
                  <span className="text-4xl font-black font-headline italic tracking-tighter text-primary">${pricing.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}