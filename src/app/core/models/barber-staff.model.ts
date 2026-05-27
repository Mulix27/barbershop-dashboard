export interface BarberStaff {
  id:                   string;
  fullName:             string;
  email:                string;
  phone?:               string;
  profilePhotoUrl?:     string;
  specialty?:           string;
  status:               'active' | 'on_break' | 'inactive';
  rating?:              number;
  totalCuts?:           number;
  nextAppointmentTime?: string;
  role:                 string;
}

export interface CreateBarberRequest {
  fullName:  string;
  email:     string;
  phone?:    string;
  specialty?: string;
  password:  string;
  role:      string;
}

export interface UpdateBarberRequest {
  fullName:  string;
  email:     string;
  phone?:    string;
  specialty?: string;
}

export type BarberStatus = 'active' | 'on_break' | 'inactive';

export const BARBER_STATUS_LABELS: Record<BarberStatus, string> = {
  active:   'Activo',
  on_break: 'En descanso',
  inactive: 'Inactivo'
};

// ── Mock data para maquetar sin backend ─────────────────────
export const MOCK_BARBERS: BarberStaff[] = [
  {
    id: '1', fullName: 'John Baker', email: 'john@barbershop.com',
    specialty: 'Master Barber & Owner', status: 'active',
    rating: 4.9, totalCuts: 1248, nextAppointmentTime: '10:30 AM', role: 'owner'
  },
  {
    id: '2', fullName: 'Michael Brown', email: 'michael@barbershop.com',
    specialty: 'Senior Barber', status: 'active',
    rating: 4.9, totalCuts: 982, nextAppointmentTime: '11:15 AM', role: 'barber'
  },
  {
    id: '3', fullName: 'David Wilson', email: 'david@barbershop.com',
    specialty: 'Fade Specialist', status: 'active',
    rating: 4.9, totalCuts: 856, nextAppointmentTime: '9:45 AM', role: 'barber'
  },
  {
    id: '4', fullName: 'Carlos Ramirez', email: 'carlos@barbershop.com',
    specialty: 'Beard Grooming Expert', status: 'on_break',
    rating: 4.7, totalCuts: 743, nextAppointmentTime: '1:00 PM', role: 'barber'
  },
  {
    id: '5', fullName: 'Anthony Garcia', email: 'anthony@barbershop.com',
    specialty: 'Classic Cuts Specialist', status: 'active',
    rating: 4.8, totalCuts: 612, nextAppointmentTime: '12:00 PM', role: 'barber'
  },
  {
    id: '6', fullName: 'Chris Lee', email: 'chris@barbershop.com',
    specialty: 'Shave & Line Up Expert', status: 'active',
    rating: 4.9, totalCuts: 531, nextAppointmentTime: '11:00 AM', role: 'barber'
  },
  {
    id: '7', fullName: 'Ryan Martinez', email: 'ryan@barbershop.com',
    specialty: 'Modern Styles Expert', status: 'on_break',
    rating: 4.6, totalCuts: 478, nextAppointmentTime: '2:15 PM', role: 'barber'
  },
  {
    id: '8', fullName: 'William Davis', email: 'william@barbershop.com',
    specialty: 'Color & Styling Specialist', status: 'active',
    rating: 4.8, totalCuts: 398, nextAppointmentTime: '3:30 PM', role: 'barber'
  }
];