'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { HelpEditorForm } from '../editor-form';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { HelpArticle } from '@/lib/types';

export default function EditHelpArticlePage(props: { params: Promise<{ articleId: string }> }) {
  const params = React.use(props.params);
  const articleId = params.articleId;
  const router = useRouter();
  const db = useFirestore();

  const articleRef = useMemoFirebase(() => 
    articleId ? doc(db, 'help_articles', articleId) : null, 
  [db, articleId]);
  
  const { data: article, isLoading } = useDoc<HelpArticle>(articleRef);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold">Article not found</h2>
        <Button variant="link" onClick={() => router.push('/admin/help')}>Return to Help CMS</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <HelpEditorForm initialData={article} isNew={false} />
    </div>
  );
}
