import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Search, Filter, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { getAllDepotsList, DepotListItem } from '@/services/depotService';
import { 
  getConversionHistory,
  ConversionHistory,
  PaginatedConversionHistoryResponse
} from '@/services/unitConversionService';

interface UnitConversionHistoryPageProps {
  onBack?: () => void;
}

export const UnitConversionHistoryPage: React.FC<UnitConversionHistoryPageProps> = ({ onBack }) => {
  const [depots, setDepots] = useState<DepotListItem[]>([]);
  const [history, setHistory] = useState<ConversionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [selectedDepot, setSelectedDepot] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadDepots();
    loadHistory();
  }, []);

  useEffect(() => {
    loadHistory();
  }, [currentPage, selectedDepot, startDate, endDate]);

  const loadDepots = async () => {
    try {
      const data = await getAllDepotsList();
      setDepots(data);
    } catch (error) {
      toast.error('Failed to load depots');
    }
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 20,
      };

      if (selectedDepot && selectedDepot !== 'all') params.depotId = parseInt(selectedDepot);
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response: PaginatedConversionHistoryResponse = await getConversionHistory(params);
      setHistory(response.data);
      setTotalPages(response.totalPages);
      setTotalRecords(response.totalRecords);
    } catch (error) {
      toast.error('Failed to load conversion history');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadHistory();
  };

  const clearFilters = () => {
    setSelectedDepot('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    loadHistory();
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  const getStatusBadge = () => {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Completed
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <h1 className="text-3xl font-bold">Unit Conversion History</h1>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="depot-filter">Depot</Label>
              <Select value={selectedDepot} onValueChange={setSelectedDepot}>
                <SelectTrigger>
                  <SelectValue placeholder="All depots" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All depots</SelectItem>
                  {depots.map(depot => (
                    <SelectItem key={depot.id} value={depot.id.toString()}>
                      {depot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Conversion Records
            </span>
            <Badge variant="secondary">
              {totalRecords} total records
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No conversion records found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Depot</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Performed By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {formatDate(record.performedAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            Depot {record.depotId}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.sourceVariantName}</p>
                            <p className="text-sm text-muted-foreground">
                              -{record.sourceQuantity}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.targetVariantName}</p>
                            <p className="text-sm text-green-600">
                              +{record.targetQuantity}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="text-red-600">-{record.sourceQuantity}</span>
                            <br />
                            <span className="text-green-600">+{record.targetQuantity}</span>
                          </div>
                        </TableCell>
                        <TableCell>{record.performedBy}</TableCell>
                        <TableCell>{getStatusBadge()}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {record.notes || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalRecords)} of {totalRecords} results
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
