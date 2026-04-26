import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-8">
      <h2 className="text-4xl font-bold mb-4 font-headline uppercase tracking-tighter">404 - Not Found</h2>
      <p className="text-muted-foreground mb-8 text-lg">The page you're looking for doesn't exist or has been moved.</p>
      <Link 
        href="/"
        className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all"
      >
        Return Home
      </Link>
    </div>
  );
}
