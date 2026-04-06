
'use client';

import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Clock, 
  User, 
  Package, 
  LifeBuoy, 
  ShieldCheck,
  Calendar,
  Loader2,
  Trash,
  Tag,
  Zap,
  ImageIcon,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCollection, useMemoFirebase, useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import { ActivityLog } from '@/lib/types';
import { format, isValid } from 'date-fns';
import { toast } from '@/hooks/use-toast';

export default function AdminActivityPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch global activity logs
  const activityQuery = useMemoFirebase(() => 
    query(collection(db, 'activity'), orderBy('timestamp', 'desc'), limit(150)), 
  [db]);
  
  const { data: activity, isLoading } = useCollection<ActivityLog>(activityQuery);

  const filteredActivity = activity?.filter(log => 
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entityType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteLog = (id: string) => {
    if (confirm('Delete this log entry?')) {
      deleteDocumentNonBlocking(doc(db, 'activity', id));
      toast({ title: "Log Deleted" });
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'Order': return <Package className="h-4 w-4" />;
      case 'Ticket': return <LifeBuoy className="h-4 w-4" />;
      case 'User': return <User className="h-4 w-4" />;
      case 'Product': return <Package className="h-4 w-4 text-primary" />;
      case 'Promotion': return <Tag className="h-4 w-4 text-emerald-500" />;
      case 'Pricing': return <Zap className="h-4 w-4 text-amber-500" />;
      case 'Gallery': return <ImageIcon className="h-4 w-4 text-blue-500" />;
      case 'System': return <ShieldCheck className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatLogDate = (ts: string) => {
    if (!ts) return 'N/A';
    const date = new Date(ts);
    return isValid(date) ? format(date, 'MMM dd, yyyy • HH:mm:ss') : 'Invalid Date';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline tracking-tight uppercase italic">Activity Journal</h2>
          <p className="text-muted-foreground">Comprehensive audit log of workstation actions and system events.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Filter by Date
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search logs by action, user, or details..." 
              className="pl-8 bg-muted/20 border-none h-11 rounded-xl" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-48 flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Retrieving Journal...</p>
            </div>
          ) : (
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-muted before:z-0">
              {filteredActivity?.map((log) => (
                <div key={log.id} className="relative flex gap-6 items-start z-10 group">
                  <div className="h-10 w-10 rounded-full bg-background border-2 border-muted flex items-center justify-center shrink-0 shadow-sm group-hover:border-primary transition-colors">
                    {getEntityIcon(log.entityType)}
                  </div>
                  
                  <div className="flex-1 space-y-1 pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{log.action}</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 uppercase font-black tracking-tighter">
                          {log.entityType}
                        </Badge>
                      </div>
                      <time className="text-[10px] font-mono text-muted-foreground uppercase whitespace-nowrap">
                        {formatLogDate(log.timestamp)}
                      </time>
                    </div>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                      {log.details}
                    </p>
                    
                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                        <User className="h-3 w-3" />
                        <span>ID: {log.userId?.slice(0, 8) || 'System'}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-[10px] text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteLog(log.id)}
                      >
                        <Trash className="h-3 w-3 mr-1" /> Remove entry
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {!filteredActivity?.length && (
                <div className="py-20 text-center space-y-4 opacity-30 bg-muted/5 rounded-[2rem] border-2 border-dashed">
                  <AlertCircle className="h-12 w-12 mx-auto" />
                  <p className="text-sm font-bold uppercase tracking-widest italic">No activity logged yet. Perform actions to see them here.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
