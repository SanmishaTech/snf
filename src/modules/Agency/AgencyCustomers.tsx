import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/services/apiService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Users, Phone, Wallet, Calendar, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

interface AgencyCustomer {
  id: string;
  userUniqueId: string;
  name: string;
  mobile: string;
  walletBalance: number;
  subscriptionExpiring?: string;
  active: boolean;
}

const AgencyCustomers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ['agencyCustomers', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      params.append('limit', '100'); // Increase limit for scrollable view
      return get<{ members: AgencyCustomer[] }>(`/admin/members?${params.toString()}`);
    }
  });

  const customers = data?.members || [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Customers</h1>
          <p className="text-muted-foreground">Manage and monitor your assigned customers.</p>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
          <Users className="h-5 w-5 text-primary" />
          <span className="font-semibold text-primary">{customers.length} Total Customers</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID or mobile..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading your customers...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-500">
              <p>Error loading customers. Please try again later.</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-20">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground">No customers found.</p>
            </div>
          ) : (
            <div className="relative border rounded-md">
              {/* Fixed height container for scroll after ~15 rows */}
              <div className="max-h-[650px] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur-md z-20 shadow-sm">
                    <TableRow className="hover:bg-transparent border-b-2">
                      <TableHead className="w-[140px] font-bold text-primary uppercase text-[11px] tracking-wider py-4">Customer ID</TableHead>
                      <TableHead className="font-bold text-primary uppercase text-[11px] tracking-wider py-4">Name</TableHead>
                      <TableHead className="font-bold text-primary uppercase text-[11px] tracking-wider py-4">Mobile</TableHead>
                      <TableHead className="text-right font-bold text-primary uppercase text-[11px] tracking-wider py-4">Wallet Balance</TableHead>
                      <TableHead className="font-bold text-primary uppercase text-[11px] tracking-wider py-4">Subscription Expiring</TableHead>
                      <TableHead className="text-center font-bold text-primary uppercase text-[11px] tracking-wider py-4">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id} className="hover:bg-muted/50 transition-colors border-b">
                        <TableCell className="font-medium py-4">
                          <div className="flex items-center gap-2">
                            <span className="bg-primary/5 text-primary px-2 py-0.5 rounded text-xs border border-primary/10">
                              {customer.userUniqueId || 'N/A'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                             <UserCheck className="h-4 w-4 text-muted-foreground" />
                             {customer.name}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            {customer.mobile || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Wallet className="h-3.5 w-3.5 text-green-600" />
                            ₹{(customer.walletBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-orange-500" />
                            {customer.subscriptionExpiring 
                              ? format(new Date(customer.subscriptionExpiring), 'dd MMM yyyy')
                              : <span className="text-muted-foreground italic text-xs">No active subscription</span>
                            }
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-4">
                          <Badge 
                            className={`capitalize border-none px-3 ${
                              customer.active 
                                ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                                : "bg-rose-500 hover:bg-rose-600 text-white"
                            }`}
                          >
                            {customer.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}} />
    </div>
  );
};

export default AgencyCustomers;
