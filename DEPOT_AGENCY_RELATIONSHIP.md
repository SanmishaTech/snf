# Depot-Agency Relationship Implementation Report

## Current Implementation Status

The depot-agency relationship is already partially implemented in the SNF system:

1. **Database Level**: There's a relationship established where depots can be assigned to agencies
2. **Backend API**: The `/admin/depots` endpoints support agency assignment via `agencyId` field
3. **Frontend Forms**: The depot master form includes a dropdown to assign agencies to depots
4. **Data Models**: Both depot and agency entities exist with proper relationships

## How the Relationship is Currently Used

### 1. Depot Master Form (`DepotMasterForm.tsx`)
- The form includes an "Assign Agency" dropdown field
- Agencies are fetched from `/agencies` endpoint
- When creating/editing a depot, an agency can be selected from the dropdown
- The selected agency ID is sent to the backend as `agencyId` field

### 2. Depot Listing (`DepotMasterListPage.tsx`)
- Displays depot information including their assigned agency (if any)
- The relationship data is loaded and shown in the table view

### 3. Order Management (`OrderForm.tsx`)
- Both `depotId` and `agencyId` are tracked together in order items
- This shows that the system recognizes the relationship between depots and agencies in the order process

## Recommendations for Better Utilization

### 1. Enhanced Filtering Capabilities
**Current State**: Basic filtering exists but can be improved
**Improvement**: Add agency-based filtering to depot listings and other relevant screens

```tsx
// In depot listing page, add agency filter dropdown
<Select onValueChange={handleAgencyFilter}>
  <SelectTrigger>
    <SelectValue placeholder="Filter by Agency" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Agencies</SelectItem>
    {agencies.map(agency => (
      <SelectItem key={agency.id} value={String(agency.id)}>
        {agency.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### 2. Agency Dashboard Views
**Current State**: No dedicated agency-centric views
**Improvement**: Create agency-specific dashboards showing their assigned depots

```tsx
// Agency dashboard showing assigned depots
const AgencyDashboard = () => {
  const { agencyId } = useParams();
  
  const { data: assignedDepots } = useQuery({
    queryKey: ['agency-depots', agencyId],
    queryFn: () => get(`/agencies/${agencyId}/depots`)
  });
  
  return (
    <div>
      <h2>Assigned Depots</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignedDepots?.map(depot => (
          <DepotCard key={depot.id} depot={depot} />
        ))}
      </div>
    </div>
  );
};
```

### 3. Reporting Enhancements
**Current State**: Limited reporting on depot-agency relationships
**Improvement**: Add reports showing agency performance based on their depots

```tsx
// Agency performance report
const AgencyPerformanceReport = () => {
  const { data: agencyReports } = useQuery({
    queryKey: ['agency-reports'],
    queryFn: () => get('/reports/agency-performance')
  });
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agency</TableHead>
          <TableHead>Assigned Depots</TableHead>
          <TableHead>Total Orders</TableHead>
          <TableHead>Revenue Generated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agencyReports?.map(report => (
          <TableRow key={report.agencyId}>
            <TableCell>{report.agencyName}</TableCell>
            <TableCell>{report.assignedDepots}</TableCell>
            <TableCell>{report.totalOrders}</TableCell>
            <TableCell>₹{report.revenue.toFixed(2)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

### 4. Notification System Integration
**Current State**: No specific notifications for depot-agency activities
**Improvement**: Implement notifications when actions affect assigned depots

```tsx
// Send notifications to agency admins when depot activities occur
const notifyAgencyOnDepotActivity = async (depotId, eventType, message) => {
  try {
    await post('/notifications', {
      agencyId: depot.assignedAgencyId,
      eventType,
      message,
      priority: 'medium'
    });
  } catch (error) {
    console.error('Failed to send agency notification:', error);
  }
};
```

### 5. Bulk Operations for Agency Assignment
**Current State**: Only individual depot assignment is possible
**Improvement**: Enable bulk assignment of agencies to multiple depots

```tsx
// Bulk agency assignment feature
const BulkAgencyAssignment = ({ selectedDepots }) => {
  const [selectedAgency, setSelectedAgency] = useState('');
  
  const handleBulkAssign = async () => {
    try {
      await put('/admin/depots/bulk-assign-agency', {
        depotIds: selectedDepots,
        agencyId: selectedAgency
      });
      toast.success('Agencies assigned successfully');
    } catch (error) {
      toast.error('Failed to assign agencies');
    }
  };
  
  return (
    <div>
      <Select onValueChange={setSelectedAgency}>
        <SelectTrigger>
          <SelectValue placeholder="Select Agency" />
        </SelectTrigger>
        <SelectContent>
          {agencies.map(agency => (
            <SelectItem key={agency.id} value={String(agency.id)}>
              {agency.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button onClick={handleBulkAssign}>
        Assign Selected Depots to Agency
      </Button>
    </div>
  );
};
```

## Technical Implementation Details

### Backend API Endpoints Needed
1. `GET /agencies/:id/depots` - Get all depots assigned to an agency
2. `PUT /admin/depots/bulk-assign-agency` - Bulk assign agencies to depots
3. `GET /reports/agency-depot-performance` - Performance reports by agency-depot relationships

### Frontend Improvements
1. Add agency filter to depot listing page
2. Create agency dashboard views showing assigned depots
3. Implement bulk operations for agency assignments
4. Enhance reporting with agency-depot relationship data
5. Add notifications for agency-depot activities

## Benefits of Full Implementation

1. **Better Organization**: Agencies can manage their assigned depots more effectively
2. **Improved Reporting**: Generate insights on agency performance based on depot activities
3. **Streamlined Operations**: Bulk operations reduce administrative overhead
4. **Enhanced Visibility**: Clear visualization of depot-agency relationships
5. **Scalability**: System can grow with more complex organizational structures

## Next Steps

1. **Implement Agency Dashboard Views**: Create dedicated screens for agencies to view their assigned depots
2. **Add Filtering Capabilities**: Enhance depot listings with agency-based filters
3. **Develop Bulk Operations**: Enable assigning agencies to multiple depots at once
4. **Enhance Reporting**: Create reports that leverage the depot-agency relationship
5. **Integrate Notifications**: Send relevant notifications to agencies based on depot activities