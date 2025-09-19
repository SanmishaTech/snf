import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { patch } from "@/services/apiService";

interface WastageRegistrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  deliveredQuantity: number;
  receivedQuantity: number;
  onSuccess: () => void;
}

const WastageRegistrationDialog = ({
  isOpen, onClose, orderId, orderNumber, deliveredQuantity, receivedQuantity, onSuccess
}: WastageRegistrationDialogProps) => {
  const [formData, setFormData] = useState({
    farmerWastage: "", farmerNotReceived: "", agencyWastage: "", agencyNotReceived: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  // Calculate totals for each level
  const farmerTotal = (parseInt(formData.farmerWastage) || 0) + (parseInt(formData.farmerNotReceived) || 0);
  const agencyTotal = (parseInt(formData.agencyWastage) || 0) + (parseInt(formData.agencyNotReceived) || 0);
  
  // Validate limits for each level
  const isFarmerValid = farmerTotal <= deliveredQuantity;
  const isAgencyValid = agencyTotal <= receivedQuantity;
  const isValid = isFarmerValid && isAgencyValid;

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
        farmerWastage: parseInt(formData.farmerWastage) || 0,
        farmerNotReceived: parseInt(formData.farmerNotReceived) || 0,
        agencyWastage: parseInt(formData.agencyWastage) || 0,
        agencyNotReceived: parseInt(formData.agencyNotReceived) || 0,
      };
      await patch(`/vendor-orders/${orderId}/register-wastage`, submitData);
      toast.success("Wastage registered successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to register wastage");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-lg">Register Wastage - Order {orderNumber}</DialogTitle>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Delivered quantity: <strong>{deliveredQuantity}</strong></p>
            <p>Received quantity: <strong>{receivedQuantity}</strong></p>
          </div>
        </DialogHeader>
        
        <div className="grid gap-6 py-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold mb-3 text-blue-900">🚜 Farmer Level</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="farmerWastage" className="text-sm font-medium">Wastage</Label>
                <Input 
                  id="farmerWastage"
                  type="text" 
                  placeholder="0"
                  value={formData.farmerWastage}
                  onChange={(e) => handleChange('farmerWastage', e.target.value)} 
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmerNotReceived" className="text-sm font-medium">Not Received</Label>
                <Input 
                  id="farmerNotReceived"
                  type="text" 
                  placeholder="0"
                  value={formData.farmerNotReceived}
                  onChange={(e) => handleChange('farmerNotReceived', e.target.value)} 
                  className="h-10"
                />
              </div>
            </div>
          </div>
          
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
          
          <div className="space-y-3">
            {/* Farmer Level Validation */}
            <div className={`p-3 rounded-lg border ${isFarmerValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex justify-between items-center text-sm">
                <span>🚜 Farmer Level Total:</span>
                <span className={`font-semibold ${isFarmerValid ? 'text-green-700' : 'text-red-700'}`}>
                  {farmerTotal} / {deliveredQuantity}
                </span>
              </div>
              {!isFarmerValid && (
                <p className="text-red-600 text-xs mt-1">Cannot exceed delivered quantity</p>
              )}
            </div>

            {/* Agency Level Validation */}
            <div className={`p-3 rounded-lg border ${isAgencyValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex justify-between items-center text-sm">
                <span>🏢 Agency Level Total:</span>
                <span className={`font-semibold ${isAgencyValid ? 'text-green-700' : 'text-red-700'}`}>
                  {agencyTotal} / {receivedQuantity}
                </span>
              </div>
              {!isAgencyValid && (
                <p className="text-red-600 text-xs mt-1">Cannot exceed received quantity</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !isValid}>
            {isLoading ? "Registering..." : "Register Wastage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WastageRegistrationDialog;
