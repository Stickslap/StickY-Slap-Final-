import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Printer, ShieldCheck, FileText } from 'lucide-react';

export const CONTRACT_VERSION = "2026.1";

interface ContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    fullName: string;
    billingAddress: string;
    shippingAddress: string;
    email: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp?: string;
    items?: any[];
    total?: number;
  };
}

export function ContractDialog({ open, onOpenChange, data }: ContractDialogProps) {
  const timestamp = data.timestamp || new Date().toLocaleString();
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen m-0 p-0 flex flex-col overflow-hidden rounded-none border-none shadow-none bg-background">
        <DialogHeader className="p-8 border-b bg-muted/10 shrink-0">
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Legal Agreement & Terms of Sale</DialogTitle>
                <DialogDescription className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Version {CONTRACT_VERSION} • Binding Digital Contract</DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={handlePrint} className="rounded-xl h-12 w-12">
                <Printer className="h-5 w-5" />
              </Button>
              <Button onClick={() => onOpenChange(false)} variant="ghost" className="rounded-xl h-12 px-6 font-black uppercase tracking-widest text-xs border-2">
                Exit View —
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-background">
          <div className="max-w-4xl mx-auto w-full p-12 md:p-20">
            <div className="prose prose-sm max-w-none text-muted-foreground space-y-12 font-medium leading-[1.8]" id="contract-content">
              <section className="text-center space-y-4 mb-20">
                <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-foreground leading-[0.9]">
                  STICKY SLAP LLC<br />
                  <span className="text-primary italic">—</span> CUSTOM PRINT AGREEMENT <span className="text-primary italic">&</span> TERMS OF SALE
                </h1>
                <div className="pt-4 flex flex-col items-center gap-1">
                  <p className="text-xs font-black uppercase tracking-[0.4em] opacity-40">Effective Date: {timestamp}</p>
                  <div className="h-1 w-20 bg-primary/20 rounded-full" />
                </div>
              </section>

              <p className="border-l-4 border-primary pl-4 italic">
                This Agreement (“Agreement”) is entered into between <strong>Sticky Slap LLC</strong> (“Business”) and the customer completing a purchase (“Customer”).
              </p>

              <hr className="border-muted" />

              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-base font-black uppercase tracking-widest text-foreground">1. Binding Acceptance & Electronic Signature</h3>
                  <p>By selecting “I Agree” at checkout, the Customer:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Enters into a legally binding contract</li>
                    <li>Provides a valid <strong>electronic signature</strong></li>
                    <li>Confirms full acceptance of all terms herein</li>
                  </ul>
                  <p className="text-[10px] uppercase font-bold text-primary">This agreement is enforceable under the U.S. Electronic Signatures in Global and National Commerce Act (E-SIGN Act).</p>
                </div>

                <hr className="border-muted" />

                <div className="space-y-4 p-6 bg-muted/10 border-2 border-dashed rounded-2xl">
                  <h3 className="text-base font-black uppercase tracking-widest text-foreground">2. Customer Identity Verification (Chargeback Defense Record)</h3>
                  <p>The following information is automatically collected and attached to this Agreement as proof of authorization:</p>
                  <div className="grid gap-2 text-xs">
                    <div className="flex justify-between border-b py-1"><span className="font-bold uppercase tracking-widest opacity-60">Full Name</span> <span className="text-foreground">{data.fullName || '[PENDING]'}</span></div>
                    <div className="flex justify-between border-b py-1"><span className="font-bold uppercase tracking-widest opacity-60">Billing Address</span> <span className="text-foreground text-right">{data.billingAddress || '[PENDING]'}</span></div>
                    <div className="flex justify-between border-b py-1"><span className="font-bold uppercase tracking-widest opacity-60">Shipping Address</span> <span className="text-foreground text-right">{data.shippingAddress || '[PENDING]'}</span></div>
                    <div className="flex justify-between border-b py-1"><span className="font-bold uppercase tracking-widest opacity-60">Email Address</span> <span className="text-foreground">{data.email || '[PENDING]'}</span></div>
                    <div className="flex justify-between border-b py-1"><span className="font-bold uppercase tracking-widest opacity-60">IP Address</span> <span className="text-foreground">{data.ipAddress || '[RECORDED]'}</span></div>
                    <div className="flex justify-between border-b py-1"><span className="font-bold uppercase tracking-widest opacity-60">Device / Browser</span> <span className="text-foreground text-right truncate max-w-[200px]">{data.userAgent || '[RECORDED]'}</span></div>
                    <div className="flex justify-between py-1"><span className="font-bold uppercase tracking-widest opacity-60">Date & Time of Acceptance</span> <span className="text-foreground">{timestamp}</span></div>
                  </div>

                  {data.items && data.items.length > 0 && (
                    <div className="mt-8 space-y-4 pt-6 border-t-2 border-muted">
                      <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Transaction Subset (Order Details)</h4>
                      <div className="space-y-3">
                        {data.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-start gap-4 text-[10px] font-bold uppercase">
                            <span className="truncate max-w-[200px]">{item.productName} ({item.quantity}x)</span>
                            <span className="shrink-0">${((item.pricePerUnit || 0) * (item.quantity || 0)).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="pt-3 border-t flex justify-between items-center text-xs font-black">
                          <span>Total (USD)</span>
                          <span className="text-primary text-sm">${(data.total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-[10px] uppercase font-bold text-destructive mt-6">Customer acknowledges this data may be used to contest chargebacks and payment disputes.</p>
                </div>

                <hr className="border-muted" />

                <div className="space-y-2">
                  <h3 className="text-base font-black uppercase tracking-widest text-foreground">3. Custom Product Acknowledgment (NO CANCELLATION / NO REFUND)</h3>
                  <p>All products sold by Sticky Slap LLC are <strong>custom-made based on Customer-uploaded designs</strong>.</p>
                  <p className="font-black uppercase italic text-foreground tracking-tight">By placing an order, the Customer agrees:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>All sales are <strong>FINAL</strong></li>
                    <li>Orders <strong>CANNOT be canceled, refunded, or reversed</strong> once production begins</li>
                    <li>Chargebacks claiming “product not as described” are invalid if the printed design matches the uploaded file</li>
                  </ul>
                </div>

                <hr className="border-muted" />

                <div className="space-y-3">
                  <h3 className="text-base font-black uppercase tracking-widest text-foreground">4. File Upload Responsibility & Print Accuracy</h3>
                  <p>The Customer is solely responsible for:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>File quality, resolution, spelling, and design content</li>
                    <li>Ensuring artwork is print-ready</li>
                  </ul>
                  <p>Sticky Slap LLC is <strong>NOT responsible</strong> for:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Low-resolution uploads</li>
                    <li>Color variations between screen and print</li>
                    <li>Minor alignment or trimming variances (industry standard tolerance)</li>
                  </ul>
                  <p className="font-bold italic">Approval of upload = <strong>final approval for print</strong></p>
                </div>

                <hr className="border-muted" />

                <div className="space-y-2">
                  <h3 className="text-base font-black uppercase tracking-widest text-foreground">5. Proof of Fulfillment (Anti-Chargeback Clause)</h3>
                  <p>Sticky Slap LLC maintains records including:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Uploaded artwork files</li>
                    <li>Order details and timestamps</li>
                    <li>Production records</li>
                    <li>Shipping confirmation and tracking</li>
                  </ul>
                  <p>These records serve as <strong>evidence of service fulfillment</strong> in any dispute.</p>
                </div>

                <hr className="border-muted" />

                <div className="space-y-2">
                  <h3 className="text-base font-black uppercase tracking-widest text-foreground">6. Shipping & Delivery</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Orders are considered fulfilled once shipped</li>
                    <li>Tracking information will be provided when available</li>
                    <li>Sticky Slap LLC is not liable for carrier delays once the package is in transit</li>
                  </ul>
                  <p>Claims of “item not received” must be addressed with the shipping carrier.</p>
                </div>

                <hr className="border-muted" />

                <div className="space-y-2">
                  <h3 className="text-base font-black uppercase tracking-widest text-foreground">7. Fraud & Chargeback Abuse Policy</h3>
                  <p>The Customer agrees:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Filing a fraudulent chargeback after receiving goods constitutes <strong>theft of services</strong></li>
                    <li>Sticky Slap LLC reserves the right to:
                      <ul className="list-circle pl-5 mt-1 space-y-1">
                        <li>Submit all collected evidence to the payment processor</li>
                        <li>Pursue recovery of funds</li>
                        <li>Report fraudulent activity to collections or legal authorities</li>
                      </ul>
                    </li>
                  </ul>
                </div>

                <hr className="border-muted" />

                <div className="space-y-2">
                  <h3 className="text-base font-black uppercase tracking-widest text-foreground">8. Payment Authorization</h3>
                  <p>By completing checkout, the Customer:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Confirms they are the authorized cardholder</li>
                    <li>Authorizes Sticky Slap LLC to charge the full purchase amount</li>
                    <li>Waives the right to unjustified chargebacks</li>
                  </ul>
                </div>

                <hr className="border-muted" />

                <div className="space-y-2">
                  <h3 className="text-base font-black uppercase tracking-widest text-foreground">9. Limitation of Liability</h3>
                  <p>Sticky Slap LLC shall not be liable for:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Indirect or incidental damages</li>
                    <li>Losses related to Customer-provided content</li>
                  </ul>
                  <p>Maximum liability shall not exceed the total amount paid for the order.</p>
                </div>

                <hr className="border-muted" />

                <div className="space-y-2">
                  <h3 className="text-base font-black uppercase tracking-widest text-foreground">10. Intellectual Property Responsibility</h3>
                  <p>The Customer affirms:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>They own or have rights to use all uploaded content</li>
                    <li>Sticky Slap LLC is not liable for copyright violations</li>
                  </ul>
                  <p>Customer assumes full legal responsibility for submitted designs.</p>
                </div>

                <hr className="border-muted" />

                <div className="space-y-2">
                  <h3 className="text-base font-black uppercase tracking-widest text-foreground">11. Governing Law</h3>
                  <p>This Agreement shall be governed by the laws of the State of Oklahoma.</p>
                </div>

                <hr className="border-muted" />

                <div className="space-y-2">
                  <h3 className="text-base font-black uppercase tracking-widest text-foreground">12. Entire Agreement</h3>
                  <p>This Agreement constitutes the full understanding between Sticky Slap LLC and the Customer and overrides any prior communications.</p>
                </div>

                <hr className="border-muted" />

                <div className="space-y-8 pt-12 border-t-2 border-dashed">
                  <div className="space-y-4">
                    <h3 className="text-lg font-black uppercase italic tracking-tighter text-foreground">13. Digital Signature Record</h3>
                    <div className="grid gap-2 text-[10px] font-black uppercase tracking-widest">
                      <p>Customer Name: <span className="text-primary">{data.fullName || '____________________'}</span></p>
                      <p>IP Address: <span className="text-primary">{data.ipAddress || '[RECORDED]'}</span></p>
                      <p>Date Signed: <span className="text-primary">{timestamp}</span></p>
                      <p>Agreement Method: Checkbox Consent at Checkout</p>
                    </div>
                  </div>
                  <p className="text-xs italic font-bold">By completing checkout, the Customer acknowledges they have read, understood, and agreed to all terms, and that this constitutes a legally binding contract.</p>
                  
                  <div className="pt-8 flex justify-between items-end">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Digital Authorization</p>
                      <div className="font-headline text-3xl italic tracking-tighter text-foreground opacity-20 select-none">STICKY SLAP LLC</div>
                    </div>
                    <FileText className="h-12 w-12 text-primary opacity-10" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
