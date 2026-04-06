
'use client';

import React, { useState } from 'react';
import { FileText, Plus, Search, Eye, MoreHorizontal, Edit, Trash, Calendar, Tag } from 'lucide-react';
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
import { BlogPost } from '@/lib/types';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function BlogsPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const postsQuery = useMemoFirebase(() => query(collection(db, 'blog_posts'), orderBy('createdAt', 'desc')), [db]);
  const { data: posts, isLoading } = useCollection<BlogPost>(postsQuery);

  const filteredPosts = posts?.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this blog post? This cannot be undone.')) {
      deleteDocumentNonBlocking(doc(db, 'blog_posts', id));
      toast({ title: "Post Deleted", variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Published': return 'bg-emerald-500 hover:bg-emerald-600';
      case 'Draft': return 'bg-slate-500 hover:bg-slate-600';
      case 'Archived': return 'bg-rose-500 hover:bg-rose-600';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline tracking-tight">Blog CMS</h2>
          <p className="text-muted-foreground">Manage educational and promotional sticker content.</p>
        </div>
        <Button asChild>
          <Link href="/admin/blogs/new">
            <Plus className="mr-2 h-4 w-4" />
            New Post
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search posts by title or tags..." 
              className="pl-8 bg-muted/20" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Article</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">Loading articles...</TableCell>
                </TableRow>
              ) : filteredPosts?.map((post) => (
                <TableRow key={post.id} className="group transition-colors hover:bg-muted/10">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-16 bg-muted rounded overflow-hidden relative shrink-0">
                        {post.featuredImage ? (
                          <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
                        ) : (
                          <FileText className="h-4 w-4 absolute inset-0 m-auto text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm line-clamp-1">{post.title}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">/{post.slug}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(getStatusColor(post.status), "text-[10px] h-5")}>
                      {post.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {post.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-[9px] py-0">{tag}</Badge>
                      ))}
                      {post.tags.length > 2 && <span className="text-[9px] text-muted-foreground">+{post.tags.length - 2}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(post.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Article Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/blogs/${post.id}`}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Content
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/blog/${post.slug}`} target="_blank">
                            <Eye className="mr-2 h-4 w-4" /> Preview Live
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(post.id)}>
                          <Trash className="mr-2 h-4 w-4" /> Delete Post
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!filteredPosts?.length && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2 opacity-40">
                      <FileText className="h-10 w-10" />
                      <p className="text-sm italic">No blog posts found. Time to write something!</p>
                    </div>
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
