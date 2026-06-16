export interface SalesSummary {
  totalRevenue: number;
  totalSales: number;
  averageTicket: number;
}
 
export interface TopService {
  serviceName: string;
  totalQuantity: number;
  totalRevenue: number;
}
 
export interface BarberPerformance {
  barberName: string;
  totalSales: number;
  revenue: number;
  totalServices: number;
}
 
export interface AppointmentMetrics {
  totalAppointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  noShowRate: number;
}
 
export interface FullReport {
  periodLabel: string;
  from: string;
  to: string;
  summary: SalesSummary;
  salesByDay: { period: string; totalSales: number; revenue: number }[];
  salesByWeek: { period: string; totalSales: number; revenue: number }[];
  salesByMonth: { period: string; totalSales: number; revenue: number }[];
  topServices: TopService[];
  barberPerformance: BarberPerformance[];
  clientMetrics: { newClients: number; recurringClients: number };
  paymentMethods: { paymentMethod: string; totalSales: number; revenue: number }[];
  salesByDayOfWeek: { dayName: string; totalSales: number; revenue: number }[];
  appointmentMetrics: AppointmentMetrics;
  peakHours: { hour: number; label: string; totalAppointments: number }[];
  recentSales: RecentSale[];
}

export interface RecentSale {
  saleId: string;
  clientName: string;
  barberName: string;
  itemSummary: string;
  paymentMethod: string;
  total: number;
  createdAt: string;
  origin: 'appointment' | 'pos';
}