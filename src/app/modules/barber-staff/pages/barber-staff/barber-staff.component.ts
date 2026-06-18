import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Subject, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { BarberStaffService } from '../../../../core/services/barber-staff.service';
import { BarberScheduleService, BarberScheduleResponse } from '../../../../core/services/barber-schedule.service';
import { BarberStaff, BarberStatus, BARBER_STATUS_LABELS } from '../../../../core/models/barber-staff.model';
import { StaffPaymentService } from '../../../../core/services/staff-payment.service';
import {
  STAFF_PAYMENT_FREQUENCY_LABELS,
  STAFF_PAYMENT_METHOD_LABELS,
  STAFF_PAYMENT_STATUS_LABELS,
  STAFF_PAYMENT_TYPE_LABELS,
  StaffPaymentConfigResponse,
  StaffPaymentFrequency,
  StaffPaymentMethod,
  StaffPaymentPeriodResponse,
  StaffPaymentResponse,
  StaffPaymentType,
  StaffPaymentSummaryResponse,
  StaffPaymentCardSummaryResponse,
  StaffPaymentHistoryResponse,
  StaffPaymentPeriodSaleResponse,
  STAFF_COMMISSION_BASE_LABELS,
  StaffCommissionBase,
} from '../../../../core/models/staff-payment.model';

interface DaySchedule {
  dayOfWeek: number;
  label: string;
  active: boolean;
  startTime: string;
  endTime: string;
}

const DAY_LABELS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const DEFAULT_SCHEDULES: DaySchedule[] = [
  { dayOfWeek: 1, label: 'Lunes', active: false, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 2, label: 'Martes', active: false, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 3, label: 'Miércoles', active: false, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 4, label: 'Jueves', active: false, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 5, label: 'Viernes', active: false, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 6, label: 'Sábado', active: false, startTime: '09:00', endTime: '15:00' },
  { dayOfWeek: 7, label: 'Domingo', active: false, startTime: '09:00', endTime: '13:00' },
];

@Component({
  selector: 'app-barber-staff',
  templateUrl: './barber-staff.component.html',
  styleUrls: ['./barber-staff.component.scss']
})
export class BarberStaffComponent implements OnInit {

  // ── Estado ────────────────────────────────────────────────
  loading = true;
  viewMode = 'grid';
  saving = false;
  isEdit = false;

  // ── Datos ─────────────────────────────────────────────────
  barbers: BarberStaff[] = [];
  filtered: BarberStaff[] = [];

  // ── Búsqueda y filtros ────────────────────────────────────
  searchQuery = '';
  sortBy = 'name';
  statusFilter = 'all';
  private search$ = new Subject<string>();

  sortOptions = [
    { label: 'Nombre (A-Z)', value: 'name' },
    { label: 'Rating', value: 'rating' },
    { label: 'Total de cortes', value: 'totalCuts' },
  ];

  statusOptions = [
    { label: 'Todos', value: 'all' },
    { label: 'Activos', value: 'active' },
    { label: 'En descanso', value: 'on_break' },
    { label: 'Inactivos', value: 'inactive' },
  ];

  paymentFilterOptions = [
    { label: 'Todos', value: 'all' },
    { label: 'Con pendiente', value: 'pending' },
    { label: 'En revisión', value: 'review' },
    { label: 'Sin configurar', value: 'not_configured' },
    { label: 'Al día', value: 'paid' }
  ];

  showFilters = false;

  // ── Paginación ────────────────────────────────────────────
  page = 1;
  pageSize = 8;
  get totalPages(): number { return Math.ceil(this.filtered.length / this.pageSize); }
  get paginated(): BarberStaff[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  // ── Métricas ──────────────────────────────────────────────
  get totalBarbers(): number { return this.barbers.length; }
  get activeBarbers(): number { return this.barbers.filter(b => b.status === 'active').length; }
  get avgRating(): number {
    const rated = this.barbers.filter(b => b.rating != null);
    if (!rated.length) return 0;
    return Math.round(rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length * 10) / 10;
  }
  get totalCutsAll(): number {
    return this.barbers.reduce((s, b) => s + (b.totalCuts ?? 0), 0);
  }

  // ── Dialogs ───────────────────────────────────────────────
  showBarberForm = false;
  showStatusDialog = false;
  showScheduleView = false;
  selectedBarber: BarberStaff | null = null;

  // ── Foto ──────────────────────────────────────────────────
  uploadingPhoto = false;
  photoPreview: string | null = null;
  selectedFile: File | null = null;

  barberForm!: FormGroup;

  roleOptions = [
    { label: 'Barbero', value: 'barber' },
    { label: 'Owner', value: 'owner' },
  ];

  // ── Horario del barbero seleccionado ──────────────────────
  scheduleLoading = false;
  savingSchedule = false;
  daySchedules: DaySchedule[] = [];

  showPaymentsDialog = false;
  paymentLoading = false;
  savingPaymentConfig = false;
  generatingPeriod = false;
  registeringPayment = false;

  paymentConfig: StaffPaymentConfigResponse | null = null;
  paymentPeriods: StaffPaymentPeriodResponse[] = [];
  periodPayments: StaffPaymentResponse[] = [];
  selectedPaymentPeriod: StaffPaymentPeriodResponse | null = null;

  paymentConfigForm!: FormGroup;
  paymentPeriodForm!: FormGroup;
  registerPaymentForm!: FormGroup;

  paymentTypeOptions = [
    { label: 'Sueldo fijo', value: 'fixed' },
    { label: 'Comisión', value: 'commission' },
    { label: 'Mixto', value: 'mixed' }
  ];

  paymentFrequencyOptions = [
    { label: 'Semanal', value: 'weekly' },
    { label: 'Quincenal', value: 'biweekly' },
    { label: 'Mensual', value: 'monthly' }
  ];

  paymentMethodOptions = [
    { label: 'Efectivo', value: 'cash' },
    { label: 'Transferencia', value: 'transfer' },
    { label: 'Otro', value: 'other' }
  ];

  paymentHistoryMethodOptions = [
    { label: 'Todos', value: 'all' },
    { label: 'Efectivo', value: 'cash' },
    { label: 'Transferencia', value: 'transfer' },
    { label: 'Otro', value: 'other' }
  ];

  commissionBaseOptions = [
    { label: 'Solo servicios', value: 'services_only' },
    { label: 'Servicios y productos', value: 'services_and_products' }
  ];

  paymentSummary: StaffPaymentSummaryResponse | null = null;
  paymentSummaryLoading = false;
  paymentCardSummaries: Record<string, StaffPaymentCardSummaryResponse> = {};
  paymentFilter = 'all';
  showPaymentHistoryDialog = false;
  paymentHistoryLoading = false;
  paymentHistory: StaffPaymentHistoryResponse[] = [];
  paymentHistoryForm!: FormGroup;

  showPaymentReceiptDialog = false;
  selectedPaymentReceipt: StaffPaymentHistoryResponse | null = null;

  showCancelPaymentDialog = false;
  cancelingPayment = false;
  selectedPaymentToCancel: StaffPaymentHistoryResponse | null = null;
  cancelPaymentForm!: FormGroup;

  deletingPeriodId: string | null = null;

  periodSales: StaffPaymentPeriodSaleResponse[] = [];
  periodSalesLoading = false;

  constructor(
    private staffService: BarberStaffService,
    private scheduleService: BarberScheduleService,
    private paymentService: StaffPaymentService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmService: ConfirmationService
  ) { }

  ngOnInit(): void {
    this.buildForm();
    this.buildPaymentForms();
    this.loadBarbers();
    this.loadPaymentSummary();
    this.loadPaymentCardSummaries();
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.applyFilters());
  }

  buildForm(): void {
    this.barberForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      specialty: [''],
      bio: [''],
      role: ['barber'],
      password: ['']
    });
  }

  loadPaymentSummary(): void {
    this.paymentSummaryLoading = true;

    this.paymentService.getSummary().subscribe({
      next: (res) => {
        this.paymentSummary = res.success ? res.data : null;
        this.paymentSummaryLoading = false;
      },
      error: () => {
        this.paymentSummary = null;
        this.paymentSummaryLoading = false;
      }
    });
  }

  loadPaymentCardSummaries(): void {
    this.paymentService.getCardSummaries().subscribe({
      next: (res) => {
        const map: Record<string, StaffPaymentCardSummaryResponse> = {};

        if (res.success && res.data) {
          res.data.forEach(item => {
            map[item.userId] = item;
          });
        }

        this.paymentCardSummaries = map;
        this.applyFilters();
      },
      error: () => {
        this.paymentCardSummaries = {};
      }
    });
  }

  buildPaymentForms(): void {
    this.paymentConfigForm = this.fb.group({
      paymentType: [null, Validators.required],
      fixedAmount: [null],
      commissionPercentage: [null],
      commissionBase: [null],
      frequency: [null],
      paymentDay: [null]
    });

    this.paymentPeriodForm = this.fb.group({
      periodStart: ['', Validators.required],
      periodEnd: ['', Validators.required]
    });

    this.registerPaymentForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
      paymentMethod: ['cash', Validators.required],
      reference: [''],
      notes: ['']
    });

    this.paymentHistoryForm = this.fb.group({
      userId: ['all'],
      startDate: [''],
      endDate: [''],
      paymentMethod: ['all']
    });

    this.cancelPaymentForm = this.fb.group({
      reason: ['', Validators.required]
    });
  }

  // ── Carga de barberos ─────────────────────────────────────
  loadBarbers(): void {
    this.loading = true;
    this.staffService.getAll().subscribe({
      next: (res) => {
        this.barbers = res.success ? res.data : [];
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  // ── Filtros ───────────────────────────────────────────────
  onSearch(): void { this.search$.next(this.searchQuery); }

  applyFilters(): void {
    let result = [...this.barbers];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(b =>
        b.fullName.toLowerCase().includes(q) ||
        (b.specialty?.toLowerCase().includes(q) ?? false)
      );
    }
    if (this.statusFilter !== 'all') {
      result = result.filter(b => b.status === this.statusFilter);
    }
    if (this.paymentFilter !== 'all') {
      result = result.filter(b => {
        const summary = this.getBarberPaymentSummary(b);

        if (this.paymentFilter === 'not_configured') {
          return !summary || !summary.configured;
        }

        if (!summary || !summary.configured) {
          return false;
        }

        if (this.paymentFilter === 'pending') {
          return summary.pendingAmount > 0;
        }

        if (this.paymentFilter === 'review') {
          return summary.reviewPeriods > 0;
        }

        if (this.paymentFilter === 'paid') {
          return summary.configured
            && summary.pendingAmount <= 0
            && summary.readyPeriods <= 0
            && summary.reviewPeriods <= 0;
        }

        return true;
      });
    }
    switch (this.sortBy) {
      case 'name': result.sort((a, b) => a.fullName.localeCompare(b.fullName)); break;
      case 'rating': result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break;
      case 'totalCuts': result.sort((a, b) => (b.totalCuts ?? 0) - (a.totalCuts ?? 0)); break;
    }
    this.filtered = result;
    this.page = 1;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.paymentFilter = 'all';
    this.sortBy = 'name';
    this.applyFilters();
  }

  // ── CRUD barbero ──────────────────────────────────────────
  openCreate(): void {
    this.isEdit = false;
    this.selectedBarber = null;
    this.photoPreview = null;
    this.selectedFile = null;
    this.barberForm.reset({ role: 'barber' });
    this.barberForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.barberForm.get('password')?.updateValueAndValidity();
    this.showBarberForm = true;
  }

  openEdit(barber: BarberStaff): void {
    this.isEdit = true;
    this.selectedBarber = barber;
    this.photoPreview = barber.profilePhotoUrl ?? null;
    this.selectedFile = null;
    this.barberForm.get('password')?.clearValidators();
    this.barberForm.get('password')?.updateValueAndValidity();
    this.barberForm.patchValue({
      fullName: barber.fullName,
      email: barber.email,
      phone: '',
      specialty: barber.specialty ?? '',
      bio: barber.bio ?? '',
      role: barber.role,
      password: ''
    });
    this.showBarberForm = true;
  }

  saveBarber(): void {
    if (this.barberForm.invalid || this.saving) return;
    this.saving = true;
    const v = this.barberForm.value;

    const action = this.isEdit && this.selectedBarber
      ? this.staffService.update(this.selectedBarber.id, {
        fullName: v.fullName,
        specialty: v.specialty,
        bio: v.bio
      })
      : this.staffService.create({
        fullName: v.fullName,
        email: v.email,
        password: v.password,
        specialty: v.specialty,
        bio: v.bio
      });

    action.subscribe({
      next: (res) => {
        if (res.success) {
          if (this.selectedFile && res.data?.id) {
            this.uploadPhotoForBarber(res.data.id, this.selectedFile);
          }
          this.messageService.add({
            severity: 'success', summary: 'Listo',
            detail: this.isEdit ? 'Barbero actualizado' : 'Barbero agregado al equipo'
          });
          this.showBarberForm = false;
          this.loadBarbers();
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message });
        }
        this.saving = false;
      },
      error: () => { this.saving = false; }
    });
  }

  // ── Foto ──────────────────────────────────────────────────
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => this.photoPreview = e.target?.result as string;
    reader.readAsDataURL(file);
    this.selectedFile = file;
  }

  uploadPhotoForBarber(barberId: string, file: File): void {
    this.uploadingPhoto = true;
    this.staffService.uploadPhoto(barberId, file).subscribe({
      next: (res) => {
        if (res.success) {
          const idx = this.barbers.findIndex(b => b.id === barberId);
          if (idx >= 0) this.barbers[idx] = res.data;
          this.applyFilters();
        }
        this.uploadingPhoto = false;
      },
      error: () => { this.uploadingPhoto = false; }
    });
  }

  uploadPhoto(barber: BarberStaff): void {
    if (!this.selectedFile) return;
    this.uploadingPhoto = true;
    this.staffService.uploadPhoto(barber.id, this.selectedFile).subscribe({
      next: (res) => {
        if (res.success) {
          const idx = this.barbers.findIndex(b => b.id === barber.id);
          if (idx >= 0) this.barbers[idx] = res.data;
          this.applyFilters();
          this.messageService.add({ severity: 'success', summary: 'Foto actualizada', detail: '' });
          this.showBarberForm = false;
          this.loadBarbers();
        }
        this.uploadingPhoto = false;
        this.selectedFile = null;
      },
      error: () => { this.uploadingPhoto = false; }
    });
  }

  // ── Cambiar estado ────────────────────────────────────────
  openStatusChange(barber: BarberStaff): void {
    this.selectedBarber = barber;
    this.showStatusDialog = true;
  }

  setStatus(status: BarberStatus): void {
    if (!this.selectedBarber) return;
    this.staffService.updateStatus(this.selectedBarber.id, status).subscribe({
      next: (res) => {
        if (res.success) {
          const idx = this.barbers.findIndex(b => b.id === this.selectedBarber!.id);
          if (idx >= 0) this.barbers[idx] = res.data;
          this.applyFilters();
          this.messageService.add({
            severity: 'success', summary: 'Estado actualizado',
            detail: BARBER_STATUS_LABELS[status]
          });
        }
        this.showStatusDialog = false;
      }
    });
  }

  // ── Eliminar ──────────────────────────────────────────────
  confirmDelete(barber: BarberStaff): void {
    this.confirmService.confirm({
      message: `¿Eliminar a ${barber.fullName}? Esta acción desactivará su acceso al sistema.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.staffService.delete(barber.id).subscribe({
          next: (res) => {
            if (res.success) {
              this.barbers = this.barbers.filter(b => b.id !== barber.id);
              this.applyFilters();
              this.messageService.add({
                severity: 'warn', summary: 'Barbero eliminado', detail: barber.fullName
              });
            }
          }
        });
      }
    });
  }

  // ── Ver / Editar horario ──────────────────────────────────

  viewSchedule(barber: BarberStaff): void {
    this.selectedBarber = barber;
    this.showScheduleView = true;
    this.loadBarberSchedule(barber.userId);
  }

  private loadBarberSchedule(userId: string): void {
    this.scheduleLoading = true;
    // Inicializar con todos los días en false
    this.daySchedules = DEFAULT_SCHEDULES.map(d => ({ ...d }));

    this.scheduleService.getSchedules(userId).subscribe({
      next: (res) => {
        if (res.success) {
          // Sobreescribir con los datos reales del backend
          (res.data ?? []).forEach((s: BarberScheduleResponse) => {
            const day = this.daySchedules.find(d => d.dayOfWeek === s.dayOfWeek);
            if (day) {
              day.active = s.isActive;
              day.startTime = s.startTime?.substring(0, 5);
              day.endTime = s.endTime?.substring(0, 5);
            }
          });
        }
        this.scheduleLoading = false;
      },
      error: () => { this.scheduleLoading = false; }
    });
  }

  toggleDay(day: DaySchedule): void {
    day.active = !day.active;
  }

  saveSchedules(): void {
    if (!this.selectedBarber || this.savingSchedule) return;
    this.savingSchedule = true;

    const requests = this.daySchedules.map(d =>
      this.scheduleService.saveSchedule(this.selectedBarber!.userId, {
        dayOfWeek: d.dayOfWeek,
        startTime: d.startTime,
        endTime: d.endTime,
        slotDuration: 30,
        isActive: d.active
      })
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.savingSchedule = false;
        this.messageService.add({
          severity: 'success', summary: 'Horarios guardados',
          detail: `Horario de ${this.selectedBarber!.fullName} actualizado`
        });
        this.showScheduleView = false;
      },
      error: () => {
        this.savingSchedule = false;
        this.messageService.add({
          severity: 'error', summary: 'Error', detail: 'No se pudieron guardar los horarios'
        });
      }
    });
  }

  // ── Paginación ────────────────────────────────────────────
  goPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
  }

  openPayments(barber: BarberStaff): void {
    this.selectedBarber = barber;
    this.selectedPaymentPeriod = null;
    this.periodPayments = [];
    this.selectedPaymentReceipt = null;
    this.selectedPaymentToCancel = null;
    this.showPaymentReceiptDialog = false;
    this.showCancelPaymentDialog = false;
    this.showPaymentsDialog = true;
    this.resetPaymentState();
    this.loadPaymentData(barber.userId);
  }

  resetPaymentState(): void {
    this.paymentConfig = null;
    this.paymentPeriods = [];
    this.periodPayments = [];
    this.selectedPaymentPeriod = null;
    this.periodSales = [];
    this.periodSalesLoading = false;

    this.paymentConfigForm.reset({
      paymentType: null,
      fixedAmount: null,
      commissionPercentage: null,
      frequency: null,
      paymentDay: null,
      commissionBase: 'services_only',
    });

    this.paymentPeriodForm.reset({
      periodStart: '',
      periodEnd: ''
    });

    this.registerPaymentForm.reset({
      amount: 0,
      paymentMethod: 'cash',
      reference: '',
      notes: ''
    });

    this.paymentConfigForm.markAsPristine();
  }

  loadPaymentData(userId: string, selectPeriodId?: string): void {
    this.paymentLoading = true;

    forkJoin({
      config: this.paymentService.getConfig(userId),
      periods: this.paymentService.getPeriods(userId)
    }).subscribe({
      next: ({ config, periods }) => {
        this.paymentConfig = config.success ? config.data : null;
        this.paymentPeriods = periods.success ? periods.data : [];

        if (this.paymentConfig) {
          this.paymentConfigForm.patchValue({
            paymentType: this.paymentConfig.paymentType,
            fixedAmount: this.paymentConfig.fixedAmount ?? 0,
            commissionPercentage: this.paymentConfig.commissionPercentage ?? 0,
            frequency: this.paymentConfig.frequency ?? 'weekly',
            paymentDay: this.paymentConfig.paymentDay ?? 6,
            commissionBase: this.paymentConfig.commissionBase ?? 'services_only',
          });
        } else {
          this.paymentConfigForm.reset({
            paymentType: null,
            fixedAmount: null,
            commissionPercentage: null,
            frequency: null,
            paymentDay: null
          });
        }

        this.paymentConfigForm.markAsPristine();

        if (selectPeriodId) {
          const selected = this.paymentPeriods.find(p => p.id === selectPeriodId);
          if (selected) {
            this.selectedPaymentPeriod = selected;
            this.registerPaymentForm.patchValue({
              amount: selected.pendingAmount,
              paymentMethod: 'cash',
              reference: '',
              notes: ''
            });
            this.loadPaymentsByPeriod(selected.id);
            this.loadSalesByPeriod(selected.id);
          }
        }

        this.loadPaymentSummary();
        this.loadPaymentCardSummaries();
        this.paymentLoading = false;
      },
      error: () => {
        this.paymentLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la información de pagos'
        });
      }
    });
  }

  generateCurrentPaymentPeriod(): void {
    if (!this.selectedBarber || !this.paymentConfig || this.hasUnsavedPaymentChanges() || this.generatingPeriod) return;

    this.generatingPeriod = true;

    this.paymentService.generateCurrentPeriod(this.selectedBarber.userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Período generado',
            detail: 'Se generó el período actual correctamente'
          });

          this.loadPaymentData(this.selectedBarber!.userId, res.data.id);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: res.message
          });
        }

        this.generatingPeriod = false;
      },
      error: () => {
        this.generatingPeriod = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo generar el período actual'
        });
      }
    });
  }

  savePaymentConfig(): void {
    if (!this.selectedBarber || this.paymentConfigForm.invalid || this.savingPaymentConfig) return;

    this.savingPaymentConfig = true;
    const value = this.paymentConfigForm.value;
    const paymentType = value.paymentType as StaffPaymentType;

    const request = {
      paymentType,
      fixedAmount: paymentType === 'fixed' || paymentType === 'mixed' ? Number(value.fixedAmount ?? 0) : null,
      commissionPercentage: paymentType === 'commission' || paymentType === 'mixed' ? Number(value.commissionPercentage ?? 0) : null,
      frequency: value.frequency as StaffPaymentFrequency,
      paymentDay: value.paymentDay ? Number(value.paymentDay) : null,
      commissionBase: paymentType === 'commission' || paymentType === 'mixed'
        ? (value.commissionBase as StaffCommissionBase ?? 'services_only')
        : 'services_only',
    };

    this.paymentService.saveConfig(this.selectedBarber.userId, request).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadPaymentCardSummaries();
          this.loadPaymentSummary();
          this.paymentConfig = res.data;
          this.messageService.add({
            severity: 'success',
            summary: 'Pago configurado',
            detail: 'La configuración de pago se guardó correctamente'
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: res.message
          });
        }
        this.paymentConfigForm.markAsPristine();
        this.savingPaymentConfig = false;
      },
      error: () => {
        this.savingPaymentConfig = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo guardar la configuración'
        });
      }
    });
  }

  generatePaymentPeriod(): void {
    if (!this.selectedBarber || this.paymentPeriodForm.invalid || this.generatingPeriod) return;

    this.generatingPeriod = true;
    const value = this.paymentPeriodForm.value;

    this.paymentService.generatePeriod(this.selectedBarber.userId, {
      periodStart: value.periodStart,
      periodEnd: value.periodEnd
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Período generado',
            detail: 'El período de pago se calculó correctamente'
          });

          this.loadPaymentData(this.selectedBarber!.userId, res.data.id);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: res.message
          });
        }

        this.generatingPeriod = false;
      },
      error: () => {
        this.generatingPeriod = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo generar el período'
        });
      }
    });
  }

  closePaymentPeriod(period: StaffPaymentPeriodResponse): void {
    this.paymentService.closePeriod(period.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Cálculo confirmado',
            detail: 'El período quedó listo para registrar pago'
          });

          if (this.selectedBarber) {
            this.loadPaymentData(this.selectedBarber.userId, res.data.id);
          }
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: res.message
          });
        }
      }
    });
  }

  selectPaymentPeriod(period: StaffPaymentPeriodResponse): void {
    this.selectedPaymentPeriod = period;
    this.registerPaymentForm.patchValue({
      amount: period.pendingAmount,
      paymentMethod: 'cash',
      reference: '',
      notes: ''
    });

    this.loadPaymentsByPeriod(period.id);
    this.loadSalesByPeriod(period.id);
  }

  loadSalesByPeriod(periodId: string): void {
    this.periodSalesLoading = true;

    this.paymentService.getSalesByPeriod(periodId).subscribe({
      next: (res) => {
        this.periodSales = res.success ? res.data : [];
        this.periodSalesLoading = false;
      },
      error: () => {
        this.periodSales = [];
        this.periodSalesLoading = false;
      }
    });
  }

  loadPaymentsByPeriod(periodId: string): void {
    this.paymentService.getPaymentsByPeriod(periodId).subscribe({
      next: (res) => {
        this.periodPayments = res.success ? res.data : [];
      },
      error: () => {
        this.periodPayments = [];
      }
    });
  }

  registerStaffPayment(): void {
    if (!this.selectedBarber || !this.selectedPaymentPeriod || this.registerPaymentForm.invalid || this.registeringPayment) return;

    this.registeringPayment = true;
    const value = this.registerPaymentForm.value;
    const amount = Number(value.amount);

    if (this.selectedPaymentPeriod.status !== 'closed') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Confirma el cálculo',
        detail: 'Primero marca el período como listo para pagar'
      });
      this.registeringPayment = false;
      return;
    }

    if (amount > this.selectedPaymentPeriod.pendingAmount) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Monto inválido',
        detail: 'El pago no puede ser mayor al pendiente'
      });
      this.registeringPayment = false;
      return;
    }

    this.paymentService.registerPayment(this.selectedPaymentPeriod.id, {
      amount,
      paymentMethod: value.paymentMethod as StaffPaymentMethod,
      reference: value.reference || null,
      notes: value.notes || null
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Pago registrado',
            detail: 'El pago se registró correctamente'
          });

          const periodId = this.selectedPaymentPeriod!.id;
          this.loadPaymentData(this.selectedBarber!.userId, periodId);
          if (this.showPaymentHistoryDialog) {
            this.loadPaymentHistory();
          }
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: res.message
          });
        }

        this.registeringPayment = false;
      },
      error: () => {
        this.registeringPayment = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo registrar el pago'
        });
      }
    });
  }

  canDeletePeriod(period: any): boolean {
    return period?.status === 'open' && Number(period?.paidAmount ?? 0) === 0;
  }

  deletePaymentPeriod(period: any): void {
    if (!period || !this.canDeletePeriod(period) || this.deletingPeriodId) {
      return;
    }

    this.confirmService.confirm({
      header: 'Eliminar período',
      message: 'Este período fue generado por error y será eliminado. Esta acción no se puede deshacer.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.deletingPeriodId = period.id;

        this.paymentService.deletePeriod(period.id).subscribe({
          next: (res) => {
            this.deletingPeriodId = null;

            if (res.success) {
              this.paymentPeriods = this.paymentPeriods.filter((p: any) => p.id !== period.id);

              if (this.selectedPaymentPeriod?.id === period.id) {
                this.selectedPaymentPeriod = this.paymentPeriods[0] ?? null;

                if (this.selectedPaymentPeriod) {
                  this.loadPaymentsByPeriod(this.selectedPaymentPeriod.id);
                } else {
                  this.periodPayments = [];
                }
              }

              this.loadPaymentSummary();
              this.loadPaymentCardSummaries();

              this.messageService.add({
                severity: 'success',
                summary: 'Período eliminado',
                detail: 'El período de pago fue eliminado correctamente'
              });

              if (this.selectedBarber) {
                this.loadPaymentData(this.selectedBarber.userId);
              }
            } else {
              this.messageService.add({
                severity: 'error',
                summary: 'No se pudo eliminar',
                detail: res.message || 'Ocurrió un error al eliminar el período'
              });
            }
          },
          error: (err) => {
            this.deletingPeriodId = null;

            this.messageService.add({
              severity: 'error',
              summary: 'No se pudo eliminar',
              detail: err?.error?.message || 'El período no puede eliminarse'
            });
          }
        });
      }
    });
  }

  paymentTypeLabel(value?: StaffPaymentType | null): string {
    return value ? STAFF_PAYMENT_TYPE_LABELS[value] : 'Sin configurar';
  }

  paymentFrequencyLabel(value?: StaffPaymentFrequency | null): string {
    return value ? STAFF_PAYMENT_FREQUENCY_LABELS[value] : '—';
  }

  paymentStatusLabel(value?: string | null): string {
    return value ? STAFF_PAYMENT_STATUS_LABELS[value as keyof typeof STAFF_PAYMENT_STATUS_LABELS] : '—';
  }

  paymentMethodLabel(value?: StaffPaymentMethod | null): string {
    return value ? STAFF_PAYMENT_METHOD_LABELS[value] : '—';
  }

  money(value?: number | null): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value ?? 0);
  }

  // ── Helpers ───────────────────────────────────────────────
  statusLabel(s: BarberStatus): string { return BARBER_STATUS_LABELS[s] ?? s; }
  statusClass(s: BarberStatus): string {
    return { active: 'st-active', on_break: 'st-break', inactive: 'st-inactive' }[s] ?? '';
  }
  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
  formatNumber(n?: number): string {
    if (!n) return '0';
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  }

  showFixedAmount(): boolean {
    const type = this.paymentConfigForm.get('paymentType')?.value;
    return type === 'fixed' || type === 'mixed';
  }

  showCommissionAmount(): boolean {
    const type = this.paymentConfigForm.get('paymentType')?.value;
    return type === 'commission' || type === 'mixed';
  }

  hasUnsavedPaymentChanges(): boolean {
    if (!this.paymentConfig) {
      return this.paymentConfigForm.dirty;
    }

    const value = this.paymentConfigForm.value;
    const paymentType = value.paymentType as StaffPaymentType;

    const fixedAmount = this.showFixedAmount()
      ? Number(value.fixedAmount ?? 0)
      : null;

    const commissionPercentage = this.showCommissionAmount()
      ? Number(value.commissionPercentage ?? 0)
      : null;

    const commissionBase = this.showCommissionAmount()
      ? (value.commissionBase ?? 'services_only')
      : 'services_only';

    const frequency = value.frequency ?? null;
    const paymentDay = value.paymentDay ? Number(value.paymentDay) : null;

    return (
      this.paymentConfig.paymentType !== paymentType ||
      Number(this.paymentConfig.fixedAmount ?? 0) !== Number(fixedAmount ?? 0) ||
      Number(this.paymentConfig.commissionPercentage ?? 0) !== Number(commissionPercentage ?? 0) ||
      (this.paymentConfig.commissionBase ?? 'services_only') !== commissionBase ||
      (this.paymentConfig.frequency ?? null) !== frequency ||
      Number(this.paymentConfig.paymentDay ?? 0) !== Number(paymentDay ?? 0)
    );
  }

  commissionBaseLabel(value?: StaffCommissionBase | null): string {
    return value ? STAFF_COMMISSION_BASE_LABELS[value] : 'Solo servicios';
  }

  applyPaymentQuickRange(range: 'week' | 'biweekly' | 'month'): void {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);

    if (range === 'week') {
      const day = today.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start = new Date(today);
      start.setDate(today.getDate() + diff);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    }

    if (range === 'biweekly') {
      const day = today.getDate();
      if (day <= 15) {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth(), 15);
      } else {
        start = new Date(today.getFullYear(), today.getMonth(), 16);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      }
    }

    if (range === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    this.paymentPeriodForm.patchValue({
      periodStart: this.formatDateInput(start),
      periodEnd: this.formatDateInput(end)
    });
  }

  formatDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  paymentProgress(period?: StaffPaymentPeriodResponse | null): number {
    if (!period || !period.grossAmount || period.grossAmount <= 0) {
      return 0;
    }

    const value = (period.paidAmount / period.grossAmount) * 100;
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  getBarberPaymentSummary(barber: BarberStaff): StaffPaymentCardSummaryResponse | null {
    return this.paymentCardSummaries[barber.userId] ?? null;
  }

  paymentCardClass(barber: BarberStaff): string {
    const summary = this.getBarberPaymentSummary(barber);

    if (!summary || !summary.configured) {
      return 'not-configured';
    }

    return summary.cardStatus;
  }

  paymentCardTitle(barber: BarberStaff): string {
    const summary = this.getBarberPaymentSummary(barber);

    if (!summary || !summary.configured) {
      return 'Sin pago configurado';
    }

    if (summary.pendingAmount > 0) {
      return 'Pendiente por pagar';
    }

    if (summary.readyPeriods > 0) {
      return 'Listo para pagar';
    }

    if (summary.reviewPeriods > 0) {
      return 'En revisión';
    }

    if (summary.paidPeriods > 0) {
      return 'Pagos al día';
    }

    return 'Pago configurado';
  }

  periodSalesTotal(): number {
    return this.periodSales.reduce((total, sale) => total + Number(sale.total ?? 0), 0);
  }

  formatPaymentDate(date: string): string {
    return new Date(date).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  paymentCardSubtitle(barber: BarberStaff): string {
    const summary = this.getBarberPaymentSummary(barber);

    if (!summary || !summary.configured) {
      return 'Configura su esquema';
    }

    if (summary.pendingAmount > 0) {
      return this.money(summary.pendingAmount);
    }

    if (summary.readyPeriods > 0) {
      return summary.readyPeriods === 1
        ? '1 período listo'
        : `${summary.readyPeriods} períodos listos`;
    }

    if (summary.reviewPeriods > 0) {
      return summary.reviewPeriods === 1
        ? '1 período por confirmar'
        : `${summary.reviewPeriods} períodos por confirmar`;
    }

    if (summary.paidPeriods > 0) {
      return summary.paidPeriods === 1
        ? '1 período pagado'
        : `${summary.paidPeriods} períodos pagados`;
    }

    return this.paymentTypeLabel(summary.paymentType);
  }

  get paymentHistoryBarberOptions(): { label: string; value: string }[] {
    return [
      { label: 'Todos los barberos', value: 'all' },
      ...this.barbers.map(barber => ({
        label: barber.fullName,
        value: barber.userId
      }))
    ];
  }

  get totalPaymentHistoryAmount(): number {
    return this.paymentHistory
      .filter(item => !this.isCancelledPayment(item))
      .reduce((sum, item) => sum + (item.amount ?? 0), 0);
  }

  openPaymentHistory(): void {
    this.showPaymentHistoryDialog = true;

    if (!this.paymentHistoryForm) {
      return;
    }

    const hasDates =
      this.paymentHistoryForm.get('startDate')?.value ||
      this.paymentHistoryForm.get('endDate')?.value;

    if (!hasDates) {
      this.paymentHistoryForm.patchValue({
        startDate: this.formatDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
        endDate: this.formatDateInput(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)),
        userId: 'all',
        paymentMethod: 'all'
      });
    }

    this.loadPaymentHistory();
  }

  loadPaymentHistory(): void {
    if (!this.paymentHistoryForm) {
      return;
    }

    this.paymentHistoryLoading = true;

    const value = this.paymentHistoryForm.value;

    this.paymentService.getPaymentHistory({
      userId: value.userId !== 'all' ? value.userId : null,
      startDate: value.startDate || null,
      endDate: value.endDate || null,
      paymentMethod: value.paymentMethod || 'all'
    }).subscribe({
      next: (res) => {
        this.paymentHistory = res.success ? res.data : [];
        this.paymentHistoryLoading = false;
      },
      error: () => {
        this.paymentHistory = [];
        this.paymentHistoryLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el historial de pagos'
        });
      }
    });
  }

  applyPaymentHistoryQuickRange(range: 'week' | 'month' | 'all'): void {
    if (range === 'all') {
      this.paymentHistoryForm.patchValue({
        startDate: '',
        endDate: ''
      });
      this.loadPaymentHistory();
      return;
    }

    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);

    if (range === 'week') {
      const day = today.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start = new Date(today);
      start.setDate(today.getDate() + diff);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    }

    if (range === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    this.paymentHistoryForm.patchValue({
      startDate: this.formatDateInput(start),
      endDate: this.formatDateInput(end)
    });

    this.loadPaymentHistory();
  }

  openPaymentReceipt(payment: StaffPaymentHistoryResponse): void {
    this.selectedPaymentReceipt = payment;
    this.showPaymentReceiptDialog = true;
  }

  receiptNumber(payment: StaffPaymentHistoryResponse | null): string {
    if (!payment?.id) {
      return 'REC-000000';
    }

    return `REC-${payment.id.substring(0, 8).toUpperCase()}`;
  }

  printPaymentReceipt(): void {
    if (!this.selectedPaymentReceipt) return;

    const payment = this.selectedPaymentReceipt;
    const popup = window.open('', '_blank', 'width=760,height=900');

    if (!popup) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No se pudo abrir',
        detail: 'Permite ventanas emergentes para imprimir el recibo'
      });
      return;
    }

    const html = this.buildReceiptHtml(payment);

    popup.document.open();
    popup.document.write(html);
    popup.document.close();

    setTimeout(() => {
      popup.focus();
      popup.print();
    }, 300);
  }

  private buildReceiptHtml(payment: StaffPaymentHistoryResponse): string {
    const receipt = this.receiptNumber(payment);
    const isCancelled = this.isCancelledPayment(payment);
    const statusText = isCancelled ? 'Anulado' : 'Pagado';
    const badgeBg = isCancelled ? '#fee2e2' : '#dcfce7';
    const badgeColor = isCancelled ? '#dc2626' : '#16a34a';
    const cancelledInfo = isCancelled
      ? `
    <div class="notes cancelled">
      <div class="item">
        <span>Motivo de anulación</span>
        <strong>${this.escapeHtml(payment.cancelReason || 'Sin motivo registrado')}</strong>
      </div>
    </div>
  `
      : '';
    const method = this.paymentMethodLabel(payment.paymentMethod);
    const amount = this.money(payment.amount);
    const paidAt = new Date(payment.paidAt).toLocaleString('es-MX');
    const notes = payment.notes ? this.escapeHtml(payment.notes) : 'Sin notas';
    const reference = payment.reference ? this.escapeHtml(payment.reference) : 'Sin referencia';
    const paidBy = payment.paidByName ? this.escapeHtml(payment.paidByName) : '—';

    return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${receipt}</title>
        <style>
          body {
            margin: 0;
            padding: 32px;
            font-family: Arial, sans-serif;
            background: #f4f7fb;
            color: #0f172a;
          }

          .receipt {
            max-width: 680px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 20px;
            padding: 28px;
            box-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);
          }

          .top {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 18px;
            margin-bottom: 22px;
          }

          h1 {
            margin: 0 0 6px;
            font-size: 24px;
          }

          p {
            margin: 0;
            color: #64748b;
            font-weight: 600;
          }

          .badge {
            display: inline-block;
            padding: 8px 14px;
            border-radius: 999px;
            background: ${badgeBg};
            color: ${badgeColor};
            font-weight: 800;
            font-size: 13px;
          }

          .amount {
            padding: 18px;
            border-radius: 18px;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            margin-bottom: 20px;
          }

          .amount span {
            display: block;
            color: #64748b;
            text-transform: uppercase;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: .06em;
          }

          .amount strong {
            display: block;
            margin-top: 6px;
            color: #2563eb;
            font-size: 32px;
          }

          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }

          .item {
            padding: 14px;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
          }

          .item span {
            display: block;
            color: #64748b;
            text-transform: uppercase;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: .06em;
            margin-bottom: 6px;
          }

          .item strong {
            display: block;
            font-size: 15px;
          }

          .notes {
            margin-top: 14px;
            padding: 14px;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            background: #f8fafc;
          }

          .footer {
            margin-top: 22px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 12px;
            text-align: center;
          }

          @media print {
            body {
              background: #ffffff;
              padding: 0;
            }

            .receipt {
              box-shadow: none;
              border-radius: 0;
              border: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="top">
            <div>
              <h1>Comprobante de pago</h1>
              <p>${receipt}</p>
            </div>
            <div>
              <span class="badge">${statusText}</span>
            </div>
          </div>

          <div class="amount">
            <span>Monto pagado</span>
            <strong>${amount}</strong>
          </div>

          <div class="grid">
            <div class="item">
              <span>Barbero</span>
              <strong>${this.escapeHtml(payment.userName)}</strong>
            </div>

            <div class="item">
              <span>Método</span>
              <strong>${method}</strong>
            </div>

            <div class="item">
              <span>Período</span>
              <strong>${payment.periodStart} / ${payment.periodEnd}</strong>
            </div>

            <div class="item">
              <span>Fecha de pago</span>
              <strong>${paidAt}</strong>
            </div>

            <div class="item">
              <span>Registró</span>
              <strong>${paidBy}</strong>
            </div>

            <div class="item">
              <span>Referencia</span>
              <strong>${reference}</strong>
            </div>
          </div>

          <div class="notes">
            <div class="item">
              <span>Notas</span>
              <strong>${notes}</strong>
            </div>
          </div>

          ${cancelledInfo}
          <div class="footer">
            Recibo generado desde Barber Staff.
          </div>
        </div>
      </body>
    </html>
  `;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  isCancelledPayment(payment?: { status?: string } | null): boolean {
    return payment?.status === 'cancelled';
  }

  paymentRecordStatusLabel(payment?: { status?: string } | null): string {
    return this.isCancelledPayment(payment) ? 'Anulado' : 'Activo';
  }

  paymentRecordStatusClass(payment?: { status?: string } | null): string {
    return this.isCancelledPayment(payment) ? 'cancelled' : 'active';
  }

  canCancelPayment(payment?: { status?: string } | null): boolean {
    return !!payment && !this.isCancelledPayment(payment);
  }

  openCancelPayment(payment: StaffPaymentHistoryResponse): void {
    this.selectedPaymentToCancel = payment;

    this.cancelPaymentForm.reset({
      reason: ''
    });

    this.showPaymentReceiptDialog = false;
    this.showCancelPaymentDialog = false;

    setTimeout(() => {
      this.showCancelPaymentDialog = true;
    }, 250);
  }

  onCancelPaymentClick(
    event: Event,
    payment: StaffPaymentHistoryResponse | null
  ): void {
    event.preventDefault();
    event.stopPropagation();

    if (!payment) {
      return;
    }

    this.openCancelPayment(payment);
  }

  cancelStaffPayment(): void {
    if (!this.selectedPaymentToCancel || this.cancelPaymentForm.invalid || this.cancelingPayment) {
      this.cancelPaymentForm.markAllAsTouched();
      return;
    }

    const payment = this.selectedPaymentToCancel;
    const reason = this.cancelPaymentForm.value.reason?.trim();

    if (!reason) {
      this.cancelPaymentForm.markAllAsTouched();
      return;
    }

    this.cancelingPayment = true;

    this.paymentService.cancelPayment(payment.id, { reason }).subscribe({
      next: (res) => {
        if (res.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Pago anulado',
            detail: 'El pago fue anulado correctamente'
          });

          this.showCancelPaymentDialog = false;
          this.showPaymentReceiptDialog = false;
          this.selectedPaymentToCancel = null;
          this.selectedPaymentReceipt = null;

          this.loadPaymentHistory();
          this.loadPaymentSummary();
          this.loadPaymentCardSummaries();

          if (this.showPaymentsDialog && this.selectedBarber?.userId === payment.userId) {
            this.loadPaymentData(payment.userId, payment.periodId);
          }
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: res.message
          });
        }

        this.cancelingPayment = false;
      },
      error: () => {
        this.cancelingPayment = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo anular el pago'
        });
      }
    });
  }

  get isPaymentHistoryMobile(): boolean {
    return window.innerWidth <= 640;
  }

  get paymentHistoryDialogStyle(): any {
    if (this.isPaymentHistoryMobile) {
      return {
        width: '100vw',
        maxWidth: '100vw',
        height: '100dvh',
        maxHeight: '100dvh',
        margin: '0',
        borderRadius: '0'
      };
    }

    return {
      width: '1040px',
      maxWidth: '96vw'
    };
  }

  get paymentHistoryContentStyle(): any {
    if (this.isPaymentHistoryMobile) {
      return {
        height: 'calc(100dvh - 205px)',
        maxHeight: 'calc(100dvh - 205px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '0'
      };
    }

    return {
      overflow: 'auto'
    };
  }

  isPaymentCancelled(payment: StaffPaymentResponse | StaffPaymentHistoryResponse): boolean {
    return payment?.status === 'cancelled';
  }

  periodPaymentStatusLabel(payment: StaffPaymentResponse | StaffPaymentHistoryResponse): string {
    return this.isPaymentCancelled(payment) ? 'Anulado' : 'Activo';
  }

  periodPaymentDate(payment: StaffPaymentResponse | StaffPaymentHistoryResponse): string | null {
    const p = payment as any;

    if (this.isPaymentCancelled(payment)) {
      return p.cancelledAt ?? p.paidAt ?? null;
    }

    return p.paidAt ?? null;
  }

  periodPaymentUserLabel(payment: StaffPaymentResponse | StaffPaymentHistoryResponse): string {
    const p = payment as any;

    if (this.isPaymentCancelled(payment)) {
      return p.cancelledByName
        ? `Anuló: ${p.cancelledByName}`
        : 'Pago anulado';
    }

    return p.paidByName
      ? `Registró: ${p.paidByName}`
      : 'Registrado';
  }

  periodPaymentReason(payment: StaffPaymentResponse | StaffPaymentHistoryResponse): string | null {
    const p = payment as any;

    if (!this.isPaymentCancelled(payment)) {
      return null;
    }

    return p.cancelReason ?? 'Sin motivo registrado';
  }
}