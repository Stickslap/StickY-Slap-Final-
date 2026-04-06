'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function ReviewsDecommissionedPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center space-y-6">
      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center border-4 border-dashed animate-pulse">
        <ShieldAlert className="h-10 w-10 text-muted-foreground opacity-20" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">Feature Decommissioned</h1>
        <p className="text-muted-foreground max-w-sm font-medium text-sm leading-relaxed uppercase tracking-widest">The Society Moderation and Reviews Engine has been removed from the active registry.</p>
      </div>
      <Button variant="outline" className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-xs" onClick={() => router.push('/admin')}>
        Return to Dashboard —
      </Button>
    </div>
  );
}