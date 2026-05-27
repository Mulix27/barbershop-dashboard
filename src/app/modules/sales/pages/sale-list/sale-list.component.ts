import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChartConfiguration, ChartData } from 'chart.js';
import { forkJoin } from 'rxjs';

import { ReportService } from '../../../../core/services/report.service';
import { SaleService } from '../../../../core/services/sale.service';
import { Sale } from 'src/app/core/models/sale.model';
import { FullReport } from 'src/app/core/models/report.model';

@Component({
  selector: 'app-sale-list',
  templateUrl: './sale-list.component.html',
  styleUrls: ['./sale-list.component.scss']
})
export class SalesListComponent implements OnInit {

  // ── Estado ────────────────────────────────────────────────
  loading = true;
  activeTab = 0;   // 0=Analytics, 1=Historial

  // ── Rango de fechas ───────────────────────────────────────
  periodOptions = [
    { label: 'Hoy', value: 'today' },
    { label: 'Esta semana', value: 'week' },
    { label: 'Este mes', value: 'month' },
    { label: 'Personalizado', value: 'custom' }
  ];
  selectedPeriod = 'month';
  customFrom: Date | null = null;
  customTo: Date | null = null;
  showDatePicker = false;

  // ── Report data ───────────────────────────────────────────
  report: FullReport | null = null;

  // ── Historial de ventas ───────────────────────────────────
  sales: Sale[] = [];
  salesLoading = false;

  // ── Gráfica: Revenue Trend (línea dorada) ────────────────
  trendChartData: ChartData<'line'> = { labels: [], datasets: [] };
  trendChartOptions: ChartConfiguration['options'] = {
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
        grid: { color: 'rgba(255,255,255,.04)' },
        ticks: { color: 'rgba(232,230,222,.35)', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,.04)' },
        ticks: {
          color: 'rgba(232,230,222,.35)', font: { size: 10 },
          callback: (v) => `$${Number(v).toLocaleString('es-MX')}`
        }
      }
    },
    elements: {
      line: { tension: 0.4, borderColor: '#C9A84C', borderWidth: 2, fill: true, backgroundColor: 'rgba(201,168,76,.07)' },
      point: { radius: 2, backgroundColor: '#C9A84C', hoverRadius: 5 }
    }
  };

  // ── Gráfica: Revenue by Barber (barras) ───────────────────
  barberChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  barberChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { color: 'rgba(232,230,222,.5)', font: { size: 11 }, boxWidth: 10, padding: 16 }
      },
      tooltip: {
        backgroundColor: '#1E1E2C',
        borderColor: 'rgba(201,168,76,.3)',
        borderWidth: 1,
        titleColor: '#E8E6DE',
        bodyColor: '#C9A84C',
      }
    },
    scales: {
      x: {
        stacked: false,
        grid: { color: 'rgba(255,255,255,.04)' },
        ticks: { color: 'rgba(232,230,222,.35)', font: { size: 10 } }
      },
      y: {
        stacked: false,
        grid: { color: 'rgba(255,255,255,.04)' },
        ticks: {
          color: 'rgba(232,230,222,.35)', font: { size: 10 },
          callback: (v) => `$${Number(v).toLocaleString('es-MX')}`
        }
      }
    }
  };

  // ── Gráfica: Sales Breakdown (dona) ──────────────────────
  donutData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  donutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: 'rgba(232,230,222,.5)',
          font: { size: 11 },
          padding: 12,
          boxWidth: 10
        }
      },
      tooltip: {
        backgroundColor: '#1E1E2C',
        borderColor: 'rgba(201,168,76,.3)',
        borderWidth: 1,
        callbacks: {
          label: (ctx) =>
            ` $${Number(ctx.raw).toLocaleString('es-MX', {
              minimumFractionDigits: 2
            })}`
        }
      }
    }
  };

  constructor(
    private reportService: ReportService,
    private saleService: SaleService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadReport();
    this.loadSales();
  }

  loadReport(): void {
    this.loading = true;

    const obs$ =
      this.selectedPeriod === 'today' ? this.reportService.getToday() :
        this.selectedPeriod === 'week' ? this.reportService.getThisWeek() :
          this.reportService.getThisMonth();

    obs$.subscribe({
      next: (res) => {
        if (res.success) {
          this.report = res.data;
          this.buildCharts(res.data);
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  buildCharts(data: FullReport): void {
    // Trend chart (línea)
    const days = data.salesByDay ?? [];
    this.trendChartData = {
      labels: days.map(d => {
        const date = new Date(d.period + 'T12:00:00');
        return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
      }),
      datasets: [{
        data: days.map(d => Number(d.revenue ?? 0)),
        label: 'Ingresos'
      }]
    };

    // Barber chart
    const barbers = data.barberPerformance ?? [];
    const COLORS = ['#C9A84C', '#6366f1', '#22c55e', '#f59e0b', '#ec4899'];
    this.barberChartData = {
      labels: days.map(d => {
        const date = new Date(d.period + 'T12:00:00');
        return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
      }),
      datasets: barbers.map((b, i) => ({
        label: b.barberName,
        data: Array(days.length).fill(Number(b.revenue ?? 0) / Math.max(days.length, 1)),
        backgroundColor: COLORS[i % COLORS.length] + '99',
        borderColor: COLORS[i % COLORS.length],
        borderWidth: 1,
        borderRadius: 4
      }))
    };

    // Donut chart
    const payments = data.paymentMethods ?? [];
    const methodLabel = (m: string) =>
      m === 'cash' ? 'Efectivo' : m === 'card' ? 'Tarjeta' : 'Transferencia';

    this.donutData = {
      labels: payments.map(p => methodLabel(p.paymentMethod)),
      datasets: [{
        data: payments.map(p => Number(p.revenue ?? 0)),
        backgroundColor: ['#C9A84C', '#6366f1', '#22c55e', '#f59e0b'],
        borderColor: 'transparent',
        hoverBorderColor: 'transparent'
      }]
    };
  }

  loadSales(): void {
    this.salesLoading = true;
    this.saleService.getAll().subscribe({
      next: (res) => {
        this.sales = res.success ? res.data : [];
        this.salesLoading = false;
      },
      error: () => { this.salesLoading = false; }
    });
  }

  onPeriodChange(): void {
    if (this.selectedPeriod === 'custom') {
      this.showDatePicker = true;
    } else {
      this.loadReport();
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  get totalRevenue(): number { return Number(this.report?.summary.totalRevenue ?? 0); }
  get totalSales(): number { return Number(this.report?.summary.totalSales ?? 0); }
  get avgTicket(): number { return Number(this.report?.summary.averageTicket ?? 0); }
  get topServices() { return this.report?.topServices?.slice(0, 5) ?? []; }
  get barberPerformance() { return this.report?.barberPerformance ?? []; }
  get clientMetrics() { return this.report?.clientMetrics; }
  get appointmentMetrics() { return this.report?.appointmentMetrics; }
  get peakHours() { return this.report?.peakHours?.slice(0, 5) ?? []; }
  get salesByDayOfWeek() { return this.report?.salesByDayOfWeek ?? []; }
  get paymentMethods() { return this.report?.paymentMethods ?? []; }

  get totalProductRevenue(): number {
    return this.paymentMethods.reduce((s, p) => s + Number(p.revenue), 0);
  }

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN', minimumFractionDigits: 2
    }).format(v);
  }

  paymentLabel(m: string): string {
    return m === 'cash' ? 'Efectivo' : m === 'card' ? 'Tarjeta' : 'Transferencia';
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      completed: 'Completada', cancelled: 'Cancelada', refunded: 'Reembolsada'
    };
    return m[s] ?? s;
  }

  statusSeverity(s: string): string {
    return s === 'completed' ? 'success' : s === 'cancelled' ? 'danger' : 'warning';
  }

  periodLabel(): string {
    const m: Record<string, string> = { today: 'Hoy', week: 'Esta semana', month: 'Este mes' };
    return m[this.selectedPeriod] ?? 'Período';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  navigateToNew(): void {
    this.router.navigate(['/sales/new']);
  }
}