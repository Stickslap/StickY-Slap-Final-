'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Warehouse, 
  ShieldCheck, 
  ShieldX, 
  Clock, 
  Save, 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileDown,
  Loader2,
  Building2,
  UserCheck,
  Mail,
  History,
  TrendingUp,
  BarChart3,
  DollarSign,
  Package,
  Activity,
  Trash2,
  Trash,
  CheckCircle2,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  useDoc, 
  useCollection, 
  useMemoFirebase, 
  useFirestore, 
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  useUser
} from '@/firebase';
import { doc, collection, query, where, orderBy, arrayUnion } from 'firebase/firestore';
import { UserProfile, VendorProduct, VerificationStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';

export default function VendorDetailPage(props: { params: Promise<{ vendorId: string }> }) {
  const params = React.use(props.params);
  const vendorId = params.vendorId;
  const router = useRouter();
  const db = useFirestore();
  const { user: adminUser } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Fetch Vendor Profile
  const vendorRef = useMemoFirebase(() => (vendorId ? doc(db, 'users', vendorId) : null), [db, vendorId]);
  const { data: vendor, isLoading: isVendorLoading } = useDoc<UserProfile>(vendorRef);

  // Fetch Vendor Products
  const productsQuery = useMemoFirebase(() => 
    vendorId ? query(collection(db, 'vendor_products'), where('vendorId', '==', vendorId)) : null
  , [db, vendorId]);
  const { data: products, isLoading: isProductsLoading } = useCollection<VendorProduct>(productsQuery);

  // Form State for Notes
  const [adminNotes, setAdminNotes] = useState('');

  React.useEffect(() => {
    if (vendor?.adminNotes) {
      setAdminNotes(vendor.adminNotes);
    }
  }, [vendor]);

  const updateVerification = async (status: VerificationStatus) => {
    if (!vendorRef || !adminUser) return;
    setIsProcessing(true);
    const now = new Date().toISOString();

    updateDocumentNonBlocking(vendorRef, { 
      verificationStatus: status,
      updatedAt: now 
    });

    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: adminUser.uid,
      action: 'Vendor Clearance Updated',
      entityType: 'Vendor',
      entityId: vendorId,
      details: `Administrative override: Set verification status to ${status.toUpperCase()} for ${vendor?.printShopDetails?.businessName || vendor?.name}`,
      timestamp: now
    });

    toast({ title: `Vendor ${status.charAt(0).toUpperCase() + status.slice(1)}`, description: "Security registry updated." });
    setTimeout(() => setIsProcessing(false), 400);
  };

  const handleSaveNote = () => {
    if (!vendorRef) return;
    setIsSavingNote(true);
    updateDocumentNonBlocking(vendorRef, { 
      adminNotes,
      updatedAt: new Date().toISOString() 
    });
    toast({ title: "Admin Notes Synchronized" });
    setIsSavingNote(false);
  };

  const analytics = useMemo(() => {
    if (!products) return null;
    const totalQty = products.reduce((acc, p) => acc + (p.quantityAvailable || 0), 0);
    const totalValue = products.reduce((acc, p) => acc + ((p.pricePerRoll || 0) * (p.quantityAvailable || 0)), 0);
    const avgPrice = products.length > 0 ? products.reduce((acc, p) => acc + (p.pricePerRoll || 0), 0) / products.length : 0;

    const chartData = products.slice(0, 8).map(p => ({
      name: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
      price: p.pricePerRoll,
      qty: p.quantityAvailable
    }));

    return { totalQty, totalValue, avgPrice, chartData };
  }, [products]);

  const handleExportCSV = () => {
    if (!products?.length) return;
    const headers = ['Product', 'Size', 'Material', 'Thickness', 'Adhesive', 'Feet/Roll', 'Price/Roll', 'Quantity', 'Updated'];
    const rows = products.map(p => [
      p.name, p.size, p.materialType || 'N/A', p.thickness || 'N/A', p.adhesiveType || 'N/A', p.feetPerRoll, p.pricePerRoll, p.quantityAvailable, p.updatedAt
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vendor_${vendorId}_specs.csv`);
    document.body.appendChild(link);
    link.click();
  };

  if (isVendorLoading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Opening Supplier Architecture...</p>
    </div>
  );

  if (!vendor) return (
    <div className="p-20 text-center space-y-6">
      <AlertCircle className="h-16 w-16 text-destructive mx-auto opacity-20" />
      <h2 className="text-2xl font-black uppercase font-headline">Vendor Not Found</h2>
      <Button variant="outline" className="rounded-xl px-8" onClick={() => router.push('/admin/vendors')}>Return to Registry</Button>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-muted/50 border hover:bg-primary hover:text-white transition-all" onClick={() => router.push('/admin/vendors')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-4xl md:text-5xl font-black font-headline tracking-tighter uppercase italic leading-none">
                {vendor.printShopDetails?.businessName || vendor.name || 'Unnamed Vendor'}
              </h2>
              <Badge className={cn(
                "text-[10px] h-5 uppercase font-black tracking-tighter px-2 border-none",
                vendor.verificationStatus === 'verified' ? "bg-emerald-500" : 
                vendor.verificationStatus === 'rejected' ? "bg-rose-500" : "bg-amber-500"
              )}>
                {vendor.verificationStatus || 'pending'}
              </Badge>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-2">
              REGISTRY KEY: {vendor.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl h-12 px-6 font-bold uppercase tracking-widest text-[10px] border-2" onClick={() => window.print()}>
            <FileDown className="mr-2 h-4 w-4" /> Export Dossier —
          </Button>
          <Button className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 text-white" onClick={() => updateVerification('verified')} disabled={isProcessing || vendor.verificationStatus === 'verified'}>
            {isProcessing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-2 h-3.5 w-3.5" />}
            Authorize Supplier —
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8 space-y-10">
          <Tabs defaultValue="products" className="w-full">
            <TabsList className="w-full justify-start bg-transparent h-14 border-b rounded-none gap-10 p-0 mb-10">
              <TabsTrigger value="products" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none px-0 pb-4 text-xs font-black uppercase tracking-[0.2em]">Material Submissions</TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none px-0 pb-4 text-xs font-black uppercase tracking-[0.2em]">Supply Analytics</TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none px-0 pb-4 text-xs font-black uppercase tracking-[0.2em]">Audit Journal</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-8 m-0 animate-in fade-in duration-500">
              <div className="flex justify-between items-center px-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-black uppercase italic tracking-tight">Technical Specification Table</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Submitted material registry for internal review.</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl h-9 font-black uppercase text-[9px] tracking-[0.2em] border-2" onClick={handleExportCSV}>
                  <FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Download CSV —
                </Button>
              </div>

              <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-sm bg-card">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="px-10 py-5 font-black uppercase tracking-[0.2em] text-[9px]">Material Profile</TableHead>
                          <TableHead className="px-10 py-5 font-black uppercase tracking-[0.2em] text-[9px]">Tech Specs</TableHead>
                          <TableHead className="px-10 py-5 font-black uppercase tracking-[0.2em] text-[9px]">Feet/Roll</TableHead>
                          <TableHead className="px-10 py-5 font-black uppercase tracking-[0.2em] text-[9px]">Price/Roll</TableHead>
                          <TableHead className="px-10 py-5 font-black uppercase tracking-[0.2em] text-[9px]">On Hand</TableHead>
                          <TableHead className="px-10 py-5 text-right font-black uppercase tracking-[0.2em] text-[9px]">Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isProductsLoading ? (
                          <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                        ) : products?.map((p) => (
                          <TableRow key={p.id} className="group hover:bg-muted/10 transition-colors border-b-2">
                            <TableCell className="px-10 py-6">
                              <div className="space-y-1">
                                <span className="font-bold text-sm block uppercase italic tracking-tight">{p.name}</span>
                                <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-primary/20 text-primary">{p.materialType || 'Vinyl'}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="px-10">
                              <div className="text-[9px] font-bold text-muted-foreground uppercase space-y-0.5">
                                <p>THICK: <span className="text-foreground">{p.thickness || '3 mil'}</span></p>
                                <p>ADHES: <span className="text-foreground">{p.adhesiveType || 'Perm'}</span></p>
                              </div>
                            </TableCell>
                            <TableCell className="px-10 font-mono text-xs">{p.feetPerRoll} ft</TableCell>
                            <TableCell className="px-10 font-black text-sm italic text-emerald-600">${p.pricePerRoll.toFixed(2)}</TableCell>
                            <TableCell className="px-10 font-black text-sm">{p.quantityAvailable}</TableCell>
                            <TableCell className="px-10 text-right font-mono text-[9px] opacity-40">{new Date(p.updatedAt).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                        {products?.length === 0 && (
                          <TableRow><TableCell colSpan={6} className="h-48 text-center opacity-30 italic text-[10px] font-black uppercase tracking-widest">No material specifications submitted.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-8 m-0 animate-in fade-in duration-500">
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-2 rounded-[2.5rem] overflow-hidden bg-card h-[450px]">
                  <CardHeader className="bg-muted/30 border-b py-6 px-10">
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Material Price Scaling</CardTitle>
                  </CardHeader>
                  <CardContent className="p-10 h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics?.chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="name" hide />
                        <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="price" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-2 rounded-[2.5rem] overflow-hidden bg-card h-[450px]">
                  <CardHeader className="bg-muted/30 border-b py-6 px-10">
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Volume Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="p-10 h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics?.chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="name" hide />
                        <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="qty" fill="#10b981" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="pt-4">
              <div className="space-y-8 pl-4 border-l-2 border-muted ml-4">
                {(vendor as any).activityLog?.map((log: any, idx: number) => (
                  <div key={idx} className="relative flex gap-8 items-start">
                    <div className="absolute -left-[33px] top-1.5 h-4 w-4 rounded-full border-4 border-background bg-primary shadow-sm" />
                    <div className="space-y-1 bg-muted/5 p-8 rounded-[2rem] border-2 flex-1 group hover:border-primary/20 transition-all">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-black uppercase italic tracking-tight">{log.action}</p>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium leading-relaxed mt-2 italic">"{log.details}"</p>
                      <div className="pt-4 flex items-center gap-2 text-[8px] font-black uppercase text-muted-foreground opacity-40">
                        <UserCheck className="h-3 w-3" /> Staff: {log.staffName}
                      </div>
                    </div>
                  </div>
                ))}
                {!(vendor as any).activityLog?.length && (
                  <div className="p-20 text-center opacity-30 italic font-black uppercase tracking-widest text-[10px]">No audit entries recorded.</div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="border-2 rounded-[2.5rem] overflow-hidden shadow-xl bg-foreground text-background">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Strategic Dossier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary shadow-inner">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-60">Correspondence Registry</p>
                    <p className="text-sm font-bold truncate">{vendor.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary shadow-inner">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground opacity-60">Specialty Scope</p>
                    <p className="text-sm font-bold">{vendor.printShopDetails?.specialty || 'General Supplier'}</p>
                  </div>
                </div>
              </div>

              <Separator className="bg-white/10" />

              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                  <span>Aggregate Value</span>
                  <span>${analytics?.totalValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                  <span>Price Parity Index</span>
                  <span>${analytics?.avgPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid gap-3 pt-4">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Administrative Directives</Label>
                <Textarea 
                  placeholder="Draft internal strategy or review notes..." 
                  className="min-h-[120px] bg-white/5 border-white/10 rounded-2xl text-white italic text-xs p-4 resize-none"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                />
                <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 text-white shadow-lg" onClick={handleSaveNote} disabled={isSavingNote}>
                  {isSavingNote ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
                  Sync Directives —
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 rounded-[2rem] bg-card shadow-sm border-rose-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-rose-600">Risk Mitigation</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <p className="text-[9px] text-muted-foreground uppercase font-medium leading-relaxed">
                Rejecting a supplier will revoke their registry clearance and halt all procurement ingestion. Use with caution.
              </p>
              <Button variant="outline" className="w-full h-12 rounded-xl border-rose-200 text-rose-600 font-black uppercase tracking-widest text-[10px] hover:bg-rose-600 hover:text-white transition-all" onClick={() => updateVerification('rejected')} disabled={isProcessing || vendor.verificationStatus === 'rejected'}>
                <ShieldX className="mr-2 h-4 w-4" /> Revoke Clearance —
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
