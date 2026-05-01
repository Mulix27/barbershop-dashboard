import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChartConfiguration, ChartData } from 'chart.js';
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
  salesChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1E1E2C',
        borderColor: 'rgba(201,168,76,.3)',
        borderWidth: 1,
        titleColor: '#E8E6DE',
        bodyColor: '#C9A84C',
        callbacks: {
          label: (ctx) => ` $${Number(ctx.raw).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,.05)' },
        ticks: { color: 'rgba(232,230,222,.4)', font: { size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,.05)' },
        ticks: {
          color: 'rgba(232,230,222,.4)',
          font: { size: 11 },
          callback: (v) => `$${Number(v).toLocaleString('es-MX')}`
        }
      }
    },
    elements: {
      line: {
        tension: 0.4,
        borderColor: '#C9A84C',
        borderWidth: 2,
        fill: true,
        backgroundColor: 'rgba(201,168,76,.08)'
      },
      point: {
        radius: 3,
        backgroundColor: '#C9A84C',
        borderColor: '#C9A84C',
        hoverRadius: 6
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
          const days = weekReport.data.salesByDay ?? [];
          const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          this.salesChartData = {
            labels: days.map(d => {
              const date = new Date(d.period + 'T12:00:00');
              return DAY_NAMES[date.getDay()];
            }),
            datasets: [{
              data: days.map(d => Number(d.revenue)),
              label: 'Ingresos'
            }]
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

  statusSeverity(status: string): string {
    const map: Record<string, string> = {
      confirmed: 'success',
      pending: 'warning',
      in_progress: 'info',
      completed: 'secondary',
      cancelled: 'danger',
      no_show: 'danger'
    };
    return map[status] ?? 'secondary';
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