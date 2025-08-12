import React, { useState } from "react";
import { Header } from "./components/Header.tsx";
import { Footer } from "./components/Footer.tsx";
import { useCart } from "./context/CartContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as apiService from "@/services/apiService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, Home, Loader2, Pencil, Plus } from "lucide-react";
import AddressForm, { type DeliveryAddress } from "@/modules/Address/components/AddressForm";

const SNFAddressPage: React.FC = () => {
  const { state: cartState } = useCart();

  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryAddress | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: addresses, isLoading, isError, error } = useQuery({
    queryKey: ["addresses"],
    queryFn: async () => {
      const data = await apiService.get("/delivery-addresses");
      return data as DeliveryAddress[];
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (addressId: string) => {
      return await apiService.patch(`/delivery-addresses/${addressId}/set-default`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Default address updated");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to set default"),
  });

  const onAddNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const onEdit = (addr: DeliveryAddress) => {
    setEditing(addr);
    setModalOpen(true);
  };

  const afterSave = () => {
    queryClient.invalidateQueries({ queryKey: ["addresses"] });
    setModalOpen(false);
  };

  // simple placeholder for search in header
  const onSearch = (_q: string) => {};

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header cartCount={cartState.items.reduce((n, it) => n + it.quantity, 0)} onSearch={onSearch} />

      <main className="flex-1">
        <section className="container mx-auto px-4 md:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold">Manage Delivery Addresses</h1>
              <p className="text-sm text-muted-foreground">Add, edit, and set your default delivery address</p>
            </div>
            <Button size="sm" onClick={onAddNew}>
              <Plus className="h-4 w-4 mr-2" /> Add New Address
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-5/6" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isError ? (
            <div className="p-4 text-destructive text-sm">{(error as any)?.message || "Failed to load addresses"}</div>
          ) : (
            <div className="space-y-3">
              {addresses && addresses.length > 0 ? (
                addresses.map((addr) => (
                  <Card key={addr.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{addr.recipientName}</span>
                            {addr.label && <Badge variant="secondary">{addr.label}</Badge>}
                            {addr.isDefault && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <Home className="h-3 w-3 mr-1" /> Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {addr.plotBuilding}
                            {addr.plotBuilding && addr.streetArea ? ", " : ""}
                            {addr.streetArea}
                          </p>
                          {!!addr.landmark && (
                            <p className="text-xs text-muted-foreground">Landmark: {addr.landmark}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                          <p className="text-xs text-muted-foreground">Mobile: {addr.mobile}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!addr.isDefault && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedId(addr.id);
                                setDefaultMutation.mutate(addr.id);
                              }}
                              disabled={setDefaultMutation.isPending && selectedId === addr.id}
                            >
                              {setDefaultMutation.isPending && selectedId === addr.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              Set Default
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => onEdit(addr)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="p-6 text-sm text-muted-foreground border rounded-md">You have no saved addresses yet.</div>
              )}

              <div className="pt-2">
                <Button size="sm" onClick={onAddNew}>
                  <Plus className="h-4 w-4 mr-2" /> Add New Address
                </Button>
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Address" : "Add New Address"}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <AddressForm
              mode={editing ? "edit" : "create"}
              addressId={editing?.id}
              initialData={editing || undefined}
              onSuccess={() => afterSave()}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SNFAddressPage;
