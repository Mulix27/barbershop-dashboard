// ── Respuesta del backend ─────────────────────────────────────
export interface BarberStaffResponse {
  profileId:   string;
  userId:      string;
  fullName:    string;
  email:       string;
  specialty?:  string;
  bio?:        string;
  photoUrl?:   string;
  status:      BarberStatus;
  rating:      number;
  totalCuts:   number;
  isActive:    boolean;
  createdAt:   string;
}

// ── Modelo interno del frontend ───────────────────────────────
export interface BarberStaff {
  id:                   string;   // = profileId del backend
  userId:               string;
  fullName:             string;
  email:                string;
  specialty?:           string;
  bio?:                 string;
  profilePhotoUrl?:     string;   // = photoUrl del backend
  status:               BarberStatus;
  rating?:              number;
  totalCuts?:           number;
  isActive:             boolean;
  nextAppointmentTime?: string;
  role:                 string;
}

export interface CreateBarberRequest {
  fullName:   string;
  email:      string;
  password:   string;
  specialty?: string;
  bio?:       string;
}

export interface UpdateBarberRequest {
  fullName:   string;
  specialty?: string;
  bio?:       string;
}

export type BarberStatus = 'active' | 'on_break' | 'inactive';

export const BARBER_STATUS_LABELS: Record<BarberStatus, string> = {
  active:   'Activo',
  on_break: 'En descanso',
  inactive: 'Inactivo'
};

// ── Mapper backend → frontend ─────────────────────────────────
export function mapBarberResponse(r: BarberStaffResponse): BarberStaff {
  return {
    id:               r.profileId,
    userId:           r.userId,
    fullName:         r.fullName,
    email:            r.email,
    specialty:        r.specialty,
    bio:              r.bio,
    profilePhotoUrl:  r.photoUrl,
    status:           r.status,
    rating:           r.rating,
    totalCuts:        r.totalCuts,
    isActive:         r.isActive,
    role:             'barber',
    nextAppointmentTime: undefined
  };
}

export const MOCK_BARBERS: BarberStaff[] = [
  {
    id: '1', userId: 'u1', fullName: 'John Baker', email: 'john@barbershop.com',
    specialty: 'Master Barber & Owner', status: 'active', isActive: true,
    rating: 4.9, totalCuts: 1248, nextAppointmentTime: '10:30 AM', role: 'owner'
  }
];

export interface BarberOptionResponse {
  profileId:  string;
  userId:     string;
  fullName:   string;
  specialty?: string;
}