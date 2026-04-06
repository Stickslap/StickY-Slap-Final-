'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ProductEditorForm } from '../editor-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ProductTemplate } from '@/lib/types';

export default function EditProductPage(props: { params: Promise<{ productId: string }> }) {
  const params = React.use(props.params);
  const productId = params.productId;
  const router = useRouter();
  const db = useFirestore();

  const productRef = useMemoFirebase(() => 
    productId ? doc(db, 'products', productId) : null, 
  [db, productId]);
  
  const { data: product, isLoading } = useDoc<ProductTemplate>(productRef);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold">Product not found</h2>
        <Button variant="link" onClick={() => router.push('/admin/products')}>Return to catalog</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
        </Button>
      </div>
      <ProductEditorForm initialData={product} isNew={false} />
    </div>
  );
}
