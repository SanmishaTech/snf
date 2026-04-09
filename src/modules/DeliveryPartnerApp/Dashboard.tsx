import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { get, putupload } from '@/services/apiService';
import { toast } from 'sonner';
import { LoaderCircle, Camera, CheckCircle2, Package, MapPin, Phone, Info, RefreshCw, Navigation, History, PlayCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DeliveryPartnerDashboard() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [cashStates, setCashStates] = useState<Record<number, string>>({});
  const [photoStates, setPhotoStates] = useState<Record<number, File | null>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setFetching(true);
    try {
      const res = await get('/delivery-app/my-orders');
      setAssignments(res.assignments || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load your deliveries");
    } finally {
      setFetching(false);
    }
  };

  const activeAssignments = useMemo(() => 
    assignments.filter(a => a.status !== 'DELIVERED'), 
    [assignments]
  );
  
  const completedAssignments = useMemo(() => 
    assignments.filter(a => a.status === 'DELIVERED'), 
    [assignments]
  );

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

  const DeliveryCard = ({ a }: { a: any }) => {
    const items = a.snfOrder ? (a.snfOrder.items || []) : (a.deliveryScheduleEntry ? [a.deliveryScheduleEntry] : []);
    const customerName = a.snfOrder?.name || a.deliveryScheduleEntry?.deliveryAddress?.recipientName;
    const orderNo = a.snfOrder?.orderNo || `SUBS-${a.deliveryScheduleEntryId}`;
    const address = a.snfOrder?.addressLine1 || a.deliveryScheduleEntry?.deliveryAddress?.plotBuilding || 'No address provided';
    const city = a.snfOrder?.city || a.deliveryScheduleEntry?.deliveryAddress?.city;
    const mobile = a.snfOrder?.mobile || a.deliveryScheduleEntry?.deliveryAddress?.mobile;

    return (
      <Card key={a.id} className="border-none shadow-xl shadow-gray-200/50 rounded-[2rem] overflow-hidden bg-white ring-1 ring-gray-100 mb-6 last:mb-0">
        <CardHeader className="bg-white pt-6 px-6 pb-2">
          <div className="flex justify-between items-start mb-1">
            <Badge className={`
              font-black text-[9px] tracking-[0.15em] uppercase px-2.5 py-0.5 border-none
              ${a.status === 'DELIVERED' ? 'bg-green-500 text-white' : 'bg-primary text-white shadow-lg shadow-primary/20'}
            `}>
              {a.status}
            </Badge>
            <span className="text-[10px] font-black text-gray-300 tracking-widest uppercase italic">#{orderNo}</span>
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">{customerName}</h2>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-2 space-y-5">
          <div className="flex gap-2.5">
            <div className="bg-primary/5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0">
              <MapPin size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-600 leading-tight uppercase">
                {address}, <span className="text-primary">{city}</span>
              </p>
              {mobile && (
                <div className="flex items-center gap-1.5 mt-1 text-[10px] font-black text-gray-400">
                  <Phone size={10} />
                  <span>+91 {mobile}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden ring-4 ring-gray-50/50">
            <div className="grid grid-cols-[1fr_60px] bg-gray-100/50 px-3 py-1.5 text-[9px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100">
              <div>Shipment Contents</div>
              <div className="text-right">Units</div>
            </div>
            <div className="divide-y divide-gray-100">
              {items.map((item: any, i: number) => (
                <div key={i} className="grid grid-cols-[1fr_60px] px-3 py-2.5 items-center">
                  <p className="text-[11px] font-bold text-gray-700 uppercase leading-none truncate">
                    {item.name || item.productName || item.product?.name || 'Item'}
                  </p>
                  <div className="text-[11px] font-black text-primary text-right italic">
                    {item.quantity} QTY
                  </div>
                </div>
              ))}
            </div>
          </div>

          {a.status !== 'DELIVERED' ? (
            <div className="space-y-4 pt-2">
               <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        className="pl-7 h-11 rounded-xl border-2 border-gray-100 font-black text-gray-900 focus-visible:ring-primary h-12"
                        value={cashStates[a.id] || ''}
                        onChange={(e) => setCashStates(prev => ({ ...prev, [a.id]: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Photo Proof</Label>
                    <Button 
                      variant="outline" 
                      className={`
                        w-full h-12 rounded-xl border-2 border-dashed transition-all
                        ${photoStates[a.id] ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-400'}
                      `}
                      onClick={() => document.getElementById(`file-${a.id}`)?.click()}
                    >
                      {photoStates[a.id] ? <CheckCircle2 size={18} /> : <Camera size={18} />}
                      <span className="ml-2 text-[10px] font-black uppercase tracking-tight">
                        {photoStates[a.id] ? 'Attached' : 'Capture'}
                      </span>
                    </Button>
                    <input 
                      id={`file-${a.id}`}
                      type="file" 
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => setPhotoStates(prev => ({ ...prev, [a.id]: e.target.files?.[0] || null }))}
                    />
                  </div>
               </div>

               <Button 
                 className="w-full h-14 rounded-2xl font-black text-sm tracking-[0.2em] uppercase shadow-lg shadow-primary/25 active:scale-95 transition-all"
                 onClick={() => markDelivered(a.id)}
                 disabled={loading[a.id]}
               >
                 {loading[a.id] ? <LoaderCircle className="animate-spin mr-2" /> : "Verify & Complete"}
               </Button>
            </div>
          ) : (
            <div className="bg-green-500 rounded-2xl p-4 flex items-center justify-between border-b-4 border-green-600">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/70 uppercase tracking-widest leading-none mb-1">Delivered At</p>
                  <p className="text-xs font-black text-white uppercase">{new Date(a.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-white border-white/30 text-[9px] font-black tracking-widest px-2 py-0.5">
                ₹{a.cashCollected || '0.00'}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 flex flex-col items-center">
      {/* Header section (Sticky) */}
      <div className="w-full bg-white border-b border-gray-100 pt-6 pb-2 px-4 mb-2">
        <div className="max-w-md mx-auto flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Dispatch Hub</h1>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Partner Network v1.0</p>
          </div>
          <Button 
             variant="outline" 
             size="icon" 
             className="h-10 w-10 border-2 rounded-xl bg-white shadow-sm" 
             onClick={fetchAssignments}
             disabled={fetching}
          >
            <RefreshCw size={18} className={`${fetching ? 'animate-spin' : ''} text-gray-400`} />
          </Button>
        </div>
      </div>

      <div className="w-full max-w-md px-3 mt-4">
        <Tabs defaultValue="active" className="w-full">
           <TabsList className="grid grid-cols-2 bg-gray-100 h-12 rounded-2xl p-1 mb-6">
              <TabsTrigger value="active" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                 <PlayCircle size={14} className="mr-2" />
                 Active ({activeAssignments.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                 <History size={14} className="mr-2" />
                 History ({completedAssignments.length})
              </TabsTrigger>
           </TabsList>

           <TabsContent value="active" className="space-y-6 outline-none">
              {activeAssignments.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-100 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center mt-4">
                  <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center mb-4">
                    <Package size={32} className="text-gray-200" />
                  </div>
                  <p className="font-black text-gray-900 uppercase tracking-tight text-sm">All Clear</p>
                  <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">No pending deliveries</p>
                </div>
              ) : (
                activeAssignments.map(a => <DeliveryCard key={a.id} a={a} />)
              )}
           </TabsContent>

           <TabsContent value="completed" className="space-y-6 outline-none">
              {completedAssignments.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-100 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center mt-4">
                  <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center mb-4">
                    <History size={32} className="text-gray-200" />
                  </div>
                  <p className="font-black text-gray-900 uppercase tracking-tight text-sm">No History</p>
                  <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">You haven't completed any deliveries yet</p>
                </div>
              ) : (
                completedAssignments.map(a => <DeliveryCard key={a.id} a={a} />)
              )}
           </TabsContent>
        </Tabs>
      </div>
      
      {/* Bottom Nav Simulation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 flex justify-around items-center z-10 sm:hidden">
         <div className="flex flex-col items-center gap-1 text-primary">
            <Navigation size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">Route</span>
         </div>
         <div className="flex flex-col items-center gap-1 text-gray-300">
            <Info size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">Help</span>
         </div>
      </div>
    </div>
  );
}
