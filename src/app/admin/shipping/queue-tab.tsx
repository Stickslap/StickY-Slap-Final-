'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Truck, 
  AlertCircle, 
  Clock,
  Printer,
  ChevronRight,
  ShieldAlert,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useCollection, useMemoFirebase, useFirestore, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Order } from '@/lib/types';
import { getDeadlineStatus } from '@/lib/shipping-utils';
import Link from 'next/link';
import { useAdmin } from '../layout';
import { cn } from '@/lib/utils';

export function ShippingQueueTab() {
  const db = useFirestore();
  const { user } = useUser();
  const { isStaff, isSyncing } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');

  // Expanded query to include shipped orders for tracking visibility
  const queueQuery = useMemoFirebase(() => {
    if (!user || !isStaff || isSyncing) return null;
    return query(
      collection(db, 'orders'),
      where('status', 'in', ['Ready', 'QC', 'In Production', 'Shipped', 'Delivered'])
    );
  }, [db, user, isStaff, isSyncing]);

  const { data: orders, isLoading, error } = useCollection<Order>(queueQuery);

  const filtered = useMemo(() => {
    if (!orders) return [];
    const sorted = [...orders].sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt;
      const dateB = b.updatedAt || b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
    
    return sorted.filter(o => 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.shippingDetails?.trackingNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orders, searchTerm]);

  const getTrackingUrl = (carrier?: string, trackingNumber?: string) => {
    if (!trackingNumber) return null;
    const c = carrier?.toLowerCase() || '';
    if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    if (c.includes('fedex')) return `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`;
    if (c.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    if (c.includes('dhl')) return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}&brand=DHL`;
    return `https://www.google.com/search?q=${trackingNumber}`;
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Queue Access Denied</AlertTitle>
        <AlertDescription>
          We are currently verifying your fulfillment permissions. This can happen if security rules are still synchronizing.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders?.filter(o => o.status === 'Shipped').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Projects with active tracking</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Dispatch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders?.filter(o => ['Ready', 'QC'].includes(o.status)).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Labels pending generation</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Late Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders?.filter(o => o.status !== 'Shipped' && o.status !== 'Delivered' && o.estimate && getDeadlineStatus(o.estimate.estimatedShipDateMax) === 'Late').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Missing estimated delivery windows</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by order #, customer, or tracking code..." 
                className="pl-8" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" /> Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Updating shipping queue...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Shipping Method</TableHead>
                  <TableHead>Tracking & Carrier</TableHead>
                  <TableHead>Estimated Ship-By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => {
                  const deadlineStatus = order.estimate ? getDeadlineStatus(order.estimate.estimatedShipDateMax) : 'On Track';
                  const trackingUrl = getTrackingUrl(order.shippingDetails?.carrier, order.shippingDetails?.trackingNumber);
                  
                  return (
                    <TableRow key={order.id} className="group transition-colors hover:bg-muted/5">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">#{order.id.slice(0, 8)}</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{order.customerEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Truck className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{order.shippingDetails?.method || 'Standard'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.shippingDetails?.trackingNumber ? (
                          <div className="flex flex-col gap-1">
                            <a 
                              href={trackingUrl || '#'} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs font-mono font-bold text-primary hover:underline flex items-center gap-1 group/link"
                            >
                              {order.shippingDetails.trackingNumber}
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                            </a>
                            <span className="text-[9px] font-black uppercase text-muted-foreground">{order.shippingDetails.carrier || 'Standard'}</span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground opacity-40">Label Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.estimate ? (
                          <div className="text-xs">
                            {new Date(order.estimate.estimatedShipDateMin).toLocaleDateString()} - {new Date(order.estimate.estimatedShipDateMax).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">Not calculated</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={deadlineStatus === 'Late' && order.status !== 'Shipped' ? 'destructive' : 'outline'}
                          className={cn(
                            "text-[10px] h-5",
                            order.status === 'Shipped' && "bg-emerald-50 text-emerald-700 border-emerald-200"
                          )}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/orders/${order.id}`}>
                                <ChevronRight className="mr-2 h-4 w-4" /> View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Printer className="mr-2 h-4 w-4" /> Print Label
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {order.status !== 'Shipped' && order.status !== 'Delivered' && (
                              <DropdownMenuItem className="text-primary font-medium">
                                <Truck className="mr-2 h-4 w-4" /> Mark Shipped
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filtered?.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                      <div className="flex flex-col items-center justify-center gap-2 opacity-40">
                        <Truck className="h-10 w-10" />
                        <p className="text-sm">The shipping queue is currently clear.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
