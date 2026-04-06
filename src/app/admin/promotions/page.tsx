
'use client';

import React, { useState } from 'react';
import { Tag, Plus, Percent, Gift, Search, Filter, MoreHorizontal, Edit, Trash, Copy, Play, Pause, Calendar, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useCollection, useMemoFirebase, useFirestore, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Discount } from '@/lib/types';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function PromotionsPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const discountsQuery = useMemoFirebase(() => query(collection(db, 'discounts'), orderBy('priority', 'desc')), [db]);
  const { data: discounts, isLoading } = useCollection<Discount>(discountsQuery);

  const filteredDiscounts = discounts?.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this discount? This action is permanent.')) {
      deleteDocumentNonBlocking(doc(db, 'discounts', id));
      toast({ title: "Discount Deleted", description: "The promotion has been removed." });
    }
  };

  const handleToggleStatus = (discount: Discount) => {
    const newStatus = discount.status === 'Active' ? 'Paused' : 'Active';
    updateDocumentNonBlocking(doc(db, 'discounts', discount.id), { status: newStatus });
    toast({ title: `Discount ${newStatus}`, description: `Promotion is now ${newStatus.toLowerCase()}.` });
  };

  const handleDuplicate = (discount: Discount) => {
    const { id, ...data } = discount;
    const duplicatedData = {
      ...data,
      name: `${data.name} (Copy)`,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats: { totalUses: 0, totalSaved: 0, revenueInfluenced: 0 }
    };
    addDocumentNonBlocking(collection(db, 'discounts'), duplicatedData);
    toast({ title: "Discount Duplicated", description: "A draft copy has been created." });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-500 hover:bg-emerald-600';
      case 'Scheduled': return 'bg-blue-500 hover:bg-blue-600';
      case 'Paused': return 'bg-orange-500 hover:bg-orange-600';
      case 'Expired': return 'bg-rose-500 hover:bg-rose-600';
      case 'Draft': return 'bg-slate-500 hover:bg-slate-600';
      default: return 'bg-slate-500';
    }
  };

  const totals = {
    active: discounts?.filter(d => d.status === 'Active').length || 0,
    saved: discounts?.reduce((acc, d) => acc + (d.stats?.totalSaved || 0), 0) || 0,
    uses: discounts?.reduce((acc, d) => acc + (d.stats?.totalUses || 0), 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline tracking-tight">Discounts & Promotions</h2>
          <p className="text-muted-foreground">Manage discount codes and automatic cart rules for custom orders.</p>
        </div>
        <Button asChild>
          <Link href="/admin/promotions/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Discount
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Promotions</CardTitle>
            <Play className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.active}</div>
            <p className="text-xs text-muted-foreground">Influencing store pricing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Tag className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.uses}</div>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saved (MTD)</CardTitle>
            <Gift className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totals.saved.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Value given to customers</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or code..." 
                className="pl-8" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Promotion</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">Loading promotions...</TableCell>
                </TableRow>
              ) : filteredDiscounts?.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{discount.name}</span>
                      {discount.mode === 'Code' && (
                        <code className="text-[10px] bg-muted px-1 rounded w-fit font-mono mt-0.5">
                          {discount.code}
                        </code>
                      )}
                      {discount.mode === 'Auto' && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Percent className="h-2 w-2" /> Auto-apply
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {discount.type.replace(/([A-Z])/g, ' $1').trim()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">
                      {discount.type === 'Percent' ? `${discount.value}%` : 
                       discount.type === 'Fixed' ? `$${discount.value}` : 
                       'Variable'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] w-24">
                        <span>{discount.stats?.totalUses || 0} used</span>
                        {discount.limits.maxTotalUses > 0 && <span>/ {discount.limits.maxTotalUses}</span>}
                      </div>
                      {discount.limits.maxTotalUses > 0 && (
                        <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${Math.min(100, ((discount.stats?.totalUses || 0) / discount.limits.maxTotalUses) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">
                    {discount.startAt ? new Date(discount.startAt).toLocaleDateString() : 'Always'}
                    {discount.endAt && ` - ${new Date(discount.endAt).toLocaleDateString()}`}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(getStatusColor(discount.status), "text-[10px] h-5")}>
                      {discount.status}
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
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/promotions/${discount.id}`}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(discount)}>
                          {discount.status === 'Active' ? (
                            <><Pause className="mr-2 h-4 w-4" /> Pause</>
                          ) : (
                            <><Play className="mr-2 h-4 w-4" /> Activate</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(discount)}>
                          <Copy className="mr-2 h-4 w-4" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(discount.id)}>
                          <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!filteredDiscounts?.length && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic">
                    No promotions found. Create your first campaign.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
