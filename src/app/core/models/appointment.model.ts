export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  clientNotes?: string;
  clientId?: string;
  assignedToName?: string;
  assignedToId?: string;
  haircutName?: string;
  serviceNotes?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  source: 'web' | 'whatsapp' | 'dashboard';
  reminderSent: boolean;
  createdAt: string;
}
 
export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}
 
export interface DayAvailability {
  date: string;
  dayName: string;
  barbershopOpen: boolean;
  slots: TimeSlot[];
}