import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CreditCard, 
  Banknote, 
  QrCode, 
  ChevronRight, 
  Receipt, 
  Archive, 
  ArrowRight, 
  ArrowLeft,
  Landmark,
  CreditCard as CardIcon 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CheckoutSidebarProps {
  totalAmount: number;
  paymentMode: "CASH" | "WALLET" | "UPI" | "CHEQUE" | "CARD";
  setPaymentMode: (mode: "CASH" | "WALLET" | "UPI" | "CHEQUE" | "CARD") => void;
  cashReceived: number;
  setCashReceived: (val: number) => void;
  paymentRefNo: string;
  setPaymentRefNo: (val: string) => void;
  payerName: string;
  setPayerName: (val: string) => void;
  chequeNo: string;
  setChequeNo: (val: string) => void;
  bankName: string;
  setBankName: (val: string) => void;
  transactionId: string;
  setTransactionId: (val: string) => void;
  paymentDetails: string;
  setPaymentDetails: (val: string) => void;
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
  payerName,
  setPayerName,
  chequeNo,
  setChequeNo,
  bankName,
  setBankName,
  transactionId,
  setTransactionId,
  paymentDetails,
  setPaymentDetails,
  handleCreateOrder,
  isProcessing,
  canCheckout,
  selectedCustomer,
}: CheckoutSidebarProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const cashChange = paymentMode === "CASH" ? Math.max(0, cashReceived - totalAmount) : 0;

  const handleSelectMethod = (mode: "CASH" | "WALLET" | "UPI" | "CHEQUE" | "CARD") => {
    setPaymentMode(mode);
    setIsFlipped(true);
  };

  const handleBack = () => {
    setIsFlipped(false);
  };

  return (
    <div className="w-full md:w-[320px] md:border-l bg-[#E6EFF5] flex flex-col h-full overflow-hidden perspective-1000">
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          {!isFlipped ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 p-6 space-y-6 overflow-y-auto"
            >
              <h2 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase leading-none">CHECKOUT SUMMARY</h2>
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-white/50">
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase leading-none block mb-3">TOTAL AMOUNT DUE</span>
                <div className="text-4xl font-black text-slate-800 tracking-tight flex items-baseline">
                  <span className="text-2xl mr-0.5">₹</span>
                  {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h2 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase leading-none">PAYMENT METHOD</h2>
                <div className="space-y-3">
                  <PaymentMethodButton 
                    label="Wallet (Credit/Debit)" 
                    sublabel="Visa, Mastercard, Amex" 
                    icon={CardIcon} 
                    color="blue" 
                    onClick={() => handleSelectMethod("WALLET")} 
                    isActive={paymentMode === "WALLET"}
                  />
                  <PaymentMethodButton 
                    label="Cash Payment" 
                    sublabel="Physical Currency" 
                    icon={Banknote} 
                    color="green" 
                    onClick={() => handleSelectMethod("CASH")} 
                    isActive={paymentMode === "CASH"}
                  />
                  <PaymentMethodButton 
                    label="UPI Transfer" 
                    sublabel="Instant Digital Payment" 
                    icon={QrCode} 
                    color="purple" 
                    onClick={() => handleSelectMethod("UPI")} 
                    isActive={paymentMode === "UPI"}
                  />
                  <PaymentMethodButton 
                    label="Cheque Deposit" 
                    sublabel="Bank Draft / Cheque" 
                    icon={Landmark} 
                    color="amber" 
                    onClick={() => handleSelectMethod("CHEQUE")} 
                    isActive={paymentMode === "CHEQUE"}
                  />
                  <PaymentMethodButton 
                    label="Card Machine" 
                    sublabel="POS Swiping / Dip" 
                    icon={CreditCard} 
                    color="indigo" 
                    onClick={() => handleSelectMethod("CARD")} 
                    isActive={paymentMode === "CARD"}
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0 p-6 space-y-6 overflow-y-auto"
            >
              <div className="flex items-center gap-3">
                 <button onClick={handleBack} className="p-2 bg-white rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                 </button>
                 <h2 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase leading-none">
                    DETAILS: {paymentMode}
                 </h2>
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                {paymentMode === "CASH" && (
                    <div className="bg-white p-5 rounded-2xl shadow-xl space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Received</Label>
                        <Input 
                          type="number"
                          value={cashReceived || ''}
                          onChange={(e) => setCashReceived(Number(e.target.value))}
                          placeholder="₹ 0.00"
                          className="h-12 bg-slate-50 border-none rounded-xl text-lg font-black text-slate-800"
                        />
                      </div>
                      {cashReceived > 0 && (
                        <div className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-xl">
                           <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Change Due</span>
                           <span className="text-lg font-black text-green-700">₹{cashChange.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </div>
                )}

                {paymentMode === "UPI" && (
                    <div className="bg-white p-5 rounded-2xl shadow-xl space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UTR / Reference No.</Label>
                        <Input 
                          value={paymentRefNo}
                          onChange={(e) => setPaymentRefNo(e.target.value)}
                          placeholder="e.g. 1234567890"
                          className="h-12 bg-slate-50 border-none rounded-xl font-bold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payer Name</Label>
                        <Input 
                          value={payerName}
                          onChange={(e) => setPayerName(e.target.value)}
                          placeholder="Name of payer"
                          className="h-12 bg-slate-50 border-none rounded-xl font-bold text-slate-800"
                        />
                      </div>
                    </div>
                )}

                {paymentMode === "CHEQUE" && (
                    <div className="bg-white p-5 rounded-2xl shadow-xl space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cheque Number</Label>
                        <Input 
                          value={chequeNo}
                          onChange={(e) => setChequeNo(e.target.value)}
                          placeholder="000123"
                          className="h-12 bg-slate-50 border-none rounded-xl font-bold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank Name</Label>
                        <Input 
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="e.g. HDFC, SBI"
                          className="h-12 bg-slate-50 border-none rounded-xl font-bold text-slate-800"
                        />
                      </div>
                    </div>
                )}

                {paymentMode === "CARD" && (
                    <div className="bg-white p-5 rounded-2xl shadow-xl space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction ID</Label>
                        <Input 
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          placeholder="Ref number"
                          className="h-12 bg-slate-50 border-none rounded-xl font-bold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</Label>
                        <Input 
                          value={payerName}
                          onChange={(e) => setPayerName(e.target.value)}
                          placeholder="Name on card"
                          className="h-12 bg-slate-50 border-none rounded-xl font-bold text-slate-800"
                        />
                      </div>
                    </div>
                )}

                {paymentMode === "WALLET" && (
                    <div className="bg-blue-600 p-6 rounded-2xl shadow-2xl text-white space-y-4">
                        <Label className="text-[10px] font-black text-white/60 uppercase tracking-widest">Wallet Balance</Label>
                        <div className="text-3xl font-black mt-1">₹{selectedCustomer?.walletBalance?.toLocaleString('en-IN') || '0.00'}</div>
                        <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Remains</span>
                            <span className="font-black text-lg">₹{((selectedCustomer?.walletBalance || 0) - totalAmount).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                )}

                <div className="mt-6 space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes (Optional)</Label>
                    <Textarea 
                      value={paymentDetails}
                      onChange={(e) => setPaymentDetails(e.target.value)}
                      placeholder="..."
                      className="bg-white/50 border-none rounded-xl resize-none h-24 text-sm shadow-inner"
                    />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-6 bg-transparent border-hidden space-y-4">
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

        <button 
          onClick={handleCreateOrder}
          disabled={!canCheckout || isProcessing}
          className={`w-full h-14 rounded-2xl shadow-2xl flex items-center justify-between px-6 transition-all duration-300 relative group overflow-hidden ${(!canCheckout || isProcessing) ? 'bg-slate-300 cursor-not-allowed text-white/50' : 'bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white'}`}
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
                 <p className="text-[10px] font-black text-red-600 uppercase tracking-tighter text-center">Select customer first</p>
              </div>
          )}
        </button>
      </div>
    </div>
  );
}

function PaymentMethodButton({ label, sublabel, icon: Icon, color, onClick, isActive }: any) {
  const colorMap: any = {
    blue: "bg-blue-100 text-blue-600 ring-blue-500",
    green: "bg-green-100 text-green-600 ring-green-500",
    purple: "bg-purple-100 text-purple-600 ring-purple-500",
    amber: "bg-amber-100 text-amber-600 ring-amber-500",
    indigo: "bg-indigo-100 text-indigo-600 ring-indigo-500",
  };

  return (
    <button 
      onClick={onClick}
      className={`w-full group bg-white p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 relative ${isActive ? `ring-2 ${colorMap[color].split(' ')[2]} shadow-lg` : 'hover:bg-slate-50 shadow-sm border border-slate-100/50'}`}
    >
      <div className={`p-2.5 rounded-xl transition-colors ${isActive ? colorMap[color].split(' ').slice(0, 2).join(' ') : 'bg-slate-50 text-slate-400'}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="font-bold text-sm text-slate-700 leading-tight">{label}</div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wide font-black mt-0.5">{sublabel}</div>
      </div>
      <ChevronRight className={`w-5 h-5 transition-transform ${isActive ? "text-slate-600 translate-x-1" : "text-slate-300 group-hover:translate-x-1"}`} />
    </button>
  );
}
