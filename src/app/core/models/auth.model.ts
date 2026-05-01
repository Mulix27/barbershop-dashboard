export interface LoginRequest {
  email: string;
  password: string;
}
 
export interface LoginResponse {
  token: string;
  tokenType: string;
  userId: string;
  fullName: string;
  email: string;
  role: 'owner' | 'barber' | 'cashier';
  barbershopId: string;
  barbershopName: string;
  singleBarber: boolean;
}
 
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}