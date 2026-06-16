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
  serviceCategoryId?: string;
  serviceVariantId?: string;
  serviceName?: string;
  servicePrice?: number;
  serviceDurationMin?: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  source: 'web' | 'whatsapp' | 'dashboard';
  reminderSent: boolean;
  createdAt: string;
  saleId?: string;
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

export type AppointmentPaymentMethod = 'cash' | 'transfer' | 'other';

export interface CompleteAppointmentRequest {
  paymentMethod: AppointmentPaymentMethod;
  discount?: number | null;
  notes?: string | null;
}