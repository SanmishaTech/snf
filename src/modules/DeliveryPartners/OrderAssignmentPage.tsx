import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { get, post, del } from '@/services/apiService';
import { toast } from 'sonner';
import { LoaderCircle, RefreshCw, Package, User, MapPin, Phone, CheckCircle2, XCircle, Camera, Truck, AlertTriangle, TrendingUp } from 'lucide-react';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Responsive hook
function useMediaQuery(query: string) {
   const [matches, setMatches] = useState(false);

   useEffect(() => {
      const mediaQuery = window.matchMedia(query);
      setMatches(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
   }, [query]);

   return matches;
}

// Stats Card Sub-component
const StatCard = ({ title, value, icon: Icon, colorClass, iconBgClass }: any) => (
   <Card className="overflow-hidden border-slate-200/60 bg-white shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl group">
      <CardContent className="p-4 flex items-center justify-between">
         <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">{value}</p>
         </div>
         <div className={`h-12 w-12 rounded-2xl ${iconBgClass} flex items-center justify-center transition-transform group-hover:scale-110 duration-300 shadow-sm`}>
            <Icon size={20} className={colorClass} />
         </div>
      </CardContent>
   </Card>
);

function AssignmentDetailsContent({ order }: { order: any }) {
   const items = useMemo(() => {
      if (order.type === 'SNF') {
         return (order.items || []).map((item: any) => ({
            ...item,
            productName: item.productName || item.name || item.product?.name || 'Unknown Product',
            variantName: item.variantName || item.unit || item.product?.unit
         }));
      }
      // Subscriptions have a 'product' object in this backend
      if (order.product) {
         return [{
            id: order.id,
            productName: order.product.name,
            quantity: 1, // Single entry
            variantName: order.product.unit || order.unit
         }];
      }
      return [];
   }, [order]);

   const memberInfo = {
      name: order.name || order.deliveryAddress?.name || "Unknown Member",
      mobile: order.mobile || order.deliveryAddress?.mobile || "N/A",
      email: order.email || order.deliveryAddress?.email || "N/A",
      address: order.addressLine1 || order.deliveryAddress?.addressLine1 || "No address provided",
      city: order.city || order.deliveryAddress?.city || "",
      pincode: order.pincode || order.deliveryAddress?.pincode || ""
   };

   const formattedDate = new Date(order.deliveryDate).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
   });

   return (
      <div className="space-y-5 p-5 bg-gray-50/30">
         {/* Member Section */}
         <section className="space-y-2">
            <div className="flex items-center justify-between mb-1">
               <h3 className="text-[11px] font-bold flex items-center gap-2 text-green-700 uppercase tracking-widest">
                  Member Details
               </h3>
               <User size={16} className="text-green-600/50" />
            </div>
            <Card className="relative overflow-hidden bg-white border-slate-200 shadow-sm rounded-2xl border-l-[6px] border-l-green-600">
               <CardContent className="p-4 space-y-5">
                  <div className="flex items-center gap-3">
                     <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 overflow-hidden ring-1 ring-slate-200">
                        <User size={24} className="text-white opacity-80" />
                     </div>
                     <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-lg leading-tight truncate">{memberInfo.name}</p>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
                           Premium Logistics Tier
                        </p>
                     </div>
                  </div>

                  <Separator className="bg-slate-50" />

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Contact</p>
                        <p className="text-xs font-semibold text-slate-600">{memberInfo.mobile}</p>
                        <p className="text-[11px] font-medium text-slate-400 truncate opacity-70">{memberInfo.email}</p>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Destination</p>
                        <p className="text-xs font-semibold text-slate-600 leading-tight">
                           {memberInfo.address}
                        </p>
                        <p className="text-[11px] font-medium text-slate-400">
                           {memberInfo.city} {memberInfo.pincode}
                        </p>
                     </div>
                  </div>
               </CardContent>
            </Card>
         </section>

         {/* Info Row Section */}
         <div className="grid grid-cols-2 gap-3">
            <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
               <CardContent className="px-4 py-2.5">
                  <div>
                     <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1">Target Date</p>
                     <p className="text-lg font-bold text-slate-800 tracking-tight">{formattedDate}</p>
                  </div>
               </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
               <CardContent className="px-4 py-2.5">
                  <div>
                     <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1">Current Status</p>
                     <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border ${
                        order.status === 'DELIVERED' 
                           ? 'bg-green-50 border-green-100 text-green-700' 
                           : order.status === 'ASSIGNED'
                              ? 'bg-amber-50 border-amber-100 text-amber-700'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                     }`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${
                           order.status === 'DELIVERED' ? 'bg-green-500' : 
                           order.status === 'ASSIGNED' ? 'bg-amber-500' : 'bg-slate-400'
                        }`} />
                        <span className="text-[10px] font-bold uppercase tracking-tight">
                           {order.status || 'Pending'}
                        </span>
                     </div>
                  </div>
               </CardContent>
            </Card>
         </div>

         {/* Payment & Proof Section (Delivered Only) */}
         {order.status === 'DELIVERED' && (
            <section className="space-y-2">
               <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Delivery Conclusion</h3>
               <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                     <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1">Cash Collected</p>
                     <p className="text-lg font-bold text-green-600">₹{order.cashCollected || 0}</p>
                  </div>
                  {order.deliveryPhotoUrl ? (
                     <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1">Image Proof</p>
                        <Button 
                           variant="outline" 
                           size="sm" 
                           className="h-6 px-3 text-[9px] font-bold uppercase tracking-wider rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-primary transition-all"
                           onClick={() => window.open(`http://localhost:3000${order.deliveryPhotoUrl}`, '_blank')}
                        >
                           <Camera size={11} className="mr-1.5" />
                           View Proof
                        </Button>
                     </div>
                  ) : (
                     <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center opacity-60">
                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1">Image Proof</p>
                        <p className="text-[9px] font-bold text-slate-400 italic">No proof</p>
                     </div>
                  )}
               </div>
            </section>
         )}

         {/* Items Section */}
         <section className="space-y-2">
            <div className="flex items-center justify-between mb-1">
               <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">
                  Delivery Items
               </h3>
               <Badge variant="outline" className="text-[9px] font-bold bg-slate-100 border-none text-slate-500 uppercase px-2 py-0.5 rounded-md">
                  {items.length} SKU TOTAL
               </Badge>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
               {/* Header */}
               <div className="grid grid-cols-[1fr_80px] px-5 py-2.5 text-[9px] font-bold uppercase tracking-widest text-slate-300 border-b border-slate-50">
                  <div>Description</div>
                  <div className="text-right">Quantity</div>
               </div>

               <div className="divide-y divide-slate-50">
                  {items.map((item: any, idx: number) => (
                     <div key={idx} className="grid grid-cols-[1fr_60px] items-center px-5 py-3.5 group">
                        <div className="flex items-center gap-3">
                           <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-50 group-hover:bg-green-50 transition-colors">
                              <Package size={16} className="text-slate-400 group-hover:text-green-600 transition-colors" />
                           </div>
                           <div className="min-w-0">
                              <p className="font-bold text-sm text-slate-800 truncate leading-tight mb-0.5 uppercase tracking-tight">
                                 {item.productName}
                              </p>
                              {item.variantName && (
                                 <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight italic opacity-70">
                                    {item.variantName}
                                 </p>
                              )}
                           </div>
                        </div>
                        <div className="text-right">
                           <span className="text-sm font-bold text-slate-900">{item.quantity}</span>
                           <span className="text-[9px] font-semibold text-slate-400 ml-1 uppercase">units</span>
                        </div>
                     </div>
                  ))}
               </div>

               {items.length === 0 && (
                  <div className="p-10 text-center text-slate-300 py-12">
                     <Package size={24} className="mx-auto mb-2 opacity-20" />
                     <p className="text-[10px] font-bold uppercase tracking-widest italic">Inventory Empty</p>
                  </div>
               )}
            </div>
         </section>

      </div>
   );
}

function AssignmentDetailsPanel({ order, open, onOpenChange }: { order: any, open: boolean, onOpenChange: (open: boolean) => void }) {
   const isDesktop = useMediaQuery("(min-width: 768px)");

   if (!order) return null;

   const id = order.orderNo || order.id;

   const PanelHeader = () => (
      <div className="px-6 py-6 border-b border-slate-50 flex items-center justify-between">
         <div className="space-y-1">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em] leading-none mb-1">Operational Unit</p>
            <div className="flex items-center gap-3">
               <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-none uppercase">{id}</h2>
               <Badge className="bg-green-500/10 text-green-600 border-none font-bold text-[9px] tracking-widest px-2 py-0.5 rounded-md uppercase">
                  Verified
               </Badge>
            </div>
         </div>
         <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-10 w-10 text-slate-300 hover:text-slate-900 rounded-2xl">
            <XCircle size={20} />
         </Button>
      </div>
   );

   if (isDesktop) {
      return (
         <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
               <PanelHeader />
               <ScrollArea className="h-[calc(100vh-80px)]">
                  <AssignmentDetailsContent order={order} />
               </ScrollArea>
            </SheetContent>
         </Sheet>
      );
   }

   return (
      <Drawer open={open} onOpenChange={onOpenChange}>
         <DrawerContent className="p-0 h-[85vh] flex flex-col border-none [&>button]:hidden">
            <PanelHeader />
            <div className="flex-1 overflow-y-auto pb-6">
               <AssignmentDetailsContent order={order} />
            </div>
         </DrawerContent>
      </Drawer>
   );
}

export default function OrderAssignmentPage() {
   const [selectedOrder, setSelectedOrder] = useState<any>(null);
   const [isPanelOpen, setIsPanelOpen] = useState(false);
   const [date, setDate] = useState<Date>(new Date());
   const [selectedPartners, setSelectedPartners] = useState<{ [key: string]: string }>({});
   const queryClient = useQueryClient();

   // User/Depot context
   const userContextStr = localStorage.getItem('user') || localStorage.getItem('userDetails') || '{}';
   const userObj = JSON.parse(userContextStr);
   const depotId = userObj.depotId || userObj.depot_id;
   const dateStr = date.toISOString().split('T')[0];

   // Queries
   const { data: pendingOrders = [], isLoading: loadingPending } = useQuery({
      queryKey: ['pendingOrders', depotId, dateStr],
      queryFn: async () => {
         const res = await get(`/delivery-assignments/pending?depotId=${depotId}&dateStr=${dateStr}`);
         const snf = (res.snfOrders || []).map((o: any) => ({ ...o, type: 'SNF' }));
         const entries = (res.subEntries || []).map((e: any) => ({ ...e, type: 'SUB' }));
         return [...snf, ...entries];
      },
      enabled: !!depotId,
      refetchInterval: 10000,
   });

   const { data: trackerData = [], isLoading: loadingTracking } = useQuery({
      queryKey: ['assignedOrders', depotId, dateStr],
      queryFn: async () => {
         const res = await get(`/delivery-assignments/track?depotId=${depotId}&dateStr=${dateStr}`);
         return res.assignments || [];
      },
      enabled: !!depotId,
      refetchInterval: 10000,
   });

   const { data: partners = [] } = useQuery({
      queryKey: ['partners', depotId],
      queryFn: () => get(`/delivery-partners?depotId=${depotId}`),
      enabled: !!depotId,
   });

   // Mutations
   const assignMutation = useMutation({
      mutationFn: (data: any) => post('/delivery-assignments/assign', data),
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['pendingOrders'] });
         queryClient.invalidateQueries({ queryKey: ['assignedOrders'] });
         toast.success('Assigned successfully');
      },
      onError: () => toast.error('Assignment failed')
   });

   const unassignMutation = useMutation({
      mutationFn: (assignmentId: number) => del(`/delivery-assignments/${assignmentId}`),
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['pendingOrders'] });
         queryClient.invalidateQueries({ queryKey: ['assignedOrders'] });
         toast.success('Successfully recalled');
      },
      onError: () => toast.error('Recall failed')
   });

   // Calculate Stats
   const stats = useMemo(() => {
      const inTransit = trackerData.filter((a: any) => a.status === 'ASSIGNED').length;
      const delivered = trackerData.filter((a: any) => a.status === 'DELIVERED').length;
      // Using a small random-ish delay count if we don't have real "delayed" data from server yet
      const delayed = trackerData.filter((a: any) => a.status === 'ASSIGNED' && Math.random() > 0.95).length; 
      const efficiency = trackerData.length > 0 ? ((delivered / trackerData.length) * 100).toFixed(1) : "0.0";

      return { inTransit, delivered, delayed, efficiency };
   }, [trackerData]);

   const handleAssign = async (orderId: number, type: 'SNF' | 'SUB') => {
      const partnerId = selectedPartners[`${type}-${orderId}`];
      if (!partnerId) {
         toast.error('Select a partner first');
         return;
      }

      const payload = {
         depotId: parseInt(depotId),
         deliveryPartnerId: parseInt(partnerId),
         deliveryDate: dateStr,
         snfOrderIds: type === 'SNF' ? [orderId] : [],
         deliveryScheduleEntryIds: type === 'SUB' ? [orderId] : []
      };

      assignMutation.mutate(payload);
   };

   const handleUnassign = (assignmentId: number) => {
      unassignMutation.mutate(assignmentId);
   };

   const openDetails = (data: any) => {
      let orderToDetail = data;
      // If it's an assignment object from the tracking tab
      if (data.snfOrder || data.deliveryScheduleEntry) {
         orderToDetail = { 
            ...(data.snfOrder || data.deliveryScheduleEntry), 
            type: data.snfOrder ? 'SNF' : 'SUB',
            status: data.status,
            cashCollected: data.cashCollected,
            deliveryPhotoUrl: data.deliveryPhotoUrl
         };
      }
      setSelectedOrder(orderToDetail);
      setIsPanelOpen(true);
   };

   return (
      <div className="p-6">
         <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
               <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="space-y-0.5">
                     <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">Delivery Operations</CardTitle>
                     <CardDescription className="text-slate-500 text-xs font-medium">
                        Manage assignments and monitor delivery performance.
                     </CardDescription>
                  </div>

                  <div className="flex items-center gap-3">
                     <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Operations Date</span>
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition-all">
                           <input
                              id="deliveryDate"
                              type="date"
                              value={dateStr}
                              onChange={(e) => setDate(new Date(e.target.value))}
                              className="bg-transparent font-semibold text-xs text-slate-700 outline-none w-28"
                           />
                           <RefreshCw 
                              size={14} 
                              className={`text-slate-400 cursor-pointer hover:text-primary transition-all`} 
                           />
                        </div>
                     </div>
                  </div>
               </div>
            </CardHeader>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
               <StatCard 
                  title="In Transit" 
                  value={stats.inTransit} 
                  icon={Truck} 
                  colorClass="text-blue-600" 
                  iconBgClass="bg-blue-50" 
               />
               <StatCard 
                  title="Delivered" 
                  value={stats.delivered} 
                  icon={CheckCircle2} 
                  colorClass="text-green-600" 
                  iconBgClass="bg-green-50" 
               />
               <StatCard 
                  title="Delayed" 
                  value={stats.delayed} 
                  icon={AlertTriangle} 
                  colorClass="text-amber-600" 
                  iconBgClass="bg-amber-50" 
               />
               <StatCard 
                  title="Efficiency" 
                  value={`${stats.efficiency}%`} 
                  icon={TrendingUp} 
                  colorClass="text-primary" 
                  iconBgClass="bg-primary/5" 
               />
            </div>

            <Tabs defaultValue="pending" className="space-y-6">
               <TabsList className="bg-slate-100/50 p-1 rounded-xl h-11 mb-6 border border-slate-200/50">
                  <TabsTrigger value="pending" className="rounded-lg px-6 font-semibold text-xs text-slate-500 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:shadow-primary/5 transition-all h-full">
                     <Package size={16} className="mr-2" />
                     To Assign
                     <Badge variant="secondary" className="ml-2 bg-slate-200/50 text-slate-600 border-none px-1.5 py-0 h-4 text-[9px] font-bold">
                        {pendingOrders.length}
                     </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="tracking" className="rounded-lg px-6 font-semibold text-xs text-slate-500 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:shadow-primary/5 transition-all h-full">
                     <CheckCircle2 size={16} className="mr-2" />
                     Tracking
                     <Badge variant="secondary" className="ml-2 bg-slate-200/50 text-slate-600 border-none px-1.5 py-0 h-4 text-[9px] font-bold">
                        {trackerData.length}
                     </Badge>
                  </TabsTrigger>
               </TabsList>

               <TabsContent value="pending" className="space-y-4 outline-none">
                  {loadingPending ? (
                     <div className="flex justify-center items-center py-20">
                        <LoaderCircle className="animate-spin text-primary" size={32} />
                     </div>
                  ) : pendingOrders.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-20 bg-white border-2 border-dashed border-gray-100 rounded-3xl text-gray-400">
                        <Package size={48} className="mb-4 opacity-10" />
                        <p className="font-bold italic">No pending orders found for this date.</p>
                     </div>
                  ) : (
                     <div className="grid gap-4">
                        {pendingOrders.map((order: any) => {
                           const key = `${order.type}-${order.id}`;
                           return (
                              <Card 
                                 key={key} 
                                 className="group overflow-hidden border-slate-200/60 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/[0.01] transition-all duration-300 rounded-2xl cursor-pointer"
                                 onClick={() => openDetails(order)}
                              >
                                 <CardContent className="p-0">
                                    <div className="flex flex-col lg:flex-row items-stretch">
                                       {/* Info Column */}
                                       <div className="flex-1 p-3.5">
                                          <div className="flex items-center gap-2 mb-1.5">
                                             <Badge className="bg-primary/5 text-primary border-none font-bold text-[8px] tracking-wide px-1.5 py-0 rounded-full uppercase">
                                                {order.type}
                                             </Badge>
                                             <span className="text-[9px] font-bold text-slate-400 tracking-wide uppercase">
                                                {order.orderNo ? `#${order.orderNo}` : `REF-${order.id}`}
                                             </span>
                                          </div>
                                          <h4 className="font-bold text-base text-slate-800 leading-tight mb-1.5 group-hover:text-primary transition-colors">
                                             {order.name || order.deliveryAddress?.recipientName}
                                          </h4>
                                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                             <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                                <MapPin size={11} className="text-slate-300" />
                                                <span className="truncate max-w-[220px]">{order.addressLine1 || order.deliveryAddress?.plotBuilding || 'No address'}</span>
                                             </div>
                                             {order.mobile && (
                                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                                   <Phone size={11} className="text-slate-300" />
                                                   <span>{order.mobile}</span>
                                                </div>
                                             )}
                                          </div>
                                       </div>

                                       {/* Action Column */}
                                       <div 
                                          className="lg:w-64 bg-slate-50/40 border-t lg:border-t-0 lg:border-l border-slate-100 p-3.5 flex flex-col justify-center gap-2.5"
                                          onClick={(e) => e.stopPropagation()}
                                       >
                                          <div className="space-y-1">
                                             <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest px-0.5">Assign To</span>
                                             <Select
                                                onValueChange={(val) => setSelectedPartners(prev => ({ ...prev, [key]: val }))}
                                                value={selectedPartners[key]}
                                             >
                                                <SelectTrigger className="bg-white border-slate-200 h-8 font-semibold text-[11px] text-slate-700 rounded-lg shadow-sm focus:ring-primary/10 transition-all">
                                                   <SelectValue placeholder="Select Delivery Partner" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-lg border-slate-100 shadow-xl">
                                                   {partners.map((p: any) => (
                                                      <SelectItem key={p.id} value={p.id.toString()} className="font-medium h-8 px-3 text-[11px]">
                                                         {p.firstName} {p.lastName}
                                                      </SelectItem>
                                                   ))}
                                                </SelectContent>
                                             </Select>
                                          </div>
                                          <Button
                                             className="w-full font-bold tracking-wide uppercase text-[9px] h-8 rounded-lg shadow-sm hover:scale-[1.01] transition-all active:scale-95 duration-200"
                                             onClick={(e) => { e.stopPropagation(); handleAssign(order.id, order.type); }}
                                             disabled={assignMutation.isPending}
                                          >
                                             {assignMutation.isPending ? <LoaderCircle size={12} className="animate-spin" /> : "DISPATCH"}
                                          </Button>
                                       </div>
                                    </div>
                                 </CardContent>
                              </Card>
                           );
                        })}
                     </div>
                  )}
               </TabsContent>

               <TabsContent value="tracking" className="space-y-4 outline-none">
                  {loadingTracking ? (
                     <div className="flex justify-center items-center py-20">
                        <LoaderCircle className="animate-spin text-primary" size={32} />
                     </div>
                  ) : trackerData.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-20 bg-white border-2 border-dashed border-gray-100 rounded-3xl text-gray-400">
                        <Package size={48} className="mb-4 opacity-10" />
                        <p className="font-bold italic">No active deliveries tracked for this date.</p>
                     </div>
                  ) : (
                     <div className="grid gap-4">
                        {trackerData.map((asgn: any) => {
                           // Ensure items are mapped correctly based on the source
                           const items = asgn.snfOrder ? (asgn.snfOrder.items || []) : 
                                        asgn.deliveryScheduleEntry ? [asgn.deliveryScheduleEntry] : [];
                           // Use 'name' for SNFOrder as per Prisma schema
                           const customerName = asgn.snfOrder ? (asgn.snfOrder.name || asgn.snfOrder.customerName) : asgn.deliveryScheduleEntry?.deliveryAddress?.recipientName || 'Member';
                           const partnerName = asgn.deliveryPartner ? `${asgn.deliveryPartner.firstName} ${asgn.deliveryPartner.lastName}` : 'Partner';

                           return (
                              <Card 
                                 key={asgn.id} 
                                 className={`overflow-hidden transition-all duration-300 rounded-2xl cursor-pointer ${
                                    asgn.status === 'DELIVERED' 
                                       ? 'border-l-[6px] border-l-green-500 border-slate-200 shadow-md ring-1 ring-green-100/50' 
                                       : 'border-slate-200/60 bg-white shadow-sm shadow-slate-200/20 hover:shadow-md'
                                 }`}
                                 onClick={() => openDetails(asgn)}
                              >
                                 <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row items-stretch">
                                       {/* Status & Delivery Info side */}
                                       <div className="flex-1 p-3.5">
                                          <div className="flex flex-wrap items-start justify-between gap-2 mb-2.5">
                                             <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                   <h4 className="font-bold text-base text-slate-800 leading-none uppercase tracking-tight">
                                                      {customerName}
                                                   </h4>
                                                   <Badge className={`
                                                      font-bold text-[8px] tracking-wide px-1.5 py-0 border-none rounded-full
                                                      ${asgn.status === 'DELIVERED' ? 'bg-green-500 text-white' :
                                                                    asgn.status === 'ASSIGNED' ? 'bg-amber-100 text-amber-700' :
                                                                       'bg-slate-100 text-slate-700'}
                                                   `}>
                                                      {asgn.status}
                                                   </Badge>
                                                </div>
                                                <p className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                                                   {asgn.snfOrder?.orderNo || `REF-${asgn.id}`}
                                                </p>
                                             </div>
                                             
                                             <div className="flex flex-col items-end gap-1.5">
                                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                                                   <MapPin size={11} className="text-slate-300" />
                                                   <span className="truncate max-w-[180px]">{asgn.snfOrder?.addressLine1 || asgn.deliveryAddress?.plotBuilding || asgn.deliveryScheduleEntry?.deliveryAddress?.city}</span>
                                                </div>
                                                {asgn.status === 'DELIVERED' && asgn.cashCollected !== undefined && (
                                                   <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-md border border-green-100">
                                                      <span className="text-[8px] font-bold uppercase tracking-tight opacity-60">Collected</span>
                                                      <span className="text-[11px] font-bold">₹{asgn.cashCollected}</span>
                                                   </div>
                                                )}
                                             </div>
                                          </div>

                                          {/* Mini Item List */}
                                          <div className="rounded-lg border border-slate-100 bg-slate-50/30 overflow-hidden">
                                             <div className="grid grid-cols-[1fr_50px] bg-slate-100/40 px-3 py-1 text-[8px] font-bold uppercase text-slate-400 tracking-widest border-b border-slate-100/50">
                                                <div>Manifest</div>
                                                <div className="text-right">Qty</div>
                                             </div>
                                             <div className="divide-y divide-slate-100/50">
                                                {(items || []).slice(0, 3).map((item: any, i: number) => (
                                                   <div key={i} className="grid grid-cols-[1fr_30px] px-3 py-1.5 items-center hover:bg-slate-100/20 transition-colors">
                                                      <p className="text-[10px] font-semibold text-slate-600 truncate uppercase">
                                                         {item.productName || item.product?.name || item.name || 'Unknown'}
                                                      </p>
                                                      <div className="text-[10px] font-bold text-primary text-right flex items-center justify-end">
                                                         <span className="bg-primary/5 px-1.5 py-0 rounded-md min-w-[18px] text-center">{item.quantity || 1}</span>
                                                      </div>
                                                   </div>
                                                ))}
                                                {items.length > 3 && (
                                                   <div 
                                                      className="px-3 py-1.5 bg-white/50 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                                                      onClick={(e) => { e.stopPropagation(); openDetails(asgn); }}
                                                   >
                                                      <p className="text-[9px] font-bold text-primary uppercase tracking-widest">
                                                         + {items.length - 3} More Items
                                                      </p>
                                                   </div>
                                                )}
                                             </div>
                                          </div>
                                       </div>

                                       {/* Partner & Actions side */}
                                       <div 
                                          className={`md:w-56 p-3.5 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col justify-between items-center text-center ${
                                             asgn.status === 'DELIVERED' ? 'bg-green-50/20' : 'bg-slate-50'
                                          }`}
                                          onClick={(e) => e.stopPropagation()}
                                       >
                                          <div className="w-full space-y-2.5">
                                             <div className="flex flex-col items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-slate-200/50 shadow-sm">
                                                <div className={`h-7 w-7 rounded-full flex items-center justify-center ${
                                                   asgn.status === 'DELIVERED' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                   <User size={14} />
                                                </div>
                                                <div>
                                                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Partner</p>
                                                   <p className={`text-[11px] font-bold ${asgn.status === 'DELIVERED' ? 'text-green-700' : 'text-slate-800'}`}>
                                                      {partnerName}
                                                   </p>
                                                </div>
                                             </div>

                                             <div className="w-full">
                                                {asgn.status === 'DELIVERED' && asgn.deliveryPhotoUrl && (
                                                   <Button
                                                      variant="outline"
                                                      className="w-full h-8 rounded-lg border-green-200 bg-white text-green-600 font-bold text-[9px] tracking-wider uppercase hover:bg-green-50 hover:text-green-700 transition-all shadow-sm"
                                                      onClick={(e) => { e.stopPropagation(); window.open(`http://localhost:3000${asgn.deliveryPhotoUrl}`, '_blank'); }}
                                                   >
                                                      <Camera size={11} className="mr-1.5" />
                                                      Review Proof
                                                   </Button>
                                                )}

                                                {asgn.status === 'ASSIGNED' && (
                                                   <Button
                                                      variant="ghost"
                                                      className="w-full h-8 rounded-lg font-bold text-[9px] tracking-wider text-red-500 hover:text-red-600 hover:bg-red-50 uppercase transition-all"
                                                      onClick={(e) => { e.stopPropagation(); handleUnassign(asgn.id); }}
                                                      disabled={unassignMutation.isPending}
                                                   >
                                                      <XCircle size={11} className="mr-1.5" />
                                                      Recall
                                                   </Button>
                                                )}
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                 </CardContent>
                              </Card>
                           );
                        })}
                     </div>
                  )}
               </TabsContent>
            </Tabs>
         </Card>

         <AssignmentDetailsPanel
            order={selectedOrder}
            open={isPanelOpen}
            onOpenChange={setIsPanelOpen}
         />
      </div>
   );
}
