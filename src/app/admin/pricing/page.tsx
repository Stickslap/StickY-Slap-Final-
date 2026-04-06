
'use client';

import React, { useState } from 'react';
import { Zap, Plus, Search, Filter, MoreHorizontal, Edit, Trash, Copy, Calculator, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useCollection, useMemoFirebase, useFirestore, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { PricingRule } from '@/lib/types';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function PricingRulesPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const rulesQuery = useMemoFirebase(() => query(collection(db, 'pricing_rules'), orderBy('priority', 'desc')), [db]);
  const { data: rules, isLoading } = useCollection<PricingRule>(rulesQuery);

  const filteredRules = rules?.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this pricing rule?')) {
      deleteDocumentNonBlocking(doc(db, 'pricing_rules', id));
      toast({ title: "Rule Deleted", description: "The pricing logic has been removed." });
    }
  };

  const handleDuplicate = (rule: PricingRule) => {
    const { id, ...data } = rule;
    const duplicatedData = {
      ...data,
      name: `${data.name} (Copy)`,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    addDocumentNonBlocking(collection(db, 'pricing_rules'), duplicatedData);
    toast({ title: "Rule Duplicated", description: "A draft copy has been created." });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-500 hover:bg-emerald-600';
      case 'Draft': return 'bg-slate-500 hover:bg-slate-600';
      case 'Paused': return 'bg-orange-500 hover:bg-orange-600';
      case 'Scheduled': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline tracking-tight">Pricing Rules</h2>
          <p className="text-muted-foreground">Manage complex dynamic pricing logic and modifiers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calculator className="mr-2 h-4 w-4" /> Simulator
          </Button>
          <Button asChild>
            <Link href="/admin/pricing/new">
              <Plus className="mr-2 h-4 w-4" /> New Rule
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search rules..." 
                className="pl-8" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" /> Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Behavior</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">Loading rules...</TableCell>
                </TableRow>
              ) : filteredRules?.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{rule.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{rule.description}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{rule.scope.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">{rule.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{rule.stackBehavior}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(getStatusColor(rule.status), "text-[10px]")}>
                      {rule.status}
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
                          <Link href={`/admin/pricing/${rule.id}`}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Rule
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(rule)}>
                          <Copy className="mr-2 h-4 w-4" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(rule.id)}>
                          <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!filteredRules?.length && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                    No pricing rules found. Create your first rule to start modifying store pricing.
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
