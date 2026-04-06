'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DiscountEditorForm } from '../editor-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Discount } from '@/lib/types';

export default function EditPromotionPage(props: { params: Promise<{ discountId: string }> }) {
  const params = React.use(props.params);
  const discountId = params.discountId;
  const router = useRouter();
  const db = useFirestore();

  const discountRef = useMemoFirebase(() => 
    discountId ? doc(db, 'discounts', discountId) : null, 
  [db, discountId]);
  
  const { data: discount, isLoading } = useDoc<Discount>(discountRef);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!discount) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold">Promotion not found</h2>
        <Button variant="link" onClick={() => router.push('/admin/promotions')}>Return to promotions</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Promotions
        </Button>
      </div>
      <DiscountEditorForm initialData={discount} isNew={false} />
    </div>
  );
}
