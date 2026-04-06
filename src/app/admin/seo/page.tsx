
'use client';

import React from 'react';
import { Globe, Plus, Search, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function SeoPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline tracking-tight">SEO Snippets</h2>
          <p className="text-muted-foreground">Manage landing page meta content and keywords.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Snippet
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Page Metadata</CardTitle>
          <CardDescription>Control how your store appears in search engine results.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search page slugs..." className="pl-8" />
          </div>
          <div className="space-y-4">
            <div className="p-4 border rounded-md bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono font-medium">/home</span>
                <Badge variant="outline">Published</Badge>
              </div>
              <h4 className="text-blue-600 font-medium hover:underline cursor-pointer">Custom Stickers that Stick | PrintProof</h4>
              <p className="text-sm text-green-700">https://printproof.com</p>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">High-quality vinyl stickers with free online proofs, lightning-fast turnaround, and free shipping. Shop custom die-cut stickers today.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
