
'use client';

import React, { useState } from 'react';
import { Plus, Search, MoreHorizontal, Edit, Trash, Truck, Package, ShieldAlert, Loader2, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useCollection, useMemoFirebase, useFirestore, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { ShippingOption } from '@/lib/types';
import { OptionEditor } from './option-editor';
import { toast } from '@/hooks/use-toast';
import { useAdmin } from '../layout';

export function ShippingOptionsTab() {
  const db = useFirestore();
  const { user } = useUser();
  const { isStaff, isSyncing } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<ShippingOption | null>(null);

  const optionsQuery = useMemoFirebase(() => {
    if (!user || !isStaff || isSyncing) return null;
    return query(collection(db, 'shipping_options'), orderBy('createdAt', 'desc'));
  }, [db, user, isStaff, isSyncing]);

  const { data: options, isLoading, error } = useCollection<ShippingOption>(optionsQuery);

  const filtered = options?.filter(o => 
    o.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this shipping method? This may affect orders already placed with this option.')) {
      deleteDocumentNonBlocking(doc(db, 'shipping_options', id));
      toast({ title: "Method Removed", variant: "destructive" });
    }
  };

  const openEditor = (option: ShippingOption | null = null) => {
    setEditingOption(option);
    setIsEditorOpen(true);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Syncing Rules</AlertTitle>
        <AlertDescription>
          One moment while we verify your administrative access to shipping rules...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold font-headline">Shipping Methods</h3>
          <p className="text-sm text-muted-foreground">Manage rules, rates, and lead times for customer checkout.</p>
        </div>
        <Button onClick={() => openEditor()} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> New Smart Method
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or code (e.g. UPS)..." 
              className="pl-8 bg-muted/20" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground italic">Updating rule list...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Method & Code</TableHead>
                  <TableHead>Pricing Rule</TableHead>
                  <TableHead>Production</TableHead>
                  <TableHead>Transit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((opt) => (
                  <TableRow key={opt.id} className="group transition-colors hover:bg-muted/10">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{opt.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">{opt.code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs">
                        <DollarSign className="h-3 w-3 text-emerald-500" />
                        {opt.pricing.strategy === 'Flat' && <span className="font-medium">${opt.pricing.baseRate.toFixed(2)} Flat</span>}
                        {opt.pricing.strategy === 'Subtotal' && <span>Free over ${opt.pricing.freeThreshold}</span>}
                        {opt.pricing.strategy === 'Weight' && <span>Weight Tiers</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Package className="h-3 w-3 text-blue-500" />
                        <span>{opt.processing.minDays}-{opt.processing.maxDays} Business Days</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Truck className="h-3 w-3 text-primary" />
                          <span>{opt.transit.minDays}-{opt.transit.maxDays} Carrier Days</span>
                        </div>
                        <span className="text-[9px] text-muted-foreground italic pl-4">{opt.transit.carrier} {opt.transit.service}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={opt.active ? 'default' : 'secondary'} className="text-[10px] h-5">
                          {opt.active ? 'Active' : 'Paused'}
                        </Badge>
                        {opt.isDefault && <Badge variant="outline" className="text-[10px] h-5 border-primary text-primary bg-primary/5">Default</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditor(opt)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Configuration
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => handleDelete(opt.id)}>
                            <Trash className="mr-2 h-4 w-4" /> Delete Rule
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!filtered?.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2 opacity-40">
                        <Truck className="h-10 w-10" />
                        <p className="text-sm italic">No smart shipping rules defined yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <OptionEditor 
        open={isEditorOpen} 
        onOpenChange={setIsEditorOpen} 
        initialData={editingOption} 
      />
    </div>
  );
}
