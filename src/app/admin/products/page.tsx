
'use client';

import React, { useState } from 'react';
import { Package, Plus, Search, Filter, MoreHorizontal, Edit, Trash, Copy, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useCollection, useMemoFirebase, useFirestore, deleteDocumentNonBlocking, addDocumentNonBlocking, useUser, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { ProductTemplate } from '@/lib/types';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function ProductsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');

  const productsQuery = useMemoFirebase(() => query(collection(db, 'products'), orderBy('name')), [db]);
  const { data: products, isLoading } = useCollection<ProductTemplate>(productsQuery);

  const filteredProducts = products?.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action is permanent.`)) {
      deleteDocumentNonBlocking(doc(db, 'products', id));
      
      addDocumentNonBlocking(collection(db, 'activity'), {
        userId: user?.uid || 'unknown',
        action: 'Product Deleted',
        entityType: 'Product',
        entityId: id,
        details: `Permanently removed product template: ${name}`,
        timestamp: new Date().toISOString()
      });
      
      toast({ title: "Product Deleted", description: "The template has been removed." });
    }
  };

  const handleToggleActive = (product: ProductTemplate) => {
    const newStatus = product.status === 'Active' ? 'Draft' : 'Active';
    updateDocumentNonBlocking(doc(db, 'products', product.id), {
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
    
    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: user?.uid || 'unknown',
      action: 'Product Status Toggled',
      entityType: 'Product',
      entityId: product.id,
      details: `Product "${product.name}" set to ${newStatus}`,
      timestamp: new Date().toISOString()
    });

    toast({ 
      title: newStatus === 'Active' ? "Product Activated" : "Product Deactivated", 
      description: `${product.name} is now ${newStatus.toLowerCase()}.` 
    });
  };

  const handleDuplicate = async (product: ProductTemplate) => {
    const { id, ...data } = product;
    const duplicatedData = {
      ...data,
      name: `${data.name} (Copy)`,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await addDocumentNonBlocking(collection(db, 'products'), duplicatedData);
    
    addDocumentNonBlocking(collection(db, 'activity'), {
      userId: user?.uid || 'unknown',
      action: 'Product Duplicated',
      entityType: 'Product',
      entityId: docRef?.id || 'new',
      details: `Duplicated template: ${product.name}`,
      timestamp: new Date().toISOString()
    });
    
    toast({ title: "Product Duplicated", description: "A draft copy has been created." });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-500 hover:bg-emerald-600';
      case 'Draft': return 'bg-slate-500 hover:bg-slate-600';
      case 'Archived': return 'bg-rose-500 hover:bg-rose-600';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline tracking-tight uppercase italic">Product Templates</h2>
          <p className="text-muted-foreground">Define custom printing items, options, and pricing logic.</p>
        </div>
        <Button asChild className="rounded-xl font-bold uppercase tracking-widest text-[10px]">
          <Link href="/admin/products/new">
            <Plus className="mr-2 h-4 w-4" />
            New Template —
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search templates..." 
                className="pl-8 bg-muted/20 border-none rounded-xl" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-xl">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Turnaround</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">Loading templates...</TableCell>
                </TableRow>
              ) : filteredProducts?.map((product) => (
                <TableRow key={product.id} className="group hover:bg-muted/10 transition-colors">
                  <TableCell>
                    <div className="h-10 w-10 relative bg-muted rounded-xl overflow-hidden border">
                      {product.thumbnail ? (
                        <Image src={product.thumbnail} alt={product.name} fill className="object-cover" unoptimized />
                      ) : (
                        <Package className="h-5 w-5 absolute inset-0 m-auto text-muted-foreground/30" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-sm">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize text-[10px] h-5">{product.category}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {product.production?.turnaroundDays || 0} Days
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Switch 
                        checked={product.status === 'Active'} 
                        onCheckedChange={() => handleToggleActive(product)}
                        title={product.status === 'Active' ? 'Deactivate' : 'Activate'}
                      />
                      <Badge className={cn(getStatusColor(product.status), "text-[10px] h-5 uppercase tracking-tighter")}>
                        {product.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest">Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/products/${product.id}`}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Template
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(product)}>
                          <Copy className="mr-2 h-4 w-4" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/products/${product.slug}`} target="_blank">
                            <Eye className="mr-2 h-4 w-4" /> Preview Form
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(product.id, product.name)}>
                          <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!filteredProducts?.length && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No templates found. Start by creating a new template.
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
