import { CreditCard, Banknote, QrCode, ChevronRight, Receipt, Archive, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CheckoutSidebarProps {
  totalAmount: number;
  paymentMode: "CASH" | "WALLET" | "UPI";
  setPaymentMode: (mode: "CASH" | "WALLET" | "UPI") => void;
  cashReceived: number;
  setCashReceived: (val: number) => void;
  paymentRefNo: string;
  setPaymentRefNo: (val: string) => void;
  handleCreateOrder: () => void;
  isProcessing: boolean;
  canCheckout: boolean;
  selectedCustomer: any;
}

export function CheckoutSidebar({
  totalAmount,
  paymentMode,
  setPaymentMode,
  cashReceived,
  setCashReceived,
  paymentRefNo,
  setPaymentRefNo,
  handleCreateOrder,
  isProcessing,
  canCheckout,
  selectedCustomer,
}: CheckoutSidebarProps) {
  const cashChange = paymentMode === "CASH" ? Math.max(0, cashReceived - totalAmount) : 0;

  return (
    <div className="w-full md:w-[320px] md:border-l bg-[#E6EFF5] flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Checkout Summary Header */}
          <div className="flex flex-col gap-1">
            <h2 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase leading-none">CHECKOUT SUMMARY</h2>
            
            {/* Total Card */}
            <div className="mt-4 bg-white rounded-2xl p-6 shadow-xl border border-white/50 animate-in slide-in-from-right-10 duration-500">
               <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase leading-none block mb-3">TOTAL AMOUNT DUE</span>
               <div className="text-4xl font-black text-slate-800 tracking-tight flex items-baseline">
                  <span className="text-2xl mr-0.5">₹</span>
                  {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
               </div>
            </div>
          </div>

          {/* Payment Method Header */}
          <div className="space-y-4 pt-2">
            <h2 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase leading-none">PAYMENT METHOD</h2>
            
            <div className="space-y-3">
              {/* Credit/Debit Card Option (Placeholder for UI consistency) */}
              {/* Note: I'm mapping WALLET to CREDIT/DEBIT in visual style since our API has WALLET */}
              <button 
                onClick={() => setPaymentMode("WALLET")}
                className={`w-full group bg-white p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 relative ${paymentMode === "WALLET" ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:bg-slate-50 shadow-sm border border-slate-100/50'}`}
              >
                <div className={`p-2.5 rounded-xl transition-colors ${paymentMode === "WALLET" ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                  <CreditCard className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-bold text-sm text-slate-700 leading-tight">Wallet (Credit/Debit)</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide font-black mt-0.5">Visa, Mastercard, Amex</div>
                </div>
                <ChevronRight className={`w-5 h-5 transition-transform ${paymentMode === "WALLET" ? 'text-blue-500 translate-x-1' : 'text-slate-300 group-hover:translate-x-1'}`} />
              </button>

              {/* Cash Option */}
              <button 
                onClick={() => setPaymentMode("CASH")}
                className={`w-full group bg-white p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 relative ${paymentMode === "CASH" ? 'ring-2 ring-green-500 shadow-lg' : 'hover:bg-slate-50 shadow-sm border border-slate-100/50'}`}
              >
                <div className={`p-2.5 rounded-xl transition-colors ${paymentMode === "CASH" ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                  <Banknote className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-bold text-sm text-slate-700 leading-tight">Cash Payment</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide font-black mt-0.5">Physical Currency</div>
                </div>
                <ChevronRight className={`w-5 h-5 transition-transform ${paymentMode === "CASH" ? 'text-green-500 translate-x-1' : 'text-slate-300 group-hover:translate-x-1'}`} />
              </button>

              {/* UPI Option */}
              <button 
                onClick={() => setPaymentMode("UPI")}
                className={`w-full group bg-white p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 relative ${paymentMode === "UPI" ? 'ring-2 ring-purple-500 shadow-lg' : 'hover:bg-slate-50 shadow-sm border border-slate-100/50'}`}
              >
                <div className={`p-2.5 rounded-xl transition-colors ${paymentMode === "UPI" ? 'bg-purple-100 text-purple-600' : 'bg-slate-50 text-slate-400'}`}>
                   <QrCode className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-bold text-sm text-slate-700 leading-tight">UPI Transfer</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide font-black mt-0.5">Instant Digital Payment</div>
                </div>
                <ChevronRight className={`w-5 h-5 transition-transform ${paymentMode === "UPI" ? 'text-purple-500 translate-x-1' : 'text-slate-300 group-hover:translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Conditional Payment Inputs */}
          <div className="animate-in fade-in duration-300">
            {paymentMode === "CASH" && (
                <div className="bg-white p-4 rounded-2xl shadow-sm space-y-3">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cash Received</Label>
                  <Input 
                    type="number"
                    value={cashReceived || ''}
                    onChange={(e) => setCashReceived(Number(e.target.value))}
                    placeholder="₹ 0.00"
                    className="h-11 bg-slate-50 border-none rounded-xl text-lg font-black text-slate-800"
                  />
                  {cashReceived > 0 && (
                    <div className="flex items-center justify-between px-2 pt-1 border-t border-slate-50 mt-2">
                       <span className="text-[11px] font-bold text-slate-400 uppercase">Change</span>
                       <span className="text-sm font-black text-green-500">₹{cashChange.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
            )}
            
            {paymentMode === "UPI" && (
                <div className="bg-white p-4 rounded-2xl shadow-sm space-y-3 border-hidden">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">UPI Reference</Label>
                  <Input 
                    value={paymentRefNo}
                    onChange={(e) => setPaymentRefNo(e.target.value)}
                    placeholder="e.g. U123456"
                    className="h-11 bg-slate-50 border-none rounded-xl text-lg font-bold text-slate-800"
                  />
                </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Checkout Sidebar Footer */}
      <div className="p-6 bg-transparent border-hidden space-y-4">
        {/* Utility Buttons */}
        <div className="flex gap-3 h-12">
           <Button variant="outline" className="flex-1 rounded-xl h-full border-none shadow-sm font-black text-xs text-slate-600 gap-2 hover:bg-white transition-all">
             <Receipt className="w-5 h-5" />
             Receipt
           </Button>
           <Button variant="outline" className="flex-1 rounded-xl h-full border-none shadow-sm font-black text-xs text-slate-600 gap-2 hover:bg-white transition-all">
             <Archive className="w-5 h-5" />
             Held
           </Button>
        </div>

        {/* Process Payment Button */}
        <button 
          onClick={handleCreateOrder}
          disabled={!canCheckout || isProcessing}
          className={`w-full h-14 rounded-2xl shadow-2xl flex items-center justify-between px-6 transition-all duration-300 overflow-hidden relative group overflow-hidden ${(!canCheckout || isProcessing) ? 'bg-slate-300 cursor-not-allowed text-white/50' : 'bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white'}`}
        >
          {isProcessing ? (
             <span className="flex-1 text-center font-black uppercase text-sm tracking-widest animate-pulse">Processing...</span>
          ) : (
            <>
              <span className="font-black text-sm uppercase tracking-widest">Process Payment</span>
              <div className="p-2 bg-white/10 rounded-xl group-hover:translate-x-1 transition-transform border-none">
                 <ArrowRight className="w-5 h-5" />
              </div>
            </>
          )}

          {!selectedCustomer && !isProcessing && (
              <div className="absolute inset-0 bg-red-50/90 flex items-center justify-center pointer-events-none p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <p className="text-[10px] font-black text-red-600 uppercase tracking-tighter text-center">Please select a customer first</p>
              </div>
          )}
        </button>
      </div>
    </div>
  );
}
