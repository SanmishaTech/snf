import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { patch } from "@/services/apiService";

interface FarmerWastageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  deliveredQuantity: number;
  onSuccess: () => void;
}

const FarmerWastageDialog = ({
  isOpen, onClose, orderId, orderNumber, deliveredQuantity, onSuccess
}: FarmerWastageDialogProps) => {
  const [formData, setFormData] = useState({
    farmerWastage: "", farmerNotReceived: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const total = (parseInt(formData.farmerWastage) || 0) + (parseInt(formData.farmerNotReceived) || 0);
  const isValid = total <= deliveredQuantity;

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
        level: 'farmer'
      };
      await patch(`/vendor-orders/${orderId}/register-wastage`, submitData);
      toast.success("Farmer level wastage registered successfully");
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to register wastage");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ farmerWastage: "", farmerNotReceived: "" });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-lg">Register Farmer Level Wastage - Order {orderNumber}</DialogTitle>
          <p className="text-sm text-gray-600">
            Delivered quantity: <strong>{deliveredQuantity}</strong>
          </p>
        </DialogHeader>
        
        <div className="grid gap-4 py-6">
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
          
          <div className={`p-3 rounded-lg border ${isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex justify-between items-center text-sm">
              <span>🚜 Farmer Level Total:</span>
              <span className={`font-semibold ${isValid ? 'text-green-700' : 'text-red-700'}`}>
                {total} / {deliveredQuantity}
              </span>
            </div>
            {!isValid && (
              <p className="text-red-600 text-xs mt-1">Cannot exceed delivered quantity</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !isValid}>
            {isLoading ? "Registering..." : "Register Farmer Wastage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FarmerWastageDialog;
