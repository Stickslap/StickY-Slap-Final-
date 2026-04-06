
'use client';

import React, { useState } from 'react';
import { BookOpen, Plus, Search, HelpCircle, MoreHorizontal, Edit, Trash, ChevronRight, FileText, Tag, Loader2, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useCollection, useMemoFirebase, useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { HelpArticle } from '@/lib/types';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function HelpCenterPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const articlesQuery = useMemoFirebase(() => query(collection(db, 'help_articles'), orderBy('updatedAt', 'desc')), [db]);
  const { data: articles, isLoading } = useCollection<HelpArticle>(articlesQuery);

  const filteredArticles = articles?.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (confirm('Delete this help article? This will remove it from the Knowledge Base.')) {
      deleteDocumentNonBlocking(doc(db, 'help_articles', id));
      toast({ title: "Article Deleted", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline tracking-tight">Help Center CMS</h2>
          <p className="text-muted-foreground">Manage documentation, tutorials, and support articles.</p>
        </div>
        <Button asChild>
          <Link href="/admin/help/new">
            <Plus className="mr-2 h-4 w-4" />
            New Article
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search help articles..." 
              className="pl-8 bg-muted/20" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Article</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles?.map((article) => (
                  <TableRow key={article.id} className="group hover:bg-muted/10 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{article.title}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">/{article.slug}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] py-0">{article.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(article.status === 'Published' ? 'bg-emerald-500' : 'bg-slate-500', "text-[10px]")}>
                        {article.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(article.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/help/${article.id}`}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Article
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/help/${article.slug}`} target="_blank">
                              <Eye className="mr-2 h-4 w-4" /> Preview Article
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(article.id)}>
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredArticles?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 opacity-40">
                        <HelpCircle className="h-12 w-12" />
                        <p className="text-sm font-medium">No help articles found</p>
                        <Button variant="link" asChild><Link href="/admin/help/new">Create your first guide</Link></Button>
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
