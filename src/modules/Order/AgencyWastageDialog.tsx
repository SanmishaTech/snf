import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { patch } from "@/services/apiService";

interface AgencyWastageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  receivedQuantity: number;
  onSuccess: () => void;
}

const AgencyWastageDialog = ({
  isOpen, onClose, orderId, orderNumber, receivedQuantity, onSuccess
}: AgencyWastageDialogProps) => {
  const [formData, setFormData] = useState({
    agencyWastage: "", agencyNotReceived: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const total = (parseInt(formData.agencyWastage) || 0) + (parseInt(formData.agencyNotReceived) || 0);
  const isValid = total <= receivedQuantity;

  const handleChange = (field: keyof typeof formData, value: string) => {
    if (value === "" || (/^\d+$/.test(value) && parseInt(value) >= 0)) {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsLoading(true);
    try {
      const submitData = {
        agencyWastage: parseInt(formData.agencyWastage) || 0,
        agencyNotReceived: parseInt(formData.agencyNotReceived) || 0,
        level: 'agency'
      };
      await patch(`/vendor-orders/${orderId}/register-wastage`, submitData);
      toast.success("Agency level wastage registered successfully");
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to register wastage");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ agencyWastage: "", agencyNotReceived: "" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-lg">Register Agency Level Wastage - Order {orderNumber}</DialogTitle>
          <p className="text-sm text-gray-600">
            Received quantity: <strong>{receivedQuantity}</strong>
          </p>
        </DialogHeader>
        
        <div className="grid gap-4 py-6">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold mb-3 text-green-900">🏢 Agency Level</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agencyWastage" className="text-sm font-medium">Wastage</Label>
                <Input 
                  id="agencyWastage"
                  type="text" 
                  placeholder="0"
                  value={formData.agencyWastage}
                  onChange={(e) => handleChange('agencyWastage', e.target.value)} 
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agencyNotReceived" className="text-sm font-medium">Not Received</Label>
                <Input 
                  id="agencyNotReceived"
                  type="text" 
                  placeholder="0"
                  value={formData.agencyNotReceived}
                  onChange={(e) => handleChange('agencyNotReceived', e.target.value)} 
                  className="h-10"
                />
              </div>
            </div>
          </div>
          
          <div className={`p-3 rounded-lg border ${isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex justify-between items-center text-sm">
              <span>🏢 Agency Level Total:</span>
              <span className={`font-semibold ${isValid ? 'text-green-700' : 'text-red-700'}`}>
                {total} / {receivedQuantity}
              </span>
            </div>
            {!isValid && (
              <p className="text-red-600 text-xs mt-1">Cannot exceed received quantity</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !isValid}>
            {isLoading ? "Registering..." : "Register Agency Wastage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AgencyWastageDialog;
