import { Component, OnInit } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { MessageService } from 'primeng/api';

import { PdfReportRequest, ReportService } from '../../../../core/services/report.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FullReport, TopService, BarberPerformance, AppointmentMetrics, SalesSummary } from 'src/app/core/models/report.model';


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

  // ── Estado ────────────────────────────────────────────────
  loading = true;
  isSingleBarber = false;
  userName = '';

  // ── Período ───────────────────────────────────────────────
  periodOptions = [
    { label: 'Hoy', value: 'today' },
    { label: 'Esta semana', value: 'week' },
    { label: 'Este mes', value: 'month' }
  ];
  selectedPeriod = 'month';
  customFrom: Date | null = null;
  customTo: Date | null = null;
  showDatePicker = false;
  generatingPdf = false;
  downloadingId: string | null = null
  readonly periodMap: Record<string, PdfReportRequest['period']> = {
    today: 'today',
    week: 'week',
    month: 'month'
  };

  // ── Datos ──────────────────────────────────────────────────
  report: FullReport | null = null;

  savedReports: SavedReport[] = [
    { name: 'Informe Financiero', type: 'Financiero', date: new Date().toLocaleDateString('es-MX'), format: 'PDF' },
    { name: 'Rendimiento de Barberos', type: 'Rendimiento', date: new Date().toLocaleDateString('es-MX'), format: 'Excel' },
    { name: 'Resumen de Servicios', type: 'Servicios', date: new Date().toLocaleDateString('es-MX'), format: 'PDF' },
    { name: 'Análisis de Rentabilidad', type: 'Financiero', date: new Date().toLocaleDateString('es-MX'), format: 'PDF' },
    { name: 'Consumo de Insumos', type: 'Inventario', date: new Date().toLocaleDateString('es-MX'), format: 'Excel' },
  ];

  // ════════════════════════════════════════════════════════
  //  GRÁFICAS
  // ════════════════════════════════════════════════════════

  // Barras: Rentabilidad por barbero
  barberBarData: ChartData<'bar'> = { labels: [], datasets: [] };
  barberBarOptions: ChartConfiguration['options'] = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true, position: 'top',
        labels: { color: 'rgba(232,230,222,.5)', font: { size: 11 }, boxWidth: 12, padding: 16 }
      },
      tooltip: {
        backgroundColor: '#1E1E2C', borderColor: 'rgba(201,168,76,.3)', borderWidth: 1,
        titleColor: '#E8E6DE', bodyColor: '#C9A84C',
        callbacks: { label: (c) => ` $${Number(c.raw).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: 'rgba(232,230,222,.35)', font: { size: 11 } } },
      y: {
        grid: { color: 'rgba(255,255,255,.04)' },
        ticks: {
          color: 'rgba(232,230,222,.35)', font: { size: 11 },
          callback: (v) => `$${Number(v).toLocaleString('es-MX')}`
        }
      }
    }
  };

  // Línea: Tendencia de ocupación y cancelaciones
  occupancyLineData: ChartData<'line'> = { labels: [], datasets: [] };
  occupancyLineOptions: ChartConfiguration['options'] = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true, position: 'top',
        labels: { color: 'rgba(232,230,222,.5)', font: { size: 11 }, boxWidth: 12, padding: 16 }
      },
      tooltip: {
        backgroundColor: '#1E1E2C', borderColor: 'rgba(201,168,76,.3)', borderWidth: 1,
        titleColor: '#E8E6DE',
        callbacks: { label: (c) => ` ${Number(c.raw).toFixed(1)}%` }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: 'rgba(232,230,222,.35)', font: { size: 11 } } },
      y: {
        min: 0, max: 100,
        grid: { color: 'rgba(255,255,255,.04)' },
        ticks: {
          color: 'rgba(232,230,222,.35)', font: { size: 11 },
          callback: (v) => `${v}%`
        }
      }
    },
    elements: {
      line: { tension: 0.4, borderWidth: 2, fill: true },
      point: { radius: 4, hoverRadius: 6 }
    }
  };

  // Línea: Revenue vs Expenses (personal insights)
  revenueExpensesData: ChartData<'line'> = { labels: [], datasets: [] };
  revenueExpensesOptions: ChartConfiguration['options'] = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true, position: 'top',
        labels: { color: 'rgba(232,230,222,.5)', font: { size: 11 }, boxWidth: 12, padding: 16 }
      },
      tooltip: {
        backgroundColor: '#1E1E2C', borderColor: 'rgba(201,168,76,.3)', borderWidth: 1,
        callbacks: { label: (c) => ` $${Number(c.raw).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: 'rgba(232,230,222,.35)', font: { size: 11 } } },
      y: {
        grid: { color: 'rgba(255,255,255,.04)' },
        ticks: {
          color: 'rgba(232,230,222,.35)', font: { size: 11 },
          callback: (v) => `$${Number(v).toLocaleString('es-MX')}`
        }
      }
    },
    elements: {
      line: { tension: 0.4, borderWidth: 2 },
      point: { radius: 4, hoverRadius: 6 }
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
      this.isSingleBarber = user.singleBarber;
      this.userName = user.fullName.split(' ')[0];
    }
    this.loadReport();
    this.savedReports = this.savedReports.map((r, i) => ({
      ...r, id: r.id ?? `mock-${i}`
    }));
  }

  loadReport(): void {
    this.loading = true;
    const obs =
      this.selectedPeriod === 'today' ? this.reportService.getToday() :
        this.selectedPeriod === 'week' ? this.reportService.getThisWeek() :
          this.reportService.getThisMonth();

    obs.subscribe({
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

  // ── Build charts ──────────────────────────────────────────

  buildCharts(data: FullReport): void {
    this.buildBarberChart(data);
    this.buildOccupancyChart(data);
    this.buildRevenueExpensesChart(data);
  }

  buildBarberChart(data: FullReport): void {
    const barbers = data.barberPerformance ?? [];

    if (this.isSingleBarber) {
      // Single-barbero: una sola barra con servicios vs total
      const months = data.salesByMonth?.slice(-6) ?? [];
      this.barberBarData = {
        labels: months.map(m => m.period),
        datasets: [{
          label: 'Ingresos por Servicios',
          data: months.map(m => Number(m.revenue) * 0.82),
          backgroundColor: '#C9A84C99', borderColor: '#C9A84C', borderWidth: 1, borderRadius: 4
        }, {
          label: 'Ingresos por Productos',
          data: months.map(m => Number(m.revenue) * 0.18),
          backgroundColor: '#6366f199', borderColor: '#6366f1', borderWidth: 1, borderRadius: 4
        }]
      };
    } else {
      // Multi-barbero: una barra por barbero
      const COLORS = ['#C9A84C', '#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#94a3b8'];
      this.barberBarData = {
        labels: barbers.map(b => b.barberName.split(' ')[0]),
        datasets: [{
          label: 'Servicios',
          data: barbers.map(b => Number(b.revenue) * 0.82),
          backgroundColor: barbers.map((_, i) => COLORS[i % COLORS.length] + '99'),
          borderColor: barbers.map((_, i) => COLORS[i % COLORS.length]),
          borderWidth: 1, borderRadius: 4
        }, {
          label: 'Productos',
          data: barbers.map(b => Number(b.revenue) * 0.18),
          backgroundColor: '#ffffff20',
          borderColor: '#ffffff40',
          borderWidth: 1, borderRadius: 4
        }]
      };
    }
  }

  buildOccupancyChart(data: FullReport): void {
    const appt = data.appointmentMetrics;
    const days = data.salesByDay?.slice(-6) ?? [];
    const labels = days.map(d => {
      const date = new Date(d.period + 'T12:00:00');
      return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    });

    const occupancyRate = appt
      ? ((appt.completed / Math.max(appt.totalAppointments, 1)) * 100)
      : 75;
    const cancelRate = appt
      ? ((appt.cancelled / Math.max(appt.totalAppointments, 1)) * 100)
      : 10;

    this.occupancyLineData = {
      labels,
      datasets: [{
        label: 'Tasa de Ocupación (%)',
        data: labels.map(() => occupancyRate + (Math.random() * 10 - 5)),
        borderColor: '#C9A84C',
        backgroundColor: 'rgba(201,168,76,.1)',
        fill: true
      }, {
        label: 'Tasa de Cancelaciones (%)',
        data: labels.map(() => cancelRate + (Math.random() * 5 - 2.5)),
        borderColor: '#94a3b8',
        backgroundColor: 'rgba(148,163,184,.05)',
        fill: false
      }]
    };
  }

  buildRevenueExpensesChart(data: FullReport): void {
    const months = data.salesByMonth?.slice(-6) ?? [];
    const labels = months.map(m => {
      const [year, month] = m.period.split('-');
      return new Date(Number(year), Number(month) - 1).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
    });

    this.revenueExpensesData = {
      labels,
      datasets: [{
        label: 'Ingresos',
        data: months.map(m => Number(m.revenue)),
        borderColor: '#C9A84C',
        backgroundColor: 'rgba(201,168,76,.08)',
        fill: true
      }, {
        label: 'Gastos (est.)',
        data: months.map(m => Number(m.revenue) * 0.35),
        borderColor: '#94a3b8',
        backgroundColor: 'rgba(148,163,184,.05)',
        fill: false
      }]
    };
  }

  // ── Getters de datos ──────────────────────────────────────

  get summary(): SalesSummary | null { return this.report?.summary ?? null; }
  get topServices(): TopService[] { return this.report?.topServices?.slice(0, 8) ?? []; }
  get barbers(): BarberPerformance[] { return this.report?.barberPerformance ?? []; }
  get apptMetrics(): AppointmentMetrics | null { return this.report?.appointmentMetrics ?? null; }
  get peakHours() { return this.report?.peakHours?.slice(0, 5) ?? []; }
  get paymentMethods() { return this.report?.paymentMethods ?? []; }
  get clientMetrics() { return this.report?.clientMetrics; }

  get totalRevenue(): number { return Number(this.summary?.totalRevenue ?? 0); }
  get netProfit(): number { return this.totalRevenue * 0.41; }
  get occupancyRate(): number {
    const a = this.apptMetrics;
    if (!a || a.totalAppointments === 0) return 0;
    return Math.round(a.completed / a.totalAppointments * 100 * 10) / 10;
  }
  get completedAppts(): number { return this.apptMetrics?.completed ?? 0; }

  get totalBarbersRevenue(): number {
    return this.barbers.reduce((s, b) => s + Number(b.revenue), 0);
  }

  get totalBarbersServices(): number {
    return this.barbers.reduce((s, b) => s + Number(b.totalServices), 0);
  }

  get totalTopServicesQty(): number {
    return this.topServices.reduce((s, sv) => s + Number(sv.totalQuantity), 0);
  }

  // ── Period label ──────────────────────────────────────────
  get periodLabel(): string {
    return this.selectedPeriod === 'today' ? 'Hoy' :
      this.selectedPeriod === 'week' ? 'Esta semana' : 'Este mes';
  }

  get dateRangeLabel(): string {
    return this.report
      ? `${this.report.from} — ${this.report.to}`
      : '';
  }

  // ── Acciones ──────────────────────────────────────────────

  generateReport(): void {
    if (this.generatingPdf) return;
    this.generatingPdf = true;

    const req: PdfReportRequest = {
      period: this.periodMap[this.selectedPeriod] ?? 'month'
    };

    this.reportService.generatePdf(req).subscribe({
      next: (res) => {
        if (res.success) {
          // Descargar el PDF automáticamente
          this.reportService.downloadFromBase64(res.data.base64, res.data.fileName);

          // Agregar a la lista de reportes guardados
          this.savedReports.unshift({
            id: Date.now().toString(),
            name: `Informe ${res.data.period} ${new Date().toLocaleDateString('es-MX')}`,
            title: `Informe ${res.data.period}`,
            type: 'General',
            format: 'PDF',
            date: new Date().toLocaleDateString('es-MX'),
            base64: res.data.base64,
            fileName: res.data.fileName
          });

          this.messageService.add({
            severity: 'success',
            summary: '¡PDF generado!',
            detail: `${res.data.fileName} descargado correctamente`
          });
        } else {
          this.messageService.add({
            severity: 'error', summary: 'Error', detail: res.message
          });
        }
        this.generatingPdf = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error', summary: 'Error', detail: 'No se pudo generar el reporte'
        });
        this.generatingPdf = false;
      }
    });
  }

  downloadReport(report: SavedReport): void {
    // Si ya tiene base64 en memoria → descarga directa sin llamar al backend
    if (report.base64 && report.fileName) {
      this.reportService.downloadFromBase64(report.base64, report.fileName);
      return;
    }

    // Asignar id temporal si no tiene (reportes mock)
    if (!report.id) {
      report.id = `mock-${Date.now()}`;
    }

    // Llamar al backend para generar el PDF
    this.downloadingId = report.id;

    const req: PdfReportRequest = {
      period: this.periodMap[this.selectedPeriod] ?? 'month'
    };

    this.reportService.generatePdf(req).subscribe({
      next: (res) => {
        if (res.success) {
          // Guardar en memoria para no pedir al backend otra vez
          report.base64 = res.data.base64;
          report.fileName = res.data.fileName;

          this.reportService.downloadFromBase64(res.data.base64, res.data.fileName);

          this.messageService.add({
            severity: 'success',
            summary: '¡Descargado!',
            detail: res.data.fileName
          });
        } else {
          this.messageService.add({
            severity: 'error', summary: 'Error', detail: res.message
          });
        }
        this.downloadingId = null;
      },
      error: () => {
        this.messageService.add({
          severity: 'error', summary: 'Error', detail: 'No se pudo generar el PDF'
        });
        this.downloadingId = null;
      }
    });
  }

  shareReport(report: SavedReport): void {
    if (!report.base64 || !report.fileName) return;

    // Convertir base64 a Blob/File para compartir
    const byteChars = atob(report.base64);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([new Uint8Array(byteNums)], { type: 'application/pdf' });
    const file = new File([blob], report.fileName, { type: 'application/pdf' });

    // Web Share API (disponible en móvil y Chrome moderno)
    if (navigator.share && navigator.canShare({ files: [file] })) {
      navigator.share({
        title: report.name,
        text: `Reporte de barbería — ${report.date}`,
        files: [file]
      }).catch(() => {
        // Si el usuario cancela, no hacer nada
      });
    } else {
      // Fallback: copiar URL de descarga al portapapeles
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = report.fileName;
      anchor.click();
      window.URL.revokeObjectURL(url);

      this.messageService.add({
        severity: 'info',
        summary: 'Compartir no disponible',
        detail: 'Se descargó el archivo para que puedas compartirlo manualmente'
      });
    }
  }


  // ── Helpers ───────────────────────────────────────────────

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN', minimumFractionDigits: 2
    }).format(v);
  }

  profitability(svc: TopService): number {
    if (!svc.totalRevenue || !svc.totalQuantity) return 0;
    return Math.min(99, 75 + Math.random() * 20); // estimado
  }

  commissionPaid(revenue: number): number {
    return revenue * 0.2;
  }

  netProfitBarber(revenue: number): number {
    return revenue * 0.41;
  }

  avgTicketBarber(revenue: number, sales: number): number {
    return sales > 0 ? revenue / sales : 0;
  }

  typeLabel(t: string): string {
    const m: Record<string, string> = { PDF: 'PDF', Excel: 'Excel', CSV: 'CSV' };
    return m[t] ?? t;
  }

  typeSeverity(
    t: string
  ): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
    return t === 'Financiero' ? 'success' :
      t === 'Rendimiento' ? 'info' :
        t === 'Servicios' ? 'warning' :
          'secondary';
  }

  safeDiv(value: number, divisor: number): number {
    return value / Math.max(divisor, 1);
  }

  profitPerMinute(svc: TopService): number {
    return this.safeDiv(this.safeDiv(svc.totalRevenue, svc.totalQuantity), 30);
  }
}