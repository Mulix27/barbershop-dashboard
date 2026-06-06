import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChartConfiguration, ChartData, ChartOptions } from 'chart.js';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ReportService } from '../../../../core/services/report.service';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { SaleService } from '../../../../core/services/sale.service';
import { Appointment } from 'src/app/core/models/appointment.model';
import { FullReport } from 'src/app/core/models/report.model';
import { Sale } from 'src/app/core/models/sale.model';

interface TopService {
  serviceName: string;
  totalQuantity: number;
  totalRevenue: number;
}

interface SalesByDay {
  period: string;
  totalSales: number;
  revenue: number;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  // ── Estado ────────────────────────────────────────────────
  loading = true;
  userName = '';
  barbershopName = '';

  // ── Métricas del día ──────────────────────────────────────
  todayAppointments = 0;
  todayRevenue = 0;
  totalSales = 0;
  avgTicket = 0;

  // ── Agenda del día ────────────────────────────────────────
  todayAgenda: Appointment[] = [];
  selectedDate = new Date();

  // ── Últimas ventas ────────────────────────────────────────
  recentSales: Sale[] = [];

  // ── Top servicios ─────────────────────────────────────────
  topServices: { name: string; qty: number; pct: number }[] = [];

  // ── Gráfica de ventas (semana) ────────────────────────────
  salesChartData: ChartData<'line'> = { labels: [], datasets: [] };
  salesChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#111827',
        titleColor: '#FFFFFF',
        bodyColor: '#E5E7EB',
        borderColor: 'rgba(255,255,255,.12)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (ctx) => {
            const value = Number(ctx.raw || 0);
            return `Ingresos: ${this.formatCurrency(value)}`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#475569',
          font: {
            size: 12,
            weight: 600
          }
        },
        grid: {
          color: 'rgba(15,23,42,.06)',
          drawTicks: false
        },
        border: {
          color: 'rgba(15,23,42,.14)'
        }
      },
      y: {
        beginAtZero: true,
        suggestedMax: 100,
        ticks: {
          color: '#475569',
          font: {
            size: 12,
            weight: 600
          },
          callback: (v) => `$${Number(v).toLocaleString('es-MX')}`
        },
        grid: {
          color: 'rgba(15,23,42,.08)',
          drawTicks: false
        },
        border: {
          color: 'rgba(15,23,42,.14)'
        }
      }
    },
    elements: {
      line: {
        tension: 0.38,
        borderWidth: 3,
        borderJoinStyle: 'round',
        borderCapStyle: 'round'
      },
      point: {
        radius: 4,
        hoverRadius: 6,
        borderWidth: 2
      }
    }
  };

  constructor(
    private authService: AuthService,
    private reportService: ReportService,
    private appointmentService: AppointmentService,
    private saleService: SaleService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userName = user.fullName.split(' ')[0];
      this.barbershopName = user.barbershopName;
    }

    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    const today = new Date().toISOString().split('T')[0];

    forkJoin({
      report: this.reportService.getToday(),
      weekReport: this.reportService.getThisWeek(),
      appointments: this.appointmentService.getByDate(today),
      sales: this.saleService.getAll()
    }).subscribe({
      next: ({ report, weekReport, appointments, sales }) => {

        // ── Métricas del día ──────────────────────────────
        if (report.success && report.data) {
          const s = report.data.summary;
          this.todayRevenue = Number(s.totalRevenue);
          this.totalSales = Number(s.totalSales);
          this.avgTicket = Number(s.averageTicket);

          // Top servicios con porcentaje
          const topRaw: TopService[] = report.data.topServices ?? [];
          const totalQty = topRaw.reduce((sum: number, s: TopService) => sum + s.totalQuantity, 0);

          this.topServices = topRaw.slice(0, 5).map((s: TopService) => ({
            name: s.serviceName,
            qty: s.totalQuantity,
            pct: totalQty > 0 ? Math.round(s.totalQuantity / totalQty * 100) : 0
          }));

          const days: SalesByDay[] = weekReport.data.salesByDay ?? [];
        }

        // ── Agenda del día ────────────────────────────────
        if (appointments.success && appointments.data) {
          this.todayAppointments = appointments.data.length;
          this.todayAgenda = appointments.data.slice(0, 6);
        }

        // ── Últimas ventas ────────────────────────────────
        if (sales.success && sales.data) {
          this.recentSales = sales.data.slice(0, 4);
        }

        // ── Gráfica semanal ───────────────────────────────
        if (weekReport.success && weekReport.data) {
          const days: SalesByDay[] = weekReport.data.salesByDay ?? [];
          const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

          const chartDays: SalesByDay[] = days.length
            ? days
            : [
              { period: '2026-06-01', totalSales: 0, revenue: 0 },
              { period: '2026-06-02', totalSales: 0, revenue: 0 },
              { period: '2026-06-03', totalSales: 0, revenue: 0 },
              { period: '2026-06-04', totalSales: 0, revenue: 0 },
              { period: '2026-06-05', totalSales: 0, revenue: 0 },
              { period: '2026-06-06', totalSales: 0, revenue: 0 },
              { period: '2026-06-07', totalSales: 0, revenue: 0 }
            ];

          this.salesChartData = {
            labels: chartDays.map(d => {
              const date = new Date(d.period + 'T12:00:00');
              return DAY_NAMES[date.getDay()];
            }),
            datasets: [
              {
                data: chartDays.map(d => Number(d.revenue)),
                label: 'Ingresos',
                borderColor: '#2563EB',
                backgroundColor: 'rgba(37,99,235,.12)',
                pointBackgroundColor: '#2563EB',
                pointBorderColor: '#FFFFFF',
                pointHoverBackgroundColor: '#1D4ED8',
                pointHoverBorderColor: '#FFFFFF',
                fill: true
              }
            ]
          };
        }

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  // ── Helpers ───────────────────────────────────────────────

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  get todayLabel(): string {
    return new Date().toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }

  statusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' | undefined {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return 'success';

      case 'pending':
        return 'warning';

      case 'cancelled':
      case 'no_show':
        return 'danger';

      case 'in_progress':
        return 'info';

      default:
        return 'secondary';
    }
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      confirmed: 'Confirmado',
      pending: 'Pendiente',
      in_progress: 'En curso',
      completed: 'Completado',
      cancelled: 'Cancelado',
      no_show: 'No asistió'
    };
    return map[status] ?? status;
  }

  formatTime(time: string): string {
    return time?.substring(0, 5) ?? '';
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN', minimumFractionDigits: 2
    }).format(val);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}