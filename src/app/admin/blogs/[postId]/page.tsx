'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { BlogEditorForm } from '../editor-form';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { BlogPost } from '@/lib/types';

export default function EditBlogPostPage(props: { params: Promise<{ postId: string }> }) {
  const params = React.use(props.params);
  const postId = params.postId;
  const router = useRouter();
  const db = useFirestore();

  const postRef = useMemoFirebase(() => 
    postId ? doc(db, 'blog_posts', postId) : null, 
  [db, postId]);
  
  const { data: post, isLoading } = useDoc<BlogPost>(postRef);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold">Blog post not found</h2>
        <Button variant="link" onClick={() => router.push('/admin/blogs')}>Return to CMS</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <BlogEditorForm initialData={post} isNew={false} />
    </div>
  );
}
