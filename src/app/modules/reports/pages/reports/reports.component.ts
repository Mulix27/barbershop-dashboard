import { Component, OnInit } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import { MessageService } from 'primeng/api';

import { PdfReportRequest, ReportService } from '../../../../core/services/report.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  AppointmentMetrics,
  BarberPerformance,
  FullReport,
  SalesSummary,
  TopService,
  RecentSale
} from 'src/app/core/models/report.model';

type ReportPeriod = 'today' | 'week' | 'month' | 'custom';

interface SavedReport {
  id?: string;
  name: string;
  title?: string;
  type: string;
  date: string;
  format: string;
  base64?: string;
  fileName?: string;
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {

  loading = true;
  isSingleBarber = false;
  userName = '';

  periodOptions: { label: string; value: ReportPeriod }[] = [
    { label: 'Hoy', value: 'today' },
    { label: 'Esta semana', value: 'week' },
    { label: 'Este mes', value: 'month' }
  ];

  selectedPeriod: ReportPeriod = 'month';
  customFrom: Date | null = null;
  customTo: Date | null = null;
  showDatePicker = false;
  generatingPdf = false;
  downloadingId: string | null = null;

  readonly periodMap: Record<string, PdfReportRequest['period']> = {
    today: 'today',
    week: 'week',
    month: 'month',
    custom: 'custom'
  };

  report: FullReport | null = null;

  savedReports: SavedReport[] = [];

  private readonly chartColors = [
    '#2563EB',
    '#7C3AED',
    '#16A34A',
    '#BE4778',
    '#F97316',
    '#64748B'
  ];

  barberBarData: ChartData<'bar'> = { labels: [], datasets: [] };
  occupancyLineData: ChartData<'line'> = { labels: [], datasets: [] };
  revenueExpensesData: ChartData<'line'> = { labels: [], datasets: [] };

  barberBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#475569',
          font: {
            size: 12,
            weight: 600
          },
          boxWidth: 12,
          padding: 16
        }
      },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#FFFFFF',
        bodyColor: '#E5E7EB',
        borderColor: 'rgba(255,255,255,.12)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => ` ${this.formatCurrency(Number(ctx.raw ?? 0))}`
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(15,23,42,.06)'
        },
        ticks: {
          color: '#475569',
          font: {
            size: 12,
            weight: 600
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(15,23,42,.08)'
        },
        ticks: {
          color: '#475569',
          font: {
            size: 12,
            weight: 600
          },
          callback: (value) => `$${Number(value).toLocaleString('es-MX')}`
        }
      }
    }
  };

  occupancyLineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#475569',
          font: {
            size: 12,
            weight: 600
          },
          boxWidth: 12,
          padding: 16
        }
      },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#FFFFFF',
        bodyColor: '#E5E7EB',
        borderColor: 'rgba(255,255,255,.12)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => ` ${this.formatCurrency(Number(ctx.raw ?? 0))}`
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(15,23,42,.06)'
        },
        ticks: {
          color: '#475569',
          font: {
            size: 12,
            weight: 600
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(15,23,42,.08)'
        },
        ticks: {
          color: '#475569',
          font: {
            size: 12,
            weight: 600
          },
          callback: (value) => `$${Number(value).toLocaleString('es-MX')}`
        }
      }
    },
    elements: {
      line: {
        tension: 0.38,
        borderWidth: 3
      },
      point: {
        radius: 4,
        hoverRadius: 6,
        borderWidth: 2
      }
    }
  };

  revenueExpensesOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#475569',
          font: {
            size: 12,
            weight: 600
          },
          boxWidth: 12,
          padding: 16
        }
      },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#FFFFFF',
        bodyColor: '#E5E7EB',
        borderColor: 'rgba(255,255,255,.12)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => ` ${this.formatCurrency(Number(ctx.raw ?? 0))}`
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(15,23,42,.06)'
        },
        ticks: {
          color: '#475569',
          font: {
            size: 12,
            weight: 600
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(15,23,42,.08)'
        },
        ticks: {
          color: '#475569',
          font: {
            size: 12,
            weight: 600
          },
          callback: (value) => `$${Number(value).toLocaleString('es-MX')}`
        }
      }
    },
    elements: {
      line: {
        tension: 0.38,
        borderWidth: 3
      },
      point: {
        radius: 4,
        hoverRadius: 6,
        borderWidth: 2
      }
    }
  };

  constructor(
    private reportService: ReportService,
    private authService: AuthService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    const user = this.authService.getUser();

    if (user) {
      this.isSingleBarber = !!user.singleBarber;
      this.userName = user.fullName?.split(' ')[0] ?? '';
    }

    this.savedReports = [
      {
        id: 'initial-month',
        name: 'Informe del mes',
        title: 'Informe del mes',
        type: 'General',
        date: new Date().toLocaleDateString('es-MX'),
        format: 'PDF'
      },
      {
        id: 'initial-barbers',
        name: 'Rendimiento de barberos',
        title: 'Rendimiento de barberos',
        type: 'Rendimiento',
        date: new Date().toLocaleDateString('es-MX'),
        format: 'PDF'
      },
      {
        id: 'initial-services',
        name: 'Resumen de servicios',
        title: 'Resumen de servicios',
        type: 'Servicios',
        date: new Date().toLocaleDateString('es-MX'),
        format: 'PDF'
      }
    ];

    this.loadReport();
  }

  loadReport(): void {
    if (this.selectedPeriod === 'custom') {
      this.loadCustomReport();
      return;
    }

    this.loading = true;

    const request$ =
      this.selectedPeriod === 'today'
        ? this.reportService.getToday()
        : this.selectedPeriod === 'week'
          ? this.reportService.getThisWeek()
          : this.reportService.getThisMonth();

    request$.subscribe({
      next: (res) => {
        if (res.success) {
          this.report = res.data;
          this.buildCharts(res.data);
        } else {
          this.report = null;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: res.message || 'No se pudo cargar el reporte'
          });
        }

        this.loading = false;
      },
      error: () => {
        this.report = null;
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el reporte'
        });
      }
    });
  }

  loadCustomReport(): void {
    if (!this.customFrom || !this.customTo) {
      this.showDatePicker = true;
      return;
    }

    this.loading = true;

    this.reportService.getFullReport(
      this.formatDateParam(this.customFrom),
      this.formatDateParam(this.customTo)
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.report = res.data;
          this.buildCharts(res.data);
        } else {
          this.report = null;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: res.message || 'No se pudo cargar el reporte'
          });
        }

        this.loading = false;
      },
      error: () => {
        this.report = null;
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el reporte'
        });
      }
    });
  }

  onPeriodChange(period: ReportPeriod): void {
    this.selectedPeriod = period;

    if (period === 'custom') {
      this.showDatePicker = true;
      return;
    }

    this.showDatePicker = false;
    this.loadReport();
  }

  applyCustomRange(): void {
    if (!this.customFrom || !this.customTo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Fechas requeridas',
        detail: 'Selecciona fecha de inicio y fin'
      });
      return;
    }

    if (this.customFrom > this.customTo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Rango inválido',
        detail: 'La fecha de inicio no puede ser mayor que la fecha fin'
      });
      return;
    }

    this.showDatePicker = false;
    this.selectedPeriod = 'custom';
    this.loadReport();
  }

  buildCharts(data: FullReport): void {
    this.buildBarberChart(data);
    this.buildIncomeTrendChart(data);
    this.buildMonthlyIncomeChart(data);
  }

  buildBarberChart(data: FullReport): void {
    const barbers = data.barberPerformance ?? [];

    if (this.isSingleBarber) {
      const periods = this.preferredSalesPeriods(data);

      this.barberBarData = {
        labels: periods.map(item => this.periodName(item.period)),
        datasets: [
          {
            label: 'Ingresos',
            data: periods.map(item => Number(item.revenue ?? 0)),
            backgroundColor: 'rgba(37,99,235,.18)',
            borderColor: '#2563EB',
            borderWidth: 2,
            borderRadius: 8
          }
        ]
      };

      return;
    }

    this.barberBarData = {
      labels: barbers.map(barber => this.shortName(barber.barberName)),
      datasets: [
        {
          label: 'Ingresos generados',
          data: barbers.map(barber => Number(barber.revenue ?? 0)),
          backgroundColor: barbers.map((_, index) => `${this.chartColors[index % this.chartColors.length]}26`),
          borderColor: barbers.map((_, index) => this.chartColors[index % this.chartColors.length]),
          borderWidth: 2,
          borderRadius: 8
        }
      ]
    };
  }

  buildIncomeTrendChart(data: FullReport): void {
    const periods = this.preferredSalesPeriods(data);

    this.occupancyLineData = {
      labels: periods.map(item => this.periodName(item.period)),
      datasets: [
        {
          label: 'Ingresos',
          data: periods.map(item => Number(item.revenue ?? 0)),
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

  buildMonthlyIncomeChart(data: FullReport): void {
    const months = data.salesByMonth?.slice(-6) ?? [];

    this.revenueExpensesData = {
      labels: months.map(item => this.monthName(item.period)),
      datasets: [
        {
          label: 'Ingresos',
          data: months.map(item => Number(item.revenue ?? 0)),
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37,99,235,.12)',
          pointBackgroundColor: '#2563EB',
          pointBorderColor: '#FFFFFF',
          pointHoverBackgroundColor: '#1D4ED8',
          pointHoverBorderColor: '#FFFFFF',
          fill: true
        },
        {
          label: 'Ticket promedio',
          data: months.map(item => this.safeDiv(Number(item.revenue ?? 0), Number(item.totalSales ?? 0))),
          borderColor: '#16A34A',
          backgroundColor: 'rgba(22,163,74,.08)',
          pointBackgroundColor: '#16A34A',
          pointBorderColor: '#FFFFFF',
          pointHoverBackgroundColor: '#15803D',
          pointHoverBorderColor: '#FFFFFF',
          fill: false
        }
      ]
    };
  }

  preferredSalesPeriods(data: FullReport): any[] {
    if (this.selectedPeriod === 'month') {
      return data.salesByDay?.slice(-12) ?? [];
    }

    if (this.selectedPeriod === 'week') {
      return data.salesByDay ?? [];
    }

    if (this.selectedPeriod === 'today') {
      return data.salesByDay ?? [];
    }

    return data.salesByDay ?? data.salesByWeek ?? data.salesByMonth ?? [];
  }

  get summary(): SalesSummary | null {
    return this.report?.summary ?? null;
  }

  get topServices(): TopService[] {
    return this.report?.topServices?.slice(0, 8) ?? [];
  }

  get barbers(): BarberPerformance[] {
    return this.report?.barberPerformance ?? [];
  }

  get apptMetrics(): AppointmentMetrics | null {
    return this.report?.appointmentMetrics ?? null;
  }

  get peakHours(): any[] {
    return this.report?.peakHours?.slice(0, 5) ?? [];
  }

  get paymentMethods(): any[] {
    return this.report?.paymentMethods ?? [];
  }

  get recentSales(): RecentSale[] {
    return this.report?.recentSales?.slice(0, 8) ?? [];
  }

  get clientMetrics(): any {
    return this.report?.clientMetrics ?? null;
  }

  get salesByDayOfWeek(): any[] {
    return this.report?.salesByDayOfWeek ?? [];
  }

  get totalRevenue(): number {
    return Number(this.summary?.totalRevenue ?? 0);
  }

  get totalSales(): number {
    return Number(this.summary?.totalSales ?? 0);
  }

  get avgTicket(): number {
    return Number(this.summary?.averageTicket ?? 0);
  }

  get averageTicket(): number {
    return this.avgTicket;
  }

  get grossIncome(): number {
    return this.totalRevenue;
  }

  get netProfit(): number {
    return this.totalRevenue;
  }

  get completedAppts(): number {
    return Number(this.apptMetrics?.completed ?? 0);
  }

  get cancelledAppts(): number {
    return Number(this.apptMetrics?.cancelled ?? 0);
  }

  get noShowAppts(): number {
    return Number(this.apptMetrics?.noShow ?? 0);
  }

  get totalAppointments(): number {
    return Number(this.apptMetrics?.totalAppointments ?? 0);
  }

  get occupancyRate(): number {
    if (!this.apptMetrics || this.totalAppointments === 0) return 0;
    return Math.round((this.completedAppts / this.totalAppointments) * 1000) / 10;
  }

  get cancellationRate(): number {
    if (!this.apptMetrics || this.totalAppointments === 0) return 0;
    return Math.round((this.cancelledAppts / this.totalAppointments) * 1000) / 10;
  }

  get noShowRate(): number {
    return Number(this.apptMetrics?.noShowRate ?? 0);
  }

  get newClients(): number {
    return Number(this.clientMetrics?.newClients ?? 0);
  }

  get recurringClients(): number {
    return Number(this.clientMetrics?.recurringClients ?? 0);
  }

  get totalBarbersRevenue(): number {
    return this.barbers.reduce((total, barber) => total + Number(barber.revenue ?? 0), 0);
  }

  get totalBarbersServices(): number {
    return this.barbers.reduce((total, barber) => total + Number(barber.totalServices ?? 0), 0);
  }

  get totalTopServicesQty(): number {
    return this.topServices.reduce((total, service) => total + Number(service.totalQuantity ?? 0), 0);
  }

  get totalTopServicesRevenue(): number {
    return this.topServices.reduce((total, service) => total + Number(service.totalRevenue ?? 0), 0);
  }

  get totalPaymentRevenue(): number {
    return this.paymentMethods.reduce((total, payment) => total + Number(payment.revenue ?? 0), 0);
  }

  get totalProductRevenue(): number {
    return this.totalPaymentRevenue;
  }

  get periodLabel(): string {
    const labels: Record<ReportPeriod, string> = {
      today: 'Hoy',
      week: 'Esta semana',
      month: 'Este mes',
      custom: 'Personalizado'
    };

    return labels[this.selectedPeriod] ?? 'Período';
  }

  get dateRangeLabel(): string {
    if (!this.report) return '';
    return `${this.formatDate(this.report.from)} — ${this.formatDate(this.report.to)}`;
  }

  generateReport(): void {
    if (this.generatingPdf) return;

    this.generatingPdf = true;

    const req: PdfReportRequest = {
      period: this.periodMap[this.selectedPeriod] ?? 'month'
    };

    if (this.selectedPeriod === 'custom' && this.customFrom && this.customTo) {
      req.from = this.formatDateParam(this.customFrom);
      req.to = this.formatDateParam(this.customTo);
    }

    this.reportService.generatePdf(req).subscribe({
      next: (res) => {
        if (res.success) {
          this.reportService.downloadFromBase64(res.data.base64, res.data.fileName);

          this.savedReports.unshift({
            id: Date.now().toString(),
            name: `Informe ${this.periodLabel}`,
            title: `Informe ${this.periodLabel}`,
            type: 'General',
            format: 'PDF',
            date: new Date().toLocaleDateString('es-MX'),
            base64: res.data.base64,
            fileName: res.data.fileName
          });

          this.messageService.add({
            severity: 'success',
            summary: 'PDF generado',
            detail: `${res.data.fileName} descargado correctamente`
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: res.message || 'No se pudo generar el reporte'
          });
        }

        this.generatingPdf = false;
      },
      error: () => {
        this.generatingPdf = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo generar el reporte'
        });
      }
    });
  }

  downloadReport(report: SavedReport): void {
    if (report.base64 && report.fileName) {
      this.reportService.downloadFromBase64(report.base64, report.fileName);
      return;
    }

    if (!report.id) {
      report.id = `report-${Date.now()}`;
    }

    this.downloadingId = report.id;

    const req: PdfReportRequest = {
      period: this.periodMap[this.selectedPeriod] ?? 'month'
    };

    if (this.selectedPeriod === 'custom' && this.customFrom && this.customTo) {
      req.from = this.formatDateParam(this.customFrom);
      req.to = this.formatDateParam(this.customTo);
    }

    this.reportService.generatePdf(req).subscribe({
      next: (res) => {
        if (res.success) {
          report.base64 = res.data.base64;
          report.fileName = res.data.fileName;

          this.reportService.downloadFromBase64(res.data.base64, res.data.fileName);

          this.messageService.add({
            severity: 'success',
            summary: 'Descargado',
            detail: res.data.fileName
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: res.message || 'No se pudo descargar el reporte'
          });
        }

        this.downloadingId = null;
      },
      error: () => {
        this.downloadingId = null;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo generar el PDF'
        });
      }
    });
  }

  shareReport(report: SavedReport): void {
    if (!report.base64 || !report.fileName) {
      this.downloadReport(report);
      return;
    }

    const byteChars = atob(report.base64);
    const byteNums = new Array(byteChars.length);

    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }

    const blob = new Blob([new Uint8Array(byteNums)], { type: 'application/pdf' });
    const file = new File([blob], report.fileName, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      navigator.share({
        title: report.name,
        text: `Reporte de barbería — ${report.date}`,
        files: [file]
      }).catch(() => undefined);
      return;
    }

    this.reportService.downloadFromBase64(report.base64, report.fileName);

    this.messageService.add({
      severity: 'info',
      summary: 'Compartir no disponible',
      detail: 'Se descargó el archivo para que puedas compartirlo manualmente'
    });
  }

  formatCurrency(value: any): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(Number(value ?? 0));
  }

  formatNumber(value: any): string {
    return new Intl.NumberFormat('es-MX').format(Number(value ?? 0));
  }

  formatDate(date: string): string {
    if (!date) return '—';

    return new Date(date + 'T12:00:00').toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatDateParam(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  paymentLabel(method: string): string {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
      other: 'Otro'
    };

    return labels[method] ?? method ?? '—';
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      completed: 'Completada',
      cancelled: 'Cancelada',
      refunded: 'Reembolsada',
      active: 'Activa'
    };

    return labels[status] ?? status ?? '—';
  }

  statusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' | undefined {
    if (status === 'completed' || status === 'active') return 'success';
    if (status === 'cancelled' || status === 'refunded') return 'danger';
    return 'warning';
  }

  safeDiv(value: any, divisor: any): number {
    const n = Number(value ?? 0);
    const d = Number(divisor ?? 0);

    if (!d) return 0;

    return n / d;
  }

  avgTicketBarber(revenue: any, sales: any): number {
    return this.safeDiv(revenue, sales);
  }

  commissionPaid(): number {
    return 0;
  }

  netProfitBarber(revenue: any): number {
    return Number(revenue ?? 0);
  }

  profitability(service: TopService): number {
    return Number(service.totalRevenue ?? 0) > 0 ? 100 : 0;
  }

  profitPerMinute(service: TopService): number {
    const avgPrice = this.safeDiv(service.totalRevenue, service.totalQuantity);
    return this.safeDiv(avgPrice, 30);
  }

  paymentShare(paymentRevenue: any): number {
    if (!this.totalPaymentRevenue) return 0;
    return Math.round((Number(paymentRevenue ?? 0) / this.totalPaymentRevenue) * 1000) / 10;
  }

  peakPercent(totalAppointments: any): number {
    const max = Number(this.peakHours?.[0]?.totalAppointments ?? 0);
    if (!max) return 0;
    return Math.round((Number(totalAppointments ?? 0) / max) * 100);
  }

  shortName(name: string): string {
    if (!name) return '—';
    return name.split(' ')[0];
  }

  getInitials(name: string): string {
    if (!name) return '—';

    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  }

  periodName(period: string): string {
    if (!period) return '—';

    if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
      const date = new Date(period + 'T12:00:00');
      return date.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short'
      });
    }

    if (/^\d{4}-\d{2}$/.test(period)) {
      return this.monthName(period);
    }

    return period;
  }

  monthName(period: string): string {
    if (!period || !period.includes('-')) return period ?? '—';

    const [year, month] = period.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);

    return date.toLocaleDateString('es-MX', {
      month: 'short',
      year: '2-digit'
    });
  }

  originLabel(origin: string): string {
    const labels: Record<string, string> = {
      appointment: 'Cita',
      pos: 'Punto de venta'
    };

    return labels[origin] ?? 'Venta';
  }
}