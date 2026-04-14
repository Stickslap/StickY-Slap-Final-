
'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Papa from 'papaparse';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Truck,
  Loader2, 
  ShieldAlert, 
  XCircle,
  AlertTriangle,
  RotateCcw,
  MapPin,
  Settings2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Upload
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCollection, useMemoFirebase, useUser, useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, limit, getDocs, where, writeBatch } from 'firebase/firestore';
import { Order, OrderStatus, EmailTemplate, ShippingDetails } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAdmin } from '../layout';
import { toast } from '@/hooks/use-toast';
import { dispatchSocietyEmail } from '@/app/actions/email';

const statusColors: Record<OrderStatus, string> = {
  Draft: 'bg-slate-500',
  Submitted: 'bg-blue-500',
  Proofing: 'bg-amber-500',
  Approved: 'bg-emerald-500',
  Rejected: 'bg-rose-600',
  'In Production': 'bg-purple-500',
  QC: 'bg-pink-500',
  Ready: 'bg-indigo-500',
  Shipped: 'bg-cyan-500',
  Delivered: 'bg-green-500',
  Closed: 'bg-slate-700',
  'On Hold': 'bg-orange-500',
  Cancelled: 'bg-rose-500',
  Refunded: 'bg-red-700',
};

const ORDER_STATUSES: OrderStatus[] = [
  "Draft", "PendingPayment", "Submitted", "Proofing", "Approved", "Rejected", "In Production", "QC", "Ready", "Shipped", "Delivered", "Closed", "On Hold", "Cancelled", "Refunded"
];

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const db = useFirestore();
  const { user } = useUser();
  const { isStaff, isSyncing } = useAdmin();
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'All'>('All');
  const [hideImports, setHideImports] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Column Management State
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'id', 'items', 'location', 'status', 'total', 'createdAt', 'actions'
  ]);

  const columnDefinitions: Record<string, { label: string; className: string }> = {
    id: { label: 'Order ID', className: 'px-8 font-black uppercase tracking-widest text-[10px]' },
    items: { label: 'Manifest Items', className: 'font-black uppercase tracking-widest text-[10px]' },
    location: { label: 'Location', className: 'font-black uppercase tracking-widest text-[10px]' },
    status: { label: 'Status Control', className: 'font-black uppercase tracking-widest text-[10px]' },
    total: { label: 'Registry Total', className: 'font-black uppercase tracking-widest text-[10px]' },
    createdAt: { label: 'Logged At', className: 'font-black uppercase tracking-widest text-[10px]' },
    actions: { label: 'Actions', className: 'text-right px-8 font-black uppercase tracking-widest text-[10px]' },
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...columnOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setColumnOrder(newOrder);
  };

  // Sync state if URL search param changes
  useEffect(() => {
    if (urlSearch) {
      setSearchTerm(urlSearch);
    }
  }, [urlSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const ordersQuery = useMemoFirebase(() => {
    if (!user || !isStaff || isSyncing) return null;
    return query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc')
    );
  }, [db, user, isStaff, isSyncing]);

  const { data: orders, isLoading, error } = useCollection<Order>(ordersQuery);

  // Fetch Templates for Automation
  const templatesQuery = useMemoFirebase(() => collection(db, 'email_templates'), [db]);
  const { data: templates } = useCollection<EmailTemplate>(templatesQuery);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";",
      complete: async (results) => {
        const ordersCollection = collection(db, 'orders');
        const usersCollection = collection(db, 'users');
        
        const BATCH_SIZE = 500;
        let batch = writeBatch(db);
        let count = 0;

        for (const row of results.data as any[]) {
          if (!row.order_number) continue;

          // Find matching customer
          const userQuery = query(usersCollection, where('email', '==', row.email));
          const userSnap = await getDocs(userQuery);
          const userId = !userSnap.empty ? userSnap.docs[0].id : 'unknown';

          const newOrder: Order = {
            id: row.order_number,
            userId: userId,
            customerEmail: row.email,
            customerName: row.shipto_person_name,
            status: 'Submitted',
            items: [{
              productId: row.sku || 'imported',
              productName: row.name || 'Unknown',
              quantity: parseInt(row.quantity) || 0,
              options: {
                rawOptions: row.options || '',
                stickerAmount: row['sticker amount'] || '',
                vinyl: row.vinyl || '',
                finish: row.finish || '',
                stickerSize: row['sticker size'] || ''
              }
            }],
            pricing: {
              subtotal: parseFloat(row.order_subtotal) || 0,
              discount: parseFloat(row.discount) || 0,
              tax: parseFloat(row.order_tax) || 0,
              shipping: parseFloat(row.order_shipping) || 0,
              total: parseFloat(row.order_total) || 0
            },
            shippingDetails: {
              address: `${row.shipto_person_street_1 || ''} ${row.shipto_person_street_2 || ''}`.trim(),
              city: row.shipto_person_city || '',
              state: row.shipto_person_state_code || '',
              zip: row.shipto_person_postal_code || '',
              method: row.shipping_method || 'Standard',
              phone: row.shipto_person_phone || '',
              carrier: 'Unknown'
            },
            billingDetails: {
              address: `${row.bill_person_street_1 || ''} ${row.bill_person_street_2 || ''}`.trim(),
              city: row.bill_person_city || '',
              state: row.bill_person_state_code || '',
              zip: row.bill_person_postal_code || '',
              phone: row.bill_person_phone || '',
              method: 'Standard'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: { ...row, isImported: true }
          } as Order;

          const orderDocRef = doc(ordersCollection, row.order_number);
          batch.set(orderDocRef, newOrder, { merge: true });
          count++;

          if (count === BATCH_SIZE) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) {
          await batch.commit();
        }
        toast({ title: "Orders Imported/Updated Successfully" });
      },
      error: (err) => {
        toast({ title: "Import Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  const filteredOrders = orders?.filter(order => {
    const term = searchTerm.toLowerCase();
    const address = (order.shippingDetails?.address || '').toLowerCase();
    const matchesSearch = (
      order.id.toLowerCase().includes(term) ||
      (order.customerEmail || '').toLowerCase().includes(term) ||
      (order.customerName || '').toLowerCase().includes(term) ||
      (order.userId || '').toLowerCase().includes(term) ||
      address.includes(term) ||
      order.items.some(i => i.productName.toLowerCase().includes(term))
    );
    
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    const matchesImport = !hideImports || !order.metadata?.isImported;
    
    return matchesSearch && matchesStatus && matchesImport;
  });

  const totalPages = Math.ceil((filteredOrders?.length || 0) / itemsPerPage);
  const paginatedOrders = filteredOrders?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleUpdateStatus = async (order: Order, newStatus: OrderStatus) => {
    if (updatingId || order.status === newStatus) return;
    setUpdatingId(order.id);

    const orderRef = doc(db, 'orders', order.id);
    const now = new Date().toISOString();
    
    updateDocumentNonBlocking(orderRef, { 
      status: newStatus, 
      updatedAt: now 
    });

    addDocumentNonBlocking(collection(db, 'orders', order.id, 'activity'), {
      action: 'Status Transition (Inline)',
      timestamp: now,
      details: `Fulfillment lifecycle manually updated from ${order.status} to ${newStatus}`
    });

    // Check for automation triggers
    const triggerMap: Partial<Record<OrderStatus, string>> = {
      'Shipped': 'order_shipped',
      'Refunded': 'order_refunded',
      'Cancelled': 'order_cancelled',
      'Approved': 'artwork_approved',
      'Rejected': 'artwork_rejected'
    };

    const trigger = triggerMap[newStatus];
    if (trigger && !order.metadata?.isImported) {
      const template = templates?.find(t => t.trigger === trigger && t.enabled);
      if (template) {
        dispatchSocietyEmail(template, order.customerEmail, {
          customer_name: order.customerName || 'Society Member',
          order_id: order.id.slice(0, 8),
          order_status: newStatus,
          order_link: `${window.location.origin}/dashboard/orders/${order.id}`
        });
      }
    }

    toast({ title: "Status Synchronized", description: `Order #${order.id.slice(0, 8)} moved to ${newStatus}` });
    setUpdatingId(null);
  };

  const handleCancelOrder = (id: string) => {
    const order = orders?.find(o => o.id === id);
    if (!order) return;

    if (confirm('Are you sure you want to cancel this order? This will notify the customer.')) {
      handleUpdateStatus(order, 'Cancelled');
    }
  };

  const getCityState = (shippingDetails?: ShippingDetails) => {
    if (!shippingDetails) return '---';
    const { city, state, zip } = shippingDetails;
    if (!city && !state && !zip) return '---';
    return `${city || 'Unknown'}, ${state || 'Unknown'} ${zip || ''}`.trim();
  };

  const getTrackingUrl = (carrier?: string, trackingNumber?: string) => {
    if (!trackingNumber) return null;
    const c = carrier?.toLowerCase() || '';
    if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    if (c.includes('fedex')) return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`;
    if (c.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    if (c.includes('dhl')) return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}&brand=DHL`;
    return `https://www.google.com/search?q=${trackingNumber}`;
  };

  const renderCell = (colId: string, order: Order) => {
    switch (colId) {
      case 'id':
        return (
          <TableCell className="px-8 font-mono text-[10px] font-bold">
            <Link href={`/admin/orders/${order.id}`} className="hover:text-primary transition-colors cursor-pointer">
              #{order.id.slice(0, 8)}
            </Link>
          </TableCell>
        );
      case 'items':
        return (
          <TableCell>
            <div className="flex flex-col gap-1.5 py-4">
              {order.items.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-tight truncate max-w-[240px]">
                    {item.productName?.replace(/\s*\(Copy\)$/i, '')}
                  </span>
                  <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-black">x{item.quantity}</Badge>
                </div>
              ))}
              {order.items.length > 3 && (
                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em] pl-3">
                  + {order.items.length - 3} more items
                </span>
              )}
            </div>
          </TableCell>
        );
      case 'location':
        const trackingUrl = getTrackingUrl(order.shippingDetails?.carrier, order.shippingDetails?.trackingNumber);
        return (
          <TableCell>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-tight italic">{getCityState(order.shippingDetails)}</span>
              <div className="flex flex-col">
                <span className="text-[9px] text-muted-foreground uppercase font-black opacity-40 flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  {order.shippingDetails?.method || 'Standard'}
                </span>
                {order.shippingDetails?.trackingNumber && (
                  <a 
                    href={trackingUrl || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono font-bold text-primary hover:underline flex items-center gap-1 mt-0.5 group"
                  >
                    {order.shippingDetails.trackingNumber}
                    <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
              </div>
            </div>
          </TableCell>
        );
      case 'status':
        return (
          <TableCell>
            {updatingId === order.id ? (
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                <Loader2 className="h-3 w-3 animate-spin" /> Syncing...
              </div>
            ) : (
              <Select 
                value={order.status} 
                onValueChange={(v) => handleUpdateStatus(order, v as OrderStatus)}
              >
                <SelectTrigger className={cn(
                  statusColors[order.status] || 'bg-slate-500', 
                  "text-white border-none h-8 px-3 rounded-xl font-black uppercase text-[10px] tracking-widest w-[140px] shadow-sm hover:scale-105 transition-transform"
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-2xl p-2 border-2">
                  {ORDER_STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="text-[10px] font-bold uppercase py-2.5 rounded-xl cursor-pointer">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </TableCell>
        );
      case 'total':
        return (
          <TableCell className="text-sm font-black italic tracking-tighter">
            ${order.pricing?.total?.toFixed(2) || '0.00'}
          </TableCell>
        );
      case 'createdAt':
        return (
          <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">
            {new Date(order.createdAt).toLocaleDateString()}
          </TableCell>
        );
      case 'actions':
        return (
          <TableCell className="text-right px-8">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-2">
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-2 opacity-40">Registry Management</DropdownMenuLabel>
                <DropdownMenuItem asChild className="rounded-xl font-bold uppercase text-[10px] py-3 cursor-pointer">
                  <Link href={`/admin/orders/${order.id}`}>
                    <Eye className="mr-2 h-4 w-4" /> Open Full Inspect
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl font-bold uppercase text-[10px] py-3 cursor-pointer">
                  <Link href={`/admin/orders/${order.id}?tab=manifest`}>
                    <Truck className="mr-2 h-4 w-4" /> Carrier Dispatch
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem 
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive rounded-xl font-bold uppercase text-[10px] py-3 cursor-pointer"
                  onClick={() => handleCancelOrder(order.id)}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Void Transaction
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        );
      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-3xl font-bold font-headline tracking-tight">Orders</h2>
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Permission Denied</AlertTitle>
          <AlertDescription>
            You do not have administrative access. Please wait a moment for security synchronization.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline tracking-tight text-foreground uppercase italic">Order Registry</h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Manage custom print manufacturing and fulfillment queue.</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-11 border-2">
                <Settings2 className="mr-2 h-4 w-4" />
                Layout
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Registry Layout</DialogTitle>
                <DialogDescription className="text-xs font-bold uppercase tracking-widest">Rearrange columns to customize your fulfillment view.</DialogDescription>
              </DialogHeader>
              <div className="py-6 space-y-3">
                {columnOrder.map((colId, idx) => (
                  <div key={colId} className="flex items-center justify-between p-4 bg-muted/5 border-2 rounded-2xl group">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-primary opacity-40">0{idx + 1}</span>
                      <span className="text-xs font-black uppercase tracking-tight">{columnDefinitions[colId].label}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => moveColumn(idx, 'up')} disabled={idx === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => moveColumn(idx, 'down')} disabled={idx === columnOrder.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-primary" onClick={() => toast({ title: "Layout Synchronized" })}>Close Registry Settings —</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-11 border-2">
            <Upload className="mr-2 h-4 w-4" />
            Import CSV —
          </Button>
          <Button variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-11 border-2">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button asChild className="rounded-xl font-bold uppercase tracking-widest text-[10px] h-11 bg-primary">
            <Link href="/admin/orders/new">
              <Plus className="mr-2 h-4 w-4" />
              Manual Intake —
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-2 rounded-[2rem] overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, name, city, email or product..."
                className="pl-10 bg-background border-2 h-11 rounded-xl focus-visible:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
                <SelectTrigger className="rounded-xl h-11 px-6 font-bold uppercase text-[10px] tracking-widest border-2 w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Refine" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-xl p-2 border-2">
                  <SelectItem value="All" className="text-[10px] font-bold uppercase py-2.5 rounded-xl cursor-pointer">All Projects</SelectItem>
                  {ORDER_STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="text-[10px] font-bold uppercase py-2.5 rounded-xl cursor-pointer">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant={hideImports ? "outline" : "default"}
                className="rounded-xl h-11 px-4 font-bold uppercase text-[10px] tracking-widest border-2"
                onClick={() => setHideImports(!hideImports)}
              >
                {hideImports ? "Show Imports" : "Hide Imports"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || isSyncing ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Retrieving Queue...</p>
            </div>
          ) : (
            <>
              <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  {columnOrder.map(colId => (
                    <TableHead key={colId} className={columnDefinitions[colId].className}>
                      {columnDefinitions[colId].label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders?.map((order) => (
                  <TableRow key={order.id} className="group hover:bg-muted/10 transition-colors">
                    {columnOrder.map(colId => (
                      <React.Fragment key={`${order.id}-${colId}`}>
                        {renderCell(colId, order)}
                      </React.Fragment>
                    ))}
                  </TableRow>
                ))}
                {!paginatedOrders?.length && (
                  <TableRow>
                    <TableCell colSpan={columnOrder.length} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-6 opacity-30">
                        <div className="h-16 w-16 rounded-[1.5rem] border-4 border-dashed flex items-center justify-center">
                          <AlertTriangle className="h-8 w-8" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">No matching registry entries found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Opening Order Architecture...</p>
      </div>
    }>
      <OrdersPageContent />
    </Suspense>
  );
}
