import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChartData, ChartOptions } from 'chart.js';

import { ReportService } from '../../../../core/services/report.service';
import { SaleService } from '../../../../core/services/sale.service';
import { Sale } from 'src/app/core/models/sale.model';
import { FullReport } from 'src/app/core/models/report.model';
import { MessageService } from 'primeng/api';

interface PaymentMethodSummaryItem {
  method: string;
  label: string;
  icon: string;
  amount: number;
  salesCount: number;
  percent: number;
  color: string;
  softColor: string;
}

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

  showCancelSaleDialog = false;
  cancelSaleReason = '';

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
    cutout: '74%',
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
          label: (ctx) => {
            const value = Number(ctx.raw ?? 0);
            const total = this.paymentMethodsTotal;
            const percent = total > 0 ? (value / total) * 100 : 0;

            return ` ${this.formatCurrency(value)} · ${percent.toFixed(1)}%`;
          }
        }
      }
    }
  };

  showSaleDetail = false;
  selectedSale: Sale | null = null;
  loadingSaleDetail = false;
  cancellingSale = false;

  constructor(
    private reportService: ReportService,
    private saleService: SaleService,
    private router: Router,
    private messageService: MessageService,

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
      labels: barbers.map(b => b.barberName),
      datasets: [
        {
          label: 'Ingresos',
          data: barbers.map(b => Number(b.revenue ?? 0)),
          backgroundColor: barbers.map((_, index) => `${colors[index % colors.length]}26`),
          borderColor: barbers.map((_, index) => colors[index % colors.length]),
          borderWidth: 2,
          borderRadius: 6
        }
      ]
    };

    const payments = data.paymentMethods ?? [];
    const paymentColors = payments.map((p, index) => this.paymentMethodMeta(p.paymentMethod, index).color);

    this.donutData = {
      labels: payments.map(p => this.paymentLabel(p.paymentMethod)),
      datasets: [
        {
          data: payments.map(p => Number(p.revenue ?? 0)),
          backgroundColor: paymentColors,
          borderColor: '#FFFFFF',
          hoverBorderColor: '#FFFFFF',
          borderWidth: 4,
          hoverOffset: 6,
          spacing: 2
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

  get paymentMethodsTotal(): number {
    return this.paymentMethods.reduce((total, item) => {
      return total + Number(item.revenue ?? 0);
    }, 0);
  }

  get paymentMethodsSummary(): PaymentMethodSummaryItem[] {
    const total = this.paymentMethodsTotal;

    return this.paymentMethods.map((item, index) => {
      const amount = Number(item.revenue ?? 0);
      const meta = this.paymentMethodMeta(item.paymentMethod, index);

      return {
        method: item.paymentMethod,
        label: this.paymentLabel(item.paymentMethod),
        icon: meta.icon,
        amount,
        salesCount: Number(item.totalSales ?? 0),
        percent: total > 0 ? Math.round((amount / total) * 100) : 0,
        color: meta.color,
        softColor: meta.softColor
      };
    });
  }

  private paymentMethodMeta(method: string, index: number): { icon: string; color: string; softColor: string } {
    const meta: Record<string, { icon: string; color: string; softColor: string }> = {
      cash: {
        icon: 'pi-money-bill',
        color: '#2563EB',
        softColor: 'rgba(37, 99, 235, 0.12)'
      },
      transfer: {
        icon: 'pi-send',
        color: '#16A34A',
        softColor: 'rgba(22, 163, 74, 0.12)'
      },
      card: {
        icon: 'pi-credit-card',
        color: '#7C3AED',
        softColor: 'rgba(124, 58, 237, 0.12)'
      },
      other: {
        icon: 'pi-ellipsis-h',
        color: '#64748B',
        softColor: 'rgba(100, 116, 139, 0.12)'
      }
    };

    const fallbackColors = [
      {
        icon: 'pi-wallet',
        color: '#F97316',
        softColor: 'rgba(249, 115, 22, 0.12)'
      },
      {
        icon: 'pi-wallet',
        color: '#BE4778',
        softColor: 'rgba(190, 71, 120, 0.12)'
      }
    ];

    return meta[method] ?? fallbackColors[index % fallbackColors.length];
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
      transfer: 'Transferencia',
      other: 'Otro'
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

  get recentSales(): Sale[] {
    return this.sales.slice(0, 12);
  }

  saleBarberName(sale: Sale): string {
    return sale.attendedBy || sale.attendedByUser || 'No asignado';
  }

  saleOriginLabel(sale: Sale): string {
    if (sale.origin === 'appointment') {
      return 'Cita';
    }

    if (sale.origin === 'pos') {
      return 'Punto de venta';
    }

    if (sale.notes?.toLowerCase().includes('auto-generada')) {
      return 'Cita';
    }

    return 'Punto de venta';
  }

  isAppointmentSale(sale: Sale): boolean {
    return this.saleOriginLabel(sale) === 'Cita';
  }

  saleItemsSummary(sale: Sale): string {
    if (!sale.items || sale.items.length === 0) {
      return 'Sin conceptos';
    }

    const names = sale.items
      .slice(0, 2)
      .map(item => item.itemName || (item.itemType === 'service' ? 'Servicio' : 'Producto'));

    const extra = sale.items.length > 2 ? ` +${sale.items.length - 2}` : '';

    return `${names.join(', ')}${extra}`;
  }

  paymentIcon(method: string): string {
    const icons: Record<string, string> = {
      cash: 'pi-money-bill',
      card: 'pi-credit-card',
      transfer: 'pi-send',
      other: 'pi-ellipsis-h'
    };

    return icons[method] ?? 'pi-wallet';
  }

  formatDateTime(date: string): string {
    return new Date(date).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  openSaleDetail(sale: Sale): void {
    this.selectedSale = sale;
    this.showSaleDetail = true;
    this.loadingSaleDetail = true;

    this.saleService.getById(sale.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.selectedSale = res.data;
        }

        this.loadingSaleDetail = false;
      },
      error: () => {
        this.loadingSaleDetail = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el detalle de la venta'
        });
      }
    });
  }

  closeSaleDetail(): void {
    this.showSaleDetail = false;
    this.selectedSale = null;
  }

  saleReceiptNumber(sale?: Sale | null): string {
    if (!sale?.id) return 'REC-VENTA';
    return `VENTA-${sale.id.substring(0, 8).toUpperCase()}`;
  }

  saleItemsCount(sale?: Sale | null): number {
    return sale?.items?.reduce((total, item) => total + Number(item.quantity ?? 0), 0) ?? 0;
  }

  saleItemTypeLabel(type: string): string {
    return type === 'service' ? 'Servicio' : 'Producto';
  }

  canCancelSale(sale?: Sale | null): boolean {
    return !!sale && sale.status === 'completed';
  }

  cancelSelectedSale(): void {
    this.openCancelSaleDialog();
  }

  printSaleReceipt(): void {
    if (!this.selectedSale) return;

    const sale = this.selectedSale;
    const items = sale.items ?? [];

    const itemsHtml = items.length > 0
      ? items.map(item => `
        <tr>
          <td>
            <strong>${this.escapeHtml(item.itemName || this.saleItemTypeLabel(item.itemType))}</strong>
            <small>${this.saleItemTypeLabel(item.itemType)} · Cant. ${item.quantity}</small>
          </td>
          <td class="right">${this.formatCurrency(Number(item.unitPrice ?? 0))}</td>
          <td class="right total">${this.formatCurrency(Number(item.total ?? 0))}</td>
        </tr>
      `).join('')
      : `
        <tr>
          <td colspan="3" class="empty">Sin conceptos registrados</td>
        </tr>
      `;

    const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${this.saleReceiptNumber(sale)}</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 24px;
            background: #f4f6f8;
            color: #020617;
            font-family: Inter, Arial, sans-serif;
          }

          .ticket {
            width: 100%;
            max-width: 520px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.10);
            border-radius: 20px;
            padding: 24px;
          }

          .header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(15, 23, 42, 0.10);
          }

          h1 {
            margin: 0;
            font-size: 22px;
            line-height: 1.1;
            letter-spacing: -0.04em;
          }

          .folio {
            margin-top: 5px;
            color: #64748b;
            font-size: 13px;
            font-weight: 800;
          }

          .status {
            color: #16a34a;
            background: rgba(22, 163, 74, 0.10);
            border: 1px solid rgba(22, 163, 74, 0.20);
            border-radius: 999px;
            padding: 6px 12px;
            font-size: 12px;
            font-weight: 900;
            white-space: nowrap;
          }

          .total-box {
            margin-top: 18px;
            padding: 18px;
            border-radius: 18px;
            background: rgba(37, 99, 235, 0.10);
            border: 1px solid rgba(37, 99, 235, 0.22);
          }

          .total-box span {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 8px;
          }

          .total-box strong {
            display: block;
            color: #2563eb;
            font-size: 42px;
            line-height: 1;
            letter-spacing: -0.06em;
          }

          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 16px;
          }

          .box {
            min-height: 78px;
            padding: 13px;
            border-radius: 15px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.08);
          }

          .box span {
            display: block;
            color: #64748b;
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-bottom: 7px;
          }

          .box strong {
            display: block;
            color: #020617;
            font-size: 14px;
            line-height: 1.25;
          }

          .section {
            margin-top: 18px;
          }

          .section-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 10px;
          }

          .section-title h2 {
            margin: 0;
            font-size: 16px;
            letter-spacing: -0.03em;
          }

          .section-title span {
            color: #2563eb;
            background: rgba(37, 99, 235, 0.10);
            border: 1px solid rgba(37, 99, 235, 0.16);
            border-radius: 999px;
            padding: 5px 10px;
            font-size: 12px;
            font-weight: 900;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid rgba(15, 23, 42, 0.08);
            border-radius: 14px;
            overflow: hidden;
          }

          th {
            text-align: left;
            padding: 10px;
            color: #64748b;
            background: #f8fafc;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          td {
            padding: 12px 10px;
            border-top: 1px solid rgba(15, 23, 42, 0.08);
            vertical-align: top;
            font-size: 13px;
          }

          td strong {
            display: block;
            font-size: 14px;
          }

          td small {
            display: block;
            margin-top: 3px;
            color: #64748b;
            font-weight: 700;
          }

          .right {
            text-align: right;
            white-space: nowrap;
          }

          .total {
            font-weight: 900;
          }

          .empty {
            text-align: center;
            color: #64748b;
            font-weight: 700;
          }

          .totals {
            margin-top: 16px;
            padding: 14px;
            border-radius: 16px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.08);
          }

          .totals-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 7px 0;
            color: #64748b;
            font-weight: 800;
          }

          .totals-row strong {
            color: #020617;
          }

          .grand {
            margin-top: 8px;
            padding-top: 12px;
            border-top: 1px solid rgba(15, 23, 42, 0.10);
            color: #020617;
            font-size: 17px;
          }

          .grand strong {
            color: #2563eb;
            font-size: 24px;
          }

          .footer {
            margin-top: 20px;
            padding-top: 14px;
            border-top: 1px solid rgba(15, 23, 42, 0.10);
            text-align: center;
            color: #64748b;
            font-size: 12px;
            font-weight: 700;
          }

          @media print {
            body {
              padding: 0;
              background: #ffffff;
            }

            .ticket {
              max-width: none;
              border: none;
              border-radius: 0;
              box-shadow: none;
            }

            @page {
              size: auto;
              margin: 12mm;
            }
          }
        </style>
      </head>

      <body>
        <main class="ticket">
          <div class="header">
            <div>
              <h1>Detalle de venta</h1>
              <div class="folio">${this.saleReceiptNumber(sale)}</div>
            </div>
            <div class="status">${this.statusLabel(sale.status)}</div>
          </div>

          <div class="total-box">
            <span>Total de venta</span>
            <strong>${this.formatCurrency(Number(sale.total ?? 0))}</strong>
          </div>

          <div class="grid">
            <div class="box">
              <span>Cliente</span>
              <strong>${this.escapeHtml(sale.clientName || 'Cliente de paso')}</strong>
            </div>

            <div class="box">
              <span>Barbero</span>
              <strong>${this.escapeHtml(this.saleBarberName(sale))}</strong>
            </div>

            <div class="box">
              <span>Origen</span>
              <strong>${this.escapeHtml(this.saleOriginLabel(sale))}</strong>
            </div>

            <div class="box">
              <span>Método</span>
              <strong>${this.escapeHtml(this.paymentLabel(sale.paymentMethod))}</strong>
            </div>

            <div class="box">
              <span>Fecha</span>
              <strong>${this.escapeHtml(this.formatDateTime(sale.createdAt))}</strong>
            </div>

            <div class="box">
              <span>Conceptos</span>
              <strong>${this.saleItemsCount(sale)}</strong>
            </div>
          </div>

          <section class="section">
            <div class="section-title">
              <h2>Conceptos vendidos</h2>
              <span>${items.length} registro(s)</span>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th class="right">Precio</th>
                  <th class="right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </section>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal</span>
              <strong>${this.formatCurrency(Number(sale.subtotal ?? 0))}</strong>
            </div>

            <div class="totals-row">
              <span>Descuento</span>
              <strong>${this.formatCurrency(Number(sale.discount ?? 0))}</strong>
            </div>

            <div class="totals-row grand">
              <span>Total</span>
              <strong>${this.formatCurrency(Number(sale.total ?? 0))}</strong>
            </div>
          </div>

          <div class="footer">
            BarberShop Dashboard · ${new Date().toLocaleDateString('es-MX')}
          </div>
        </main>

        <script>
          window.onload = function () {
            setTimeout(function () {
              window.focus();
              window.print();
              window.close();
            }, 250);
          };
        </script>
      </body>
    </html>
  `;

    const printWindow = window.open('', '_blank', 'width=720,height=900');

    if (!printWindow) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Impresión bloqueada',
        detail: 'Permite ventanas emergentes para imprimir el ticket'
      });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  openCancelSaleDialog(): void {
    if (!this.selectedSale || !this.canCancelSale(this.selectedSale)) return;

    this.cancelSaleReason = '';
    this.showCancelSaleDialog = true;
  }

  closeCancelSaleDialog(): void {
    if (this.cancellingSale) return;

    this.showCancelSaleDialog = false;
    this.cancelSaleReason = '';
  }

  confirmCancelSale(): void {
    if (!this.selectedSale || !this.canCancelSale(this.selectedSale) || this.cancellingSale) return;

    const reason = this.cancelSaleReason.trim();

    if (!reason) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Motivo requerido',
        detail: 'Captura el motivo de cancelación'
      });
      return;
    }

    this.cancellingSale = true;

    this.saleService.cancel(this.selectedSale.id, reason).subscribe({
      next: (res) => {
        this.cancellingSale = false;

        if (res.success) {
          this.selectedSale = res.data;

          const index = this.sales.findIndex(s => s.id === res.data.id);
          if (index >= 0) {
            this.sales[index] = res.data;
          }

          this.showCancelSaleDialog = false;
          this.cancelSaleReason = '';

          this.loadReport();

          this.messageService.add({
            severity: 'success',
            summary: 'Venta cancelada',
            detail: 'La venta fue cancelada correctamente y el stock fue ajustado'
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'No se pudo cancelar',
            detail: res.message || 'Ocurrió un error al cancelar la venta'
          });
        }
      },
      error: (err) => {
        this.cancellingSale = false;

        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo cancelar',
          detail: err?.error?.message || 'La venta no pudo cancelarse'
        });
      }
    });
  }
}