import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Filter, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Agency {
  id: number;
  name: string;
  user?: {
    name: string;
    email: string;
    mobile: number | null;
  };
}

interface Subscription {
  id: number;
  product: {
    name: string;
  };
  member?: {
    user?: {
      name: string;
    };
  };
  deliveryAddress?: {
    recipientName?: string;
    mobile?: string;
    plotBuilding?: string;
    streetArea?: string;
    landmark?: string;
    pincode?: string;
    city?: string;
    state?: string;
    location?: {
      id: number;
      name: string;
      city?: {
        id: number;
        name: string;
      };
      agency?: {
        id: number;
        name: string;
      };
    };
  };
  paymentStatus: string;
  agencyId?: number | null;
  agency?: Agency | null;
  startDate: string;
  expiryDate: string;
}

interface BulkAgencyAssignmentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  subscriptions: Subscription[];
  agencies: Agency[];
  isLoadingAgencies: boolean;
  onBulkUpdateSubscriptions: (subscriptionIds: number[], agencyId: number | null) => Promise<void>;
}

export const BulkAgencyAssignmentModal: React.FC<BulkAgencyAssignmentModalProps> = ({
  isOpen,
  onOpenChange,
  subscriptions,
  agencies,
  isLoadingAgencies,
  onBulkUpdateSubscriptions,
}) => {
  const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState<Set<number>>(new Set());
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unassigned' | 'assigned'>('unassigned');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter subscriptions based on criteria
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      // Only show PAID subscriptions for assignment
      if (sub.paymentStatus !== 'PAID') return false;

      // Apply filter based on assignment status
      switch (filterStatus) {
        case 'unassigned':
          return !sub.agencyId;
        case 'assigned':
          return !!sub.agencyId;
        default:
          return true;
      }
    });
  }, [subscriptions, filterStatus]);

  // Handle subscription selection
  const handleSubscriptionToggle = (subscriptionId: number, checked: boolean) => {
    const newSelection = new Set(selectedSubscriptionIds);
    if (checked) {
      newSelection.add(subscriptionId);
    } else {
      newSelection.delete(subscriptionId);
    }
    setSelectedSubscriptionIds(newSelection);
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredSubscriptions.map(sub => sub.id));
      setSelectedSubscriptionIds(allIds);
    } else {
      setSelectedSubscriptionIds(new Set());
    }
  };

  // Handle bulk assignment
  const handleBulkAssign = async () => {
    if (selectedSubscriptionIds.size === 0) {
      toast.error('Please select at least one subscription');
      return;
    }

    if (!selectedAgencyId) {
      toast.error('Please select an agency');
      return;
    }

    setIsSubmitting(true);
    try {
      const agencyId = selectedAgencyId === 'NONE' ? null : parseInt(selectedAgencyId, 10);
      await onBulkUpdateSubscriptions(Array.from(selectedSubscriptionIds), agencyId);
      
      toast.success(`Successfully assigned agency to ${selectedSubscriptionIds.size} subscription(s)`);
      setSelectedSubscriptionIds(new Set());
      setSelectedAgencyId('');
      onOpenChange(false);
    } catch (error) {
      console.error('Bulk assignment failed:', error);
      toast.error('Failed to assign agencies. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get agency name for display
  const getAgencyName = (agency: Agency | null | undefined) => {
    if (!agency) return 'Unassigned';
    return agency.user?.name || agency.name;
  };

  // Statistics
  const totalPaidSubscriptions = subscriptions.filter(sub => sub.paymentStatus === 'PAID').length;
  const unassignedCount = subscriptions.filter(sub => sub.paymentStatus === 'PAID' && !sub.agencyId).length;
  const assignedCount = subscriptions.filter(sub => sub.paymentStatus === 'PAID' && sub.agencyId).length;

  const allSelected = filteredSubscriptions.length > 0 && selectedSubscriptionIds.size === filteredSubscriptions.length;
  const someSelected = selectedSubscriptionIds.size > 0 && selectedSubscriptionIds.size < filteredSubscriptions.length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-sm:max-w-[95vw] max-h-[90vh] max-sm:max-h-[95vh] flex flex-col p-0 sm:p-6">
        <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            Bulk Agency Assignment
          </DialogTitle>
          <DialogDescription className="text-sm">
            Assign delivery agencies to multiple subscriptions at once
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-4 sm:px-0">
          {/* Statistics and Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg mb-3 sm:mb-4">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">{totalPaidSubscriptions}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total Paid</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-red-600">{unassignedCount}</div>
              <div className="text-xs sm:text-sm text-gray-600">Unassigned</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-green-600">{assignedCount}</div>
              <div className="text-xs sm:text-sm text-gray-600">Assigned</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-purple-600">{selectedSubscriptionIds.size}</div>
              <div className="text-xs sm:text-sm text-gray-600">Selected</div>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 flex-shrink-0" />
              <Label className="text-sm">Filter:</Label>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-32 sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned Only</SelectItem>
                  <SelectItem value="assigned">Assigned Only</SelectItem>
                  <SelectItem value="all">All Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm">Assign to:</Label>
              <Select 
                value={selectedAgencyId} 
                onValueChange={setSelectedAgencyId}
                disabled={isLoadingAgencies}
              >
                <SelectTrigger className="w-40 sm:w-48">
                  <SelectValue placeholder={isLoadingAgencies ? "Loading..." : "Select agency"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Remove Assignment</SelectItem>
                  {agencies.map(agency => (
                    <SelectItem key={agency.id} value={agency.id.toString()}>
                      {getAgencyName(agency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subscription List */}
          <div className="flex-1 border rounded-md overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
              <Table className="min-w-[700px] w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 sm:w-12 px-2 sm:px-4">
                      <Checkbox
                        checked={allSelected}
                        ref={(ref) => {
                          if (ref) ref.indeterminate = someSelected;
                        }}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="px-2 sm:px-4 text-xs sm:text-sm min-w-[100px]">Product</TableHead>
                    <TableHead className="px-2 sm:px-4 text-xs sm:text-sm min-w-[120px]">Member</TableHead>
                    <TableHead className="px-2 sm:px-4 text-xs sm:text-sm min-w-[150px] md:min-w-[200px]">Location</TableHead>
                    <TableHead className="px-2 sm:px-4 text-xs sm:text-sm min-w-[100px]">Agency</TableHead>
                    <TableHead className="px-2 sm:px-4 text-xs sm:text-sm min-w-[120px]">Period</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredSubscriptions.map(subscription => (
                  <TableRow key={subscription.id}>
                    <TableCell className="px-2 sm:px-4">
                      <Checkbox
                        checked={selectedSubscriptionIds.has(subscription.id)}
                        onCheckedChange={(checked) => handleSubscriptionToggle(subscription.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="px-2 sm:px-4 font-medium text-xs sm:text-sm">
                      <div className="max-w-[80px] sm:max-w-none truncate">
                        {subscription.product.name}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 sm:px-4 text-xs sm:text-sm">
                      <div className="flex flex-col">
                        <div className="font-medium truncate max-w-[100px] sm:max-w-none">
                          {subscription.member?.user?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500 md:hidden">
                          {subscription.deliveryAddress?.recipientName && (
                            <div className="truncate">{subscription.deliveryAddress.recipientName}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 sm:px-4">
                      <div className="text-xs">
                        {subscription.deliveryAddress ? (
                          <>
                            <div className="font-medium truncate">{subscription.deliveryAddress.recipientName || 'No Recipient'}</div>
                            <div className="text-gray-500 truncate sm:hidden">{subscription.deliveryAddress.mobile}</div>
                            <div className="hidden sm:block">
                              <div className="text-gray-500">{subscription.deliveryAddress.mobile}</div>
                              <div className="text-xs text-gray-400 mt-1 truncate">
                                {subscription.deliveryAddress.plotBuilding}, {subscription.deliveryAddress.streetArea}
                                {subscription.deliveryAddress.landmark && `, ${subscription.deliveryAddress.landmark}`}
                              </div>
                              <div className="text-xs text-gray-400 truncate">
                                {subscription.deliveryAddress.city}, {subscription.deliveryAddress.state} - {subscription.deliveryAddress.pincode}
                              </div>
                            </div>
                            {subscription.deliveryAddress.location && (
                              <div className="text-xs text-blue-600 mt-1 truncate">
                                📍 {subscription.deliveryAddress.location.name}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-gray-400 italic">No Address</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 sm:px-4">
                      {subscription.agency ? (
                        <Badge variant="secondary" className="text-xs">
                          <span className="truncate max-w-[60px] sm:max-w-none">
                            {getAgencyName(subscription.agency)}
                          </span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-2 sm:px-4 text-xs sm:text-sm">
                      <div>{new Date(subscription.startDate).toLocaleDateString()}</div>
                      <div className="text-gray-500">to {new Date(subscription.expiryDate).toLocaleDateString()}</div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSubscriptions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500 text-sm">
                      No subscriptions match the current filter
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            {selectedSubscriptionIds.size} subscription(s) selected
          </div>
          <div className="flex gap-2 order-1 sm:order-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleBulkAssign} 
              disabled={isSubmitting || selectedSubscriptionIds.size === 0 || !selectedAgencyId}
              className="flex-1 sm:flex-none text-xs sm:text-sm"
            >
              {isSubmitting ? "Assigning..." : `Assign (${selectedSubscriptionIds.size})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};