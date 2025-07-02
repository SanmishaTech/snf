import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface OrderDetail {
  depotId: number;
  depotName: string;
  depotVariantId: number;
  variantName: string;
  productName: string;
  effectivePrice: number | null;
  totalQuantity: string;
}

const DepotOrderDetails = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const { data: orderDetails, isLoading, error } = useQuery<OrderDetail[], Error>({
    queryKey: ['depotOrderDetails', date],
    queryFn: async () => {
      if (!date) return [];
      const formattedDate = format(date, 'yyyy-MM-dd');
      const response = await axios.get(`/api/vendor-orders/details?date=${formattedDate}`);
      return response.data;
    },
    enabled: !!date,
  });

  const groupedDetails = orderDetails?.reduce((acc, detail) => {
    const { depotName } = detail;
    if (!acc[depotName]) {
      acc[depotName] = [];
    }
    acc[depotName].push(detail);
    return acc;
  }, {} as Record<string, OrderDetail[]>) ?? {};

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Depot Order Details by Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-[280px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {isLoading && <p>Loading...</p>}
          {error && <p>Error fetching data: {error.message}</p>}

          {Object.entries(groupedDetails).map(([depotName, details]) => (
            <div key={depotName} className="mb-8">
              <h2 className="text-xl font-bold mb-2">{depotName}</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Effective Price</TableHead>
                    <TableHead>Total Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.map((detail) => (
                    <TableRow key={detail.depotVariantId}>
                      <TableCell>{detail.productName}</TableCell>
                      <TableCell>{detail.variantName}</TableCell>
                      <TableCell>{detail.effectivePrice !== null ? detail.effectivePrice : 'N/A'}</TableCell>
                      <TableCell>{detail.totalQuantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default DepotOrderDetails;
