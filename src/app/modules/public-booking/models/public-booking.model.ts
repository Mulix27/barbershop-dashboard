export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PublicBarbershop {
  id: string;
  name: string;
  slug?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  description?: string | null;
  phone?: string | null;
  whatsappPhone?: string | null;
  email?: string | null;
  contactEmail?: string | null;
  address?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  bookingPolicy?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  primaryColor?: string | null;
  singleBarber: boolean;
}

export interface PublicServiceOption {
  serviceCategoryId: string;
  serviceVariantId?: string | null;
  displayName: string;
  description?: string;
  price: number;
  durationMin: number;
}

export interface BackendServiceOption {
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  pricingMode: string;
  variantId?: string | null;
  variantName?: string | null;
  price: number;
  durationMin: number;
  displayName: string;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface DayAvailabilityResponse {
  date: string;
  dayName: string;
  barbershopOpen: boolean;
  slots: AvailableSlot[];
}

export interface PublicBookingRequest {
  clientName: string;
  clientPhone: string;
  clientNotes?: string;
  serviceCategoryId: string;
  serviceVariantId?: string | null;
  serviceName: string;
  servicePrice: number;
  serviceDurationMin: number;
  appointmentDate: string;
  startTime: string;
  source: 'web';
}

export interface PublicBookingResponse {
  id: string;
  clientName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  serviceName: string;
}