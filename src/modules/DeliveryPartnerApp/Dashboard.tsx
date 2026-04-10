import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { get, putupload } from '@/services/apiService';
import { toast } from 'sonner';
import { LoaderCircle, Camera, CheckCircle2, Package, MapPin, Phone, Info, RefreshCw, Navigation, History, PlayCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DeliveryPartnerDashboard() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('active');
  const [historyDate, setHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [historyStatus, setHistoryStatus] = useState<string>('ALL');
  const [cashStates, setCashStates] = useState<Record<number, string>>({});
  const [photoStates, setPhotoStates] = useState<Record<number, File | null>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, [historyDate]);

  const fetchAssignments = async () => {
    setFetching(true);
    try {
      const res = await get(`/delivery-app/my-orders?date=${historyDate}`);
      setAssignments(res.assignments || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load your deliveries");
    } finally {
      setFetching(false);
    }
  };

  const activeAssignments = useMemo(() => 
    assignments.filter(a => a.status !== 'DELIVERED' && a.status !== 'NOT_DELIVERED'), 
    [assignments]
  );
  
  const completedAssignments = useMemo(() => {
    let filtered = assignments.filter(a => a.status === 'DELIVERED' || a.status === 'NOT_DELIVERED');
    if (historyStatus !== 'ALL') {
      filtered = filtered.filter(a => a.status === historyStatus);
    }
    return filtered;
  }, [assignments, historyStatus]);

  const markDelivered = async (id: number) => {
    const cash = cashStates[id] || '0';
    const photo = photoStates[id];

    if (!photo) {
      toast.error("Proof image is required to complete delivery");
      return;
    }

    setLoading(prev => ({ ...prev, [id]: true }));
    try {
      const formData = new FormData();
      formData.append('status', 'DELIVERED');
      formData.append('cashCollected', cash);
      if (photo) {
        formData.append('deliveryPhoto', photo);
      }
      
      await putupload(`/delivery-app/assignment/${id}`, formData);
      toast.success("Delivery confirmed successfully!");
      fetchAssignments();
    } catch (e: any) {
      toast.error(e.message || "Could not update delivery status");
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const markNotDelivered = async (id: number) => {
    if (!confirm("Are you sure you want to mark this as NOT DELIVERED?")) return;
    
    setLoading(prev => ({ ...prev, [id]: true }));
    try {
      const formData = new FormData();
      formData.append('status', 'NOT_DELIVERED');
      
      await putupload(`/delivery-app/assignment/${id}`, formData);
      toast.success("Updated successfully");
      fetchAssignments();
    } catch (e: any) {
      toast.error(e.message || "Could not update status");
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const DeliveryRow = ({ a }: { a: any }) => {
    const items = a.snfOrder ? (a.snfOrder.items || []) : (a.deliveryScheduleEntry ? [a.deliveryScheduleEntry] : []);
    const customerName = a.snfOrder?.name || a.deliveryScheduleEntry?.deliveryAddress?.recipientName || 'Member';
    const orderNo = a.snfOrder?.orderNo || `SUBS-${a.deliveryScheduleEntryId}`;
    const address = a.snfOrder ? (a.snfOrder.addressLine1 || a.snfOrder.address) : a.deliveryScheduleEntry?.deliveryAddress?.plotBuilding;
    const city = a.snfOrder?.city || a.deliveryScheduleEntry?.deliveryAddress?.city;
    const mobile = a.snfOrder?.mobile || a.deliveryScheduleEntry?.deliveryAddress?.mobile;

    return (
      <div key={a.id} className="group bg-white border border-slate-200/60 rounded-2xl p-4 mb-4 last:mb-0 shadow-sm hover:shadow-md transition-all">
        <div className="grid grid-cols-1 lg:grid-cols-[110px_1.5fr_1.8fr_1.2fr_1.8fr] gap-4 lg:gap-6 items-center">
          {/* Status & ID Column */}
          <div className="flex flex-col gap-1 sm:items-start">
             <Badge className={`
                w-fit font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 border-none
                ${a.status === 'DELIVERED' ? 'bg-emerald-500 text-white' : a.status === 'NOT_DELIVERED' ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'}
             `}>
                {a.status === 'NOT_DELIVERED' ? 'NOT DELIVERED' : a.status}
             </Badge>
             <span className="text-[10px] font-mono text-slate-400">#{orderNo}</span>
          </div>

          {/* Customer Column */}
          <div className="flex flex-col">
             <p className="text-sm font-bold text-slate-900 truncate">{customerName}</p>
             {mobile && (
               <a href={`tel:${mobile}`} className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 hover:text-red-600 font-medium">
                 <Phone size={10} />
                 <span>{mobile}</span>
               </a>
             )}
          </div>

          {/* Address Column */}
          <div className="flex flex-col">
             <div className="flex items-start gap-1.5">
               <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
               <p className="text-xs text-slate-600 leading-tight">
                 {address || 'Direct Depot'}{city ? <span className="text-red-600 font-semibold">, {city}</span> : ''}
               </p>
             </div>
          </div>

          {/* Items Column */}
          <div className="flex flex-col gap-1.5">
             <div className="flex flex-wrap gap-1.5">
                {items.slice(0, 2).map((item: any, i: number) => (
                  <Badge key={i} variant="secondary" className="bg-slate-50 text-[10px] py-0 px-1.5 border-slate-100 text-slate-600">
                    {item.quantity}× {item.name || item.productName || item.product?.name || 'Item'}
                  </Badge>
                ))}
                {items.length > 2 && (
                  <span className="text-[9px] text-slate-400 font-bold">+{items.length - 2} more</span>
                )}
             </div>
          </div>

          {/* Actions Column */}
          <div className="lg:border-l lg:border-slate-100 lg:pl-6">
             {a.status !== 'DELIVERED' && a.status !== 'NOT_DELIVERED' ? (
               <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                  <div className="relative group w-full sm:w-28">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">₹</span>
                    <Input 
                      type="number" 
                      placeholder="0.0" 
                      className="pl-5 h-9 text-xs rounded-lg border-slate-200 bg-slate-50/50 focus-visible:ring-red-600 transition-all"
                      value={cashStates[a.id] || ''}
                      onChange={(e) => setCashStates(prev => ({ ...prev, [a.id]: e.target.value }))}
                    />
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    className={`
                      h-9 rounded-lg border-2 border-dashed transition-all shrink-0 text-[10px] font-bold uppercase
                      ${photoStates[a.id] ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50/50 border-slate-200 text-slate-400 hover:bg-slate-50'}
                    `}
                    onClick={() => document.getElementById(`file-${a.id}`)?.click()}
                  >
                    {photoStates[a.id] ? <CheckCircle2 size={12} /> : <Camera size={12} />}
                    <span className="ml-1.5">{photoStates[a.id] ? 'Attached' : 'Capture'}</span>
                  </Button>
                  <input 
                    id={`file-${a.id}`}
                    type="file" 
                    className="hidden"
                    onChange={(e) => setPhotoStates(prev => ({ ...prev, [a.id]: e.target.files?.[0] || null }))}
                  />

                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm"
                      className="h-9 w-full sm:w-auto px-4 rounded-lg bg-red-600 hover:bg-red-700 font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all"
                      onClick={() => markDelivered(a.id)}
                      disabled={loading[a.id]}
                    >
                      {loading[a.id] ? <LoaderCircle className="animate-spin" size={12} /> : "Complete"}
                    </Button>

                    <Button 
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 rounded-lg border-slate-200 text-slate-400 hover:text-red-600 transition-all"
                      onClick={() => markNotDelivered(a.id)}
                      disabled={loading[a.id]}
                      title="Mark as Not Delivered"
                    >
                      <LoaderCircle className={loading[a.id] ? "animate-spin" : "hidden"} size={14} />
                      <Info className={loading[a.id] ? "hidden" : "block"} size={14} />
                    </Button>
                  </div>
               </div>
             ) : (
               <div className={`flex items-center justify-between rounded-lg py-2 px-3 border ${a.status === 'DELIVERED' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                  <div className="flex items-center gap-2">
                    {a.status === 'DELIVERED' ? (
                      <>
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">{a.deliveredAt ? new Date(a.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Delivered'}</span>
                      </>
                    ) : (
                      <>
                        <Info size={14} className="text-amber-600" />
                        <span className="text-[10px] font-bold text-amber-700 uppercase">NOT DELIVERED</span>
                      </>
                    )}
                  </div>
                  {a.status === 'DELIVERED' && <span className="text-[10px] font-extrabold text-emerald-600">₹{a.cashCollected || '0.0'}</span>}
               </div>
             )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFEFE] pb-24">
      {/* Header section (Integrated) */}
      <div className="w-full pt-12 pb-6 px-10">
        <div className="w-full flex items-end justify-between border-b-2 border-slate-100 pb-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="h-4 w-1 bg-red-600 rounded-full" />
              <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none uppercase italic">
                Dispatch Hub
              </h1>
            </div>
            <p className="text-[11px] font-bold text-slate-400 tracking-[0.2em] ml-4 uppercase">Real-time Logistics Command</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Network Status</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-extrabold text-emerald-600 uppercase">Connected</span>
              </div>
            </div>
            <Button 
               variant="outline" 
               size="icon" 
               className="h-12 w-12 rounded-2xl hover:bg-white hover:text-red-600 border-slate-200 bg-slate-50/50 shadow-sm active:scale-90 transition-all" 
               onClick={fetchAssignments}
               disabled={fetching}
            >
              <RefreshCw size={20} className={`${fetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full px-6 mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
           <div className="flex items-center justify-between mb-8">
             <TabsList className="flex bg-slate-100/80 h-12 w-fit rounded-xl p-1 border border-slate-200/50 backdrop-blur-lg">
                <TabsTrigger value="active" className="px-6 rounded-lg font-bold text-[11px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm transition-all">
                   <PlayCircle size={14} className="mr-2" />
                   Active ({activeAssignments.length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="px-6 rounded-lg font-bold text-[11px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm transition-all">
                   <History size={14} className="mr-2" />
                   History ({completedAssignments.length})
                </TabsTrigger>
             </TabsList>

             {activeTab === 'completed' && (
               <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                 <div className="flex items-center gap-3 bg-white border border-slate-200/60 rounded-xl px-3 py-1.5 shadow-sm">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter by Date</span>
                   <Input 
                     type="date" 
                     value={historyDate}
                     onChange={(e) => setHistoryDate(e.target.value)}
                     className="h-8 text-[11px] font-bold border-none bg-transparent focus-visible:ring-0 w-32 p-0"
                   />
                 </div>

                 <div className="flex items-center gap-3 bg-white border border-slate-200/60 rounded-xl px-3 py-1.5 shadow-sm">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                   <Select value={historyStatus} onValueChange={setHistoryStatus}>
                     <SelectTrigger className="h-8 w-36 border-none bg-transparent focus:ring-0 text-[11px] font-bold uppercase p-0">
                       <SelectValue placeholder="All Status" />
                     </SelectTrigger>
                     <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                       <SelectItem value="ALL" className="text-[11px] font-bold uppercase">All Records</SelectItem>
                       <SelectItem value="DELIVERED" className="text-[11px] font-bold uppercase">Delivered</SelectItem>
                       <SelectItem value="NOT_DELIVERED" className="text-[11px] font-bold uppercase">Not Delivered</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>
             )}
           </div>

           <div className="hidden lg:grid grid-cols-[110px_1.5fr_1.8fr_1.2fr_1.8fr] gap-6 px-4 mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <div>Reference</div>
              <div>Customer</div>
              <div>Address</div>
              <div>Items</div>
              <div className="pl-6">Actions</div>
           </div>

           <TabsContent value="active" className="outline-none animate-in fade-in duration-300">
              {activeAssignments.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-20 flex flex-col items-center justify-center text-center mt-4">
                  <Package size={40} className="text-slate-200 mb-4" />
                  <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Assignment Queue Clear</p>
                </div>
              ) : (
                activeAssignments.map(a => <DeliveryRow key={a.id} a={a} />)
              )}
           </TabsContent>

           <TabsContent value="completed" className="outline-none animate-in fade-in duration-300">
              {completedAssignments.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-20 flex flex-col items-center justify-center text-center mt-4">
                  <History size={40} className="text-slate-200 mb-4" />
                  <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">No Delivery History</p>
                </div>
              ) : (
                completedAssignments.map(a => <DeliveryRow key={a.id} a={a} />)
              )}
           </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Nav Simulation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-4 flex justify-around items-center z-50 sm:hidden">
         <div className="flex flex-col items-center gap-1 text-red-600">
            <Navigation size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Route</span>
         </div>
         <div className="flex flex-col items-center gap-1 text-slate-300">
            <Info size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Help</span>
         </div>
      </div>
    </div>
  );
}
