export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PublicBarbershop {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  city?: string;
  address?: string;
  primaryColor?: string;
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