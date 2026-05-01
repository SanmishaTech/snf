import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { get, putupload } from '@/services/apiService';
import { toast } from 'sonner';
import { LoaderCircle, Camera, CheckCircle2, Package, MapPin, Phone, Info, RefreshCw, Navigation, History, PlayCircle, XCircle, Search } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [cashStates, setCashStates] = useState<Record<number, string>>({});
  const [photoStates, setPhotoStates] = useState<Record<number, File | null>>({});
  const [statusStates, setStatusStates] = useState<Record<number, string>>({});
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

  const activeAssignments = useMemo(() => {
    let filtered = assignments.filter(a => a.status !== 'DELIVERED' && a.status !== 'NOT_DELIVERED' && a.status !== 'FAILED');
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => {
        const customerName = (a.snfOrder?.name || a.deliveryScheduleEntry?.deliveryAddress?.recipientName || 'Member').toLowerCase();
        const address = (a.snfOrder ? (a.snfOrder.addressLine1 || a.snfOrder.address) : (a.deliveryScheduleEntry?.deliveryAddress?.plotBuilding || '')).toLowerCase();
        const mobile = (a.snfOrder?.mobile || a.deliveryScheduleEntry?.deliveryAddress?.mobile || '').toLowerCase();
        const orderNo = (a.snfOrder?.orderNo || `SUBS-${a.deliveryScheduleEntryId}`).toLowerCase();
        return customerName.includes(term) || address.includes(term) || mobile.includes(term) || orderNo.includes(term);
      });
    }
    return filtered;
  }, [assignments, searchTerm]);

  const completedAssignments = useMemo(() => {
    let filtered = assignments.filter(a => a.status === 'DELIVERED' || a.status === 'NOT_DELIVERED' || a.status === 'FAILED');
    if (historyStatus !== 'ALL') {
      filtered = filtered.filter(a => a.status === historyStatus);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => {
        const customerName = (a.snfOrder?.name || a.deliveryScheduleEntry?.deliveryAddress?.recipientName || 'Member').toLowerCase();
        const address = (a.snfOrder ? (a.snfOrder.addressLine1 || a.snfOrder.address) : (a.deliveryScheduleEntry?.deliveryAddress?.plotBuilding || '')).toLowerCase();
        const mobile = (a.snfOrder?.mobile || a.deliveryScheduleEntry?.deliveryAddress?.mobile || '').toLowerCase();
        const orderNo = (a.snfOrder?.orderNo || `SUBS-${a.deliveryScheduleEntryId}`).toLowerCase();
        return customerName.includes(term) || address.includes(term) || mobile.includes(term) || orderNo.includes(term);
      });
    }
    return filtered;
  }, [assignments, historyStatus, searchTerm]);

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

  const markRejected = async (id: number) => {
    if (!confirm("Are you sure you want to mark this as REJECTED?")) return;

    setLoading(prev => ({ ...prev, [id]: true }));
    try {
      const formData = new FormData();
      formData.append('status', 'FAILED');

      await putupload(`/delivery-app/assignment/${id}`, formData);
      toast.success("Marked as Rejected");
      fetchAssignments();
    } catch (e: any) {
      toast.error(e.message || "Could not update status");
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleSubmitStatus = async (id: number) => {
    const status = statusStates[id] || 'DELIVERED';
    if (status === 'DELIVERED') {
      await markDelivered(id);
    } else if (status === 'NOT_DELIVERED') {
      await markNotDelivered(id);
    } else if (status === 'FAILED') {
      await markRejected(id);
    }
  };

  const renderDeliveryRow = (a: any) => {
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
            {a.snfOrder?.paymentMode && (
              <Badge variant="outline" className={`w-fit font-bold text-[8px] px-1.5 py-0 border-none rounded uppercase mt-1 ${a.snfOrder.paymentMode === 'CASH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                {a.snfOrder.paymentMode}
              </Badge>
            )}
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
          <div className="lg:border-l lg:border-slate-100 lg:pl-6">              {a.status !== 'DELIVERED' && a.status !== 'NOT_DELIVERED' && a.status !== 'FAILED' ? (
            <div className="flex flex-col gap-3.5 bg-slate-50/60 border border-slate-100 rounded-xl p-3.5 mt-2 lg:mt-0 shadow-sm w-full">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Update Delivery</span>
                {(() => {
                  const collectAmount = a.snfOrder?.paymentStatus === 'PENDING' ? (a.snfOrder.payableAmount || a.snfOrder.totalAmount || 0) : 0;
                  if (collectAmount <= 0) return null;
                  return (
                    <Badge variant="outline" className="text-[9px] font-black bg-amber-500/10 text-amber-600 border-amber-200/50 px-2 py-0.5 animate-pulse">
                      COLLECT: ₹{collectAmount}
                    </Badge>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 w-full">
                  <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Status</span>
                  <Select
                    value={statusStates[a.id] || 'DELIVERED'}
                    onValueChange={(val) => setStatusStates(prev => ({ ...prev, [a.id]: val }))}
                  >
                    <SelectTrigger className="h-10 border-slate-200/80 bg-white font-bold text-xs rounded-xl shadow-sm focus:ring-red-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      <SelectItem value="DELIVERED" className="font-bold text-xs text-emerald-600">Delivered</SelectItem>
                      <SelectItem value="NOT_DELIVERED" className="font-bold text-xs text-amber-600">Not Delivered</SelectItem>
                      <SelectItem value="FAILED" className="font-bold text-xs text-red-600">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(statusStates[a.id] || 'DELIVERED') === 'DELIVERED' && (
                  <div className="flex flex-col gap-1 w-full">
                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Collected Cash</span>
                    <div className="relative group">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">₹</span>
                      <Input
                        type="number"
                        placeholder="0.0"
                        className="pl-6 h-10 text-xs font-bold rounded-xl border-slate-200 bg-white focus-visible:ring-red-600 shadow-sm transition-all"
                        value={cashStates[a.id] || ''}
                        onChange={(e) => setCashStates(prev => ({ ...prev, [a.id]: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>

              {(statusStates[a.id] || 'DELIVERED') === 'DELIVERED' && (
                <div className="w-full">
                  <Button
                    variant="outline"
                    className={`
                             w-full h-11 rounded-xl border-2 border-dashed font-bold text-xs transition-all uppercase tracking-wide
                             ${photoStates[a.id] ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 shadow-sm'}
                           `}
                    onClick={() => document.getElementById(`file-${a.id}`)?.click()}
                  >
                    {photoStates[a.id] ? <CheckCircle2 size={15} className="mr-2 shrink-0 animate-bounce" /> : <Camera size={15} className="mr-2 shrink-0" />}
                    <span>{photoStates[a.id] ? 'Proof Attached' : 'Capture Delivery Proof'}</span>
                  </Button>
                  <input
                    id={`file-${a.id}`}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => setPhotoStates(prev => ({ ...prev, [a.id]: e.target.files?.[0] || null }))}
                  />
                </div>
              )}

              <Button
                className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                onClick={() => handleSubmitStatus(a.id)}
                disabled={loading[a.id]}
              >
                {loading[a.id] ? <LoaderCircle className="animate-spin" size={14} /> : "Update Status"}
              </Button>
            </div>
          ) : (
            <div className={`flex items-center justify-between rounded-xl py-3 px-4 border shadow-sm ${a.status === 'DELIVERED' ? 'bg-emerald-50 border-emerald-100' : a.status === 'FAILED' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
              <div className="flex items-center gap-2.5">
                {a.status === 'DELIVERED' ? (
                  <>
                    <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600"><CheckCircle2 size={14} /></div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-emerald-700 uppercase leading-none mb-0.5">Delivered</span>
                      <span className="text-[9px] font-medium text-emerald-600/80">{a.deliveredAt ? new Date(a.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                  </>
                ) : a.status === 'FAILED' ? (
                  <>
                    <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center text-red-600"><XCircle size={14} /></div>
                    <span className="text-xs font-bold text-red-700 uppercase">REJECTED</span>
                  </>
                ) : (
                  <>
                    <div className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600"><Info size={14} /></div>
                    <span className="text-xs font-bold text-amber-700 uppercase">NOT DELIVERED</span>
                  </>
                )}
              </div>
              {a.status === 'DELIVERED' && <span className="text-xs font-black text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-lg">₹{a.cashCollected || '0.0'}</span>}
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
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm w-full mb-6 max-w-md focus-within:border-red-600 transition-all">
            <Search size={16} className="text-slate-400 shrink-0" />
            <Input
              placeholder="Search customer, address, mobile, order no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-6 text-xs font-bold border-none bg-transparent focus-visible:ring-0 p-0 placeholder:text-slate-400 focus-visible:ring-offset-0 shadow-none focus:ring-0"
            />
          </div>
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
              activeAssignments.map(a => renderDeliveryRow(a))
            )}
          </TabsContent>

          <TabsContent value="completed" className="outline-none animate-in fade-in duration-300">
            {completedAssignments.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-20 flex flex-col items-center justify-center text-center mt-4">
                <History size={40} className="text-slate-200 mb-4" />
                <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">No Delivery History</p>
              </div>
            ) : (
              completedAssignments.map(a => renderDeliveryRow(a))
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
