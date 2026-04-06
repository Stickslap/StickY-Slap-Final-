
'use client';

import React from 'react';
import { BlogEditorForm } from '../editor-form';

export default function NewBlogPostPage() {
  return (
    <div className="max-w-6xl mx-auto pb-20">
      <BlogEditorForm isNew={true} />
    </div>
  );
}
