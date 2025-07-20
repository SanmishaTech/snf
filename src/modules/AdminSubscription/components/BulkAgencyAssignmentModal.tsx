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
    city?: string;
    location?: {
      name: string;
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
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Agency Assignment
          </DialogTitle>
          <DialogDescription>
            Assign delivery agencies to multiple subscriptions at once
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Statistics and Filters */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalPaidSubscriptions}</div>
              <div className="text-sm text-gray-600">Total Paid</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{unassignedCount}</div>
              <div className="text-sm text-gray-600">Unassigned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{assignedCount}</div>
              <div className="text-sm text-gray-600">Assigned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{selectedSubscriptionIds.size}</div>
              <div className="text-sm text-gray-600">Selected</div>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Label>Filter:</Label>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-40">
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
              <Label>Assign to:</Label>
              <Select 
                value={selectedAgencyId} 
                onValueChange={setSelectedAgencyId}
                disabled={isLoadingAgencies}
              >
                <SelectTrigger className="w-48">
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
          <ScrollArea className="flex-1 border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      ref={(ref) => {
                        if (ref) ref.indeterminate = someSelected;
                      }}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Current Agency</TableHead>
                  <TableHead>Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map(subscription => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedSubscriptionIds.has(subscription.id)}
                        onCheckedChange={(checked) => handleSubscriptionToggle(subscription.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {subscription.product.name}
                    </TableCell>
                    <TableCell>
                      {subscription.member?.user?.name || 'Unknown Member'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{subscription.deliveryAddress?.location?.name || 'No Location'}</div>
                        <div className="text-gray-500">{subscription.deliveryAddress?.city || 'Unknown City'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {subscription.agency ? (
                        <Badge variant="secondary">
                          {getAgencyName(subscription.agency)}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{new Date(subscription.startDate).toLocaleDateString()}</div>
                      <div className="text-gray-500">to {new Date(subscription.expiryDate).toLocaleDateString()}</div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSubscriptions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No subscriptions match the current filter
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle className="h-4 w-4" />
            {selectedSubscriptionIds.size} subscription(s) selected
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleBulkAssign} 
              disabled={isSubmitting || selectedSubscriptionIds.size === 0 || !selectedAgencyId}
            >
              {isSubmitting ? "Assigning..." : `Assign to ${selectedSubscriptionIds.size} Subscription(s)`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};