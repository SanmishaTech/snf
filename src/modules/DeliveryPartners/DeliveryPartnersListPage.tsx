import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { get } from '@/services/apiService';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import DeliveryPartnerForm from './DeliveryPartnerForm';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Search, FilterX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DeliveryPartner {
  id: number;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  status: string;
  profilePhotoUrl?: string;
  depot?: {
    name: string;
  };
}

interface Depot {
  id: number;
  name: string;
}

export default function DeliveryPartnersListPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepotId, setSelectedDepotId] = useState<string>('all');

  const { data: depots = [] } = useQuery<Depot[]>({
    queryKey: ['depots'],
    queryFn: async () => {
      const res = await get('/depots');
      return res.data || [];
    }
  });

  const { data: partners = [], isLoading, refetch } = useQuery<DeliveryPartner[]>({
    queryKey: ['delivery-partners', searchTerm, selectedDepotId],
    queryFn: async () => {
      let url = '/delivery-partners?';
      if (searchTerm) url += `search=${searchTerm}&`;
      if (selectedDepotId !== 'all') url += `depotId=${selectedDepotId}&`;
      const res = await get(url);
      return res.deliveryPartners || [];
    }
  });

  const handleEdit = (id: number) => {
    setSelectedPartnerId(id);
    setIsReadOnly(false);
    setIsAddDialogOpen(true);
  };

  const handleView = (id: number) => {
    setSelectedPartnerId(id);
    setIsReadOnly(true);
    setIsAddDialogOpen(true);
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setSelectedPartnerId(null);
    setIsReadOnly(false);
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Delivery Partners</CardTitle>
            <CardDescription>Manage your delivery partners.</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => open ? setIsAddDialogOpen(true) : closeDialog()}>
            <DialogTrigger asChild>
              <Button variant="default" onClick={() => {
                setSelectedPartnerId(null);
                setIsReadOnly(false);
              }}>Add Partner</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[750px] p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>
                  {isReadOnly ? "Delivery Partner Details" : (selectedPartnerId ? "Edit Delivery Partner" : "Register New Delivery Partner")}
                </DialogTitle>
                <DialogDescription>
                  {isReadOnly 
                    ? "Viewing the full details of the delivery partner."
                    : (selectedPartnerId 
                      ? "Update the details of the existing delivery partner below."
                      : "Fill in the details below to register a new delivery partner in the system."
                    )
                  }
                </DialogDescription>
              </DialogHeader>
              <DeliveryPartnerForm 
                partnerId={selectedPartnerId}
                isReadOnly={isReadOnly}
                onSuccess={() => {
                  closeDialog();
                  refetch();
                }} 
                onCancel={closeDialog} 
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-full md:w-[250px]">
              <Select value={selectedDepotId} onValueChange={setSelectedDepotId}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Depot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depots</SelectItem>
                  {depots.map((depot) => (
                    <SelectItem key={depot.id} value={depot.id.toString()}>
                      {depot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(searchTerm || selectedDepotId !== 'all') && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDepotId('all');
                }}
                className="text-muted-foreground"
              >
                <FilterX className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-10">Loading partners...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Depot</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center">No partners found</TableCell></TableRow>
                ) : partners.map((p) => (
                  <TableRow 
                    key={p.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => handleView(p.id)}
                  >
                    <TableCell>
                      <Avatar className="h-10 w-10 border shadow-sm group-hover:border-red-200 transition-colors">
                        <AvatarImage 
                          src={p.profilePhotoUrl ? (p.profilePhotoUrl.startsWith('http') ? p.profilePhotoUrl : `${import.meta.env.VITE_BACKEND_URL}${p.profilePhotoUrl}`) : ''} 
                          alt={`${p.firstName} ${p.lastName}`} 
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-red-50 text-red-600">
                          <User size={18} />
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{p.firstName} {p.lastName}</TableCell>
                    <TableCell>
                      <span className="font-medium text-blue-600">
                        {p.depot?.name || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>{p.mobile}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(p.id);
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
