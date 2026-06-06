import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChartData, ChartOptions } from 'chart.js';

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

  loading = true;
  activeTab = 0;

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

  report: FullReport | null = null;

  sales: Sale[] = [];
  salesLoading = false;

  trendChartData: ChartData<'line'> = {
    labels: [],
    datasets: []
  };

  trendChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
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
          callback: (v) => `$${Number(v).toLocaleString('es-MX')}`
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

  barberChartData: ChartData<'bar'> = {
    labels: [],
    datasets: []
  };

  barberChartOptions: ChartOptions<'bar'> = {
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
        stacked: false,
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
        stacked: false,
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
          callback: (v) => `$${Number(v).toLocaleString('es-MX')}`
        }
      }
    }
  };

  donutData: ChartData<'doughnut'> = {
    labels: [],
    datasets: []
  };

  donutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#475569',
          font: {
            size: 12,
            weight: 600
          },
          padding: 12,
          boxWidth: 12
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
      this.selectedPeriod === 'today'
        ? this.reportService.getToday()
        : this.selectedPeriod === 'week'
          ? this.reportService.getThisWeek()
          : this.reportService.getThisMonth();

    obs$.subscribe({
      next: (res) => {
        if (res.success) {
          this.report = res.data;
          this.buildCharts(res.data);
        }

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  buildCharts(data: FullReport): void {
    const days = data.salesByDay ?? [];

    this.trendChartData = {
      labels: days.map(d => {
        const date = new Date(d.period + 'T12:00:00');
        return date.toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'short'
        });
      }),
      datasets: [
        {
          data: days.map(d => Number(d.revenue ?? 0)),
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

    const barbers = data.barberPerformance ?? [];
    const colors = ['#2563EB', '#7C3AED', '#16A34A', '#BE4778', '#F97316', '#64748B'];

    this.barberChartData = {
      labels: days.map(d => {
        const date = new Date(d.period + 'T12:00:00');
        return date.toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'short'
        });
      }),
      datasets: barbers.map((barber, index) => {
        const color = colors[index % colors.length];
        const valueByDay = Number(barber.revenue ?? 0) / Math.max(days.length, 1);

        return {
          label: barber.barberName,
          data: Array(days.length).fill(valueByDay),
          backgroundColor: `${color}26`,
          borderColor: color,
          borderWidth: 2,
          borderRadius: 6
        };
      })
    };

    const payments = data.paymentMethods ?? [];

    this.donutData = {
      labels: payments.map(p => this.paymentLabel(p.paymentMethod)),
      datasets: [
        {
          data: payments.map(p => Number(p.revenue ?? 0)),
          backgroundColor: [
            '#2563EB',
            '#16A34A',
            '#7C3AED',
            '#F97316',
            '#64748B'
          ],
          borderColor: '#FFFFFF',
          hoverBorderColor: '#FFFFFF',
          borderWidth: 3
        }
      ]
    };
  }

  loadSales(): void {
    this.salesLoading = true;

    this.saleService.getAll().subscribe({
      next: (res) => {
        this.sales = res.success ? res.data : [];
        this.salesLoading = false;
      },
      error: () => {
        this.salesLoading = false;
      }
    });
  }

  onPeriodChange(): void {
    if (this.selectedPeriod === 'custom') {
      this.showDatePicker = true;
      return;
    }

    this.loadReport();
  }

  get totalRevenue(): number {
    return Number(this.report?.summary.totalRevenue ?? 0);
  }

  get totalSales(): number {
    return Number(this.report?.summary.totalSales ?? 0);
  }

  get avgTicket(): number {
    return Number(this.report?.summary.averageTicket ?? 0);
  }

  get topServices() {
    return this.report?.topServices?.slice(0, 5) ?? [];
  }

  get barberPerformance() {
    return this.report?.barberPerformance ?? [];
  }

  get clientMetrics() {
    return this.report?.clientMetrics;
  }

  get appointmentMetrics() {
    return this.report?.appointmentMetrics;
  }

  get peakHours() {
    return this.report?.peakHours?.slice(0, 5) ?? [];
  }

  get salesByDayOfWeek() {
    return this.report?.salesByDayOfWeek ?? [];
  }

  get paymentMethods() {
    return this.report?.paymentMethods ?? [];
  }

  get totalProductRevenue(): number {
    return this.paymentMethods.reduce((total, payment) => {
      return total + Number(payment.revenue ?? 0);
    }, 0);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(value);
  }

  paymentLabel(method: string): string {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia'
    };

    return labels[method] ?? method;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      completed: 'Completada',
      cancelled: 'Cancelada',
      refunded: 'Reembolsada'
    };

    return labels[status] ?? status;
  }

  statusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' | undefined {
    if (status === 'completed') {
      return 'success';
    }

    if (status === 'cancelled') {
      return 'danger';
    }

    return 'warning';
  }

  periodLabel(): string {
    const labels: Record<string, string> = {
      today: 'Hoy',
      week: 'Esta semana',
      month: 'Este mes'
    };

    return labels[this.selectedPeriod] ?? 'Período';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  navigateToNew(): void {
    this.router.navigate(['/sales/new']);
  }
}