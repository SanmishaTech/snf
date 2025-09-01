import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock } from 'lucide-react';

interface DeliveryScheduleDisplayProps {
  deliverySchedule: string[];
  selectedDate?: string;
  onDateSelect: (date: string) => void;
  className?: string;
}

const DeliveryScheduleDisplay: React.FC<DeliveryScheduleDisplayProps> = ({ 
  deliverySchedule, 
  selectedDate,
  onDateSelect,
  className = "" 
}) => {
  // Map schedule values to day numbers (0 = Sunday, 1 = Monday, etc.)
  const dayNumbers: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  // Generate next 1 date for each delivery day
  const generateDeliveryDates = () => {
    if (!deliverySchedule || deliverySchedule.length === 0) return [];

    const dates: Array<{ date: string; dayName: string; formattedDate: string }> = [];
    const today = new Date();
    
    // Look ahead up to 14 days to find next occurrence of each delivery day
    for (let i = 1; i <= 14; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      const dayOfWeek = checkDate.getDay();
      
      // Check if this day matches any of our delivery days
      for (const scheduleDay of deliverySchedule) {
        const scheduleDayNumber = dayNumbers[scheduleDay.toLowerCase()];
        if (dayOfWeek === scheduleDayNumber) {
          // Check if we already have a date for this day
          const alreadyHasDate = dates.some(d => d.dayName === scheduleDay);
          if (!alreadyHasDate) {
            const dateString = checkDate.toISOString().split('T')[0]; // YYYY-MM-DD format
            const formattedDate = checkDate.toLocaleDateString('en-IN', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
            
            dates.push({
              date: dateString,
              dayName: scheduleDay,
              formattedDate: formattedDate
            });
          }
        }
      }
    }

    // Sort by date
    return dates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const availableDates = generateDeliveryDates();

  if (!deliverySchedule || deliverySchedule.length === 0) {
    return (
      <Card className={`border-amber-200 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-700">
            <Calendar className="h-4 w-4" />
            Delivery Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <Clock className="h-4 w-4" />
            <span>Schedule not specified for this area</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-blue-200 bg-blue-50/30 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-blue-800">
          <Calendar className="h-4 w-4" />
          Select Delivery Date
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Clock className="h-4 w-4" />
            <span>Choose your preferred delivery date:</span>
          </div>
          
          <Select value={selectedDate} onValueChange={onDateSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a delivery date" />
            </SelectTrigger>
            <SelectContent>
              {availableDates.map((dateOption) => (
                <SelectItem key={dateOption.date} value={dateOption.date}>
                  {dateOption.formattedDate}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="text-xs text-blue-600 bg-blue-100/50 p-2 rounded-md">
            💡 Select your preferred delivery date from the available options above. Next available date for each delivery day is shown.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeliveryScheduleDisplay;
