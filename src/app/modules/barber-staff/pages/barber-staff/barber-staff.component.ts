import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Subject, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { BarberStaffService } from '../../../../core/services/barber-staff.service';
import { BarberScheduleService, BarberScheduleResponse } from '../../../../core/services/barber-schedule.service';
import { BarberStaff, BarberStatus, BARBER_STATUS_LABELS } from '../../../../core/models/barber-staff.model';

interface DaySchedule {
  dayOfWeek: number;
  label:     string;
  active:    boolean;
  startTime: string;
  endTime:   string;
}

const DAY_LABELS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const DEFAULT_SCHEDULES: DaySchedule[] = [
  { dayOfWeek: 1, label: 'Lunes',     active: false, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 2, label: 'Martes',    active: false, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 3, label: 'Miércoles', active: false, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 4, label: 'Jueves',    active: false, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 5, label: 'Viernes',   active: false, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 6, label: 'Sábado',    active: false, startTime: '09:00', endTime: '15:00' },
  { dayOfWeek: 7, label: 'Domingo',   active: false, startTime: '09:00', endTime: '13:00' },
];

@Component({
  selector:    'app-barber-staff',
  templateUrl: './barber-staff.component.html',
  styleUrls:   ['./barber-staff.component.scss']
})
export class BarberStaffComponent implements OnInit {

  // ── Estado ────────────────────────────────────────────────
  loading    = true;
  viewMode   = 'grid';
  saving     = false;
  isEdit     = false;

  // ── Datos ─────────────────────────────────────────────────
  barbers:  BarberStaff[] = [];
  filtered: BarberStaff[] = [];

  // ── Búsqueda y filtros ────────────────────────────────────
  searchQuery  = '';
  sortBy       = 'name';
  statusFilter = 'all';
  private search$ = new Subject<string>();

  sortOptions = [
    { label: 'Nombre (A-Z)',     value: 'name'      },
    { label: 'Rating',           value: 'rating'    },
    { label: 'Total de cortes',  value: 'totalCuts' },
  ];

  statusOptions = [
    { label: 'Todos',         value: 'all'      },
    { label: 'Activos',       value: 'active'   },
    { label: 'En descanso',   value: 'on_break' },
    { label: 'Inactivos',     value: 'inactive' },
  ];

  showFilters = false;

  // ── Paginación ────────────────────────────────────────────
  page     = 1;
  pageSize = 8;
  get totalPages(): number    { return Math.ceil(this.filtered.length / this.pageSize); }
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
  showBarberForm   = false;
  showStatusDialog = false;
  showScheduleView = false;
  selectedBarber: BarberStaff | null = null;

  // ── Foto ──────────────────────────────────────────────────
  uploadingPhoto = false;
  photoPreview:  string | null = null;
  selectedFile:  File | null   = null;

  barberForm!: FormGroup;

  roleOptions = [
    { label: 'Barbero', value: 'barber' },
    { label: 'Owner',   value: 'owner'  },
  ];

  // ── Horario del barbero seleccionado ──────────────────────
  scheduleLoading = false;
  savingSchedule  = false;
  daySchedules: DaySchedule[] = [];

  constructor(
    private staffService:    BarberStaffService,
    private scheduleService: BarberScheduleService,
    private fb:              FormBuilder,
    private messageService:  MessageService,
    private confirmService:  ConfirmationService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadBarbers();
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.applyFilters());
  }

  buildForm(): void {
    this.barberForm = this.fb.group({
      fullName:  ['', [Validators.required, Validators.minLength(3)]],
      email:     ['', [Validators.required, Validators.email]],
      phone:     [''],
      specialty: [''],
      bio:       [''],
      role:      ['barber'],
      password:  ['']
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
    switch (this.sortBy) {
      case 'name':      result.sort((a, b) => a.fullName.localeCompare(b.fullName)); break;
      case 'rating':    result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));   break;
      case 'totalCuts': result.sort((a, b) => (b.totalCuts ?? 0) - (a.totalCuts ?? 0)); break;
    }
    this.filtered = result;
    this.page = 1;
  }

  resetFilters(): void {
    this.searchQuery  = '';
    this.statusFilter = 'all';
    this.sortBy       = 'name';
    this.applyFilters();
  }

  // ── CRUD barbero ──────────────────────────────────────────
  openCreate(): void {
    this.isEdit        = false;
    this.selectedBarber = null;
    this.photoPreview  = null;
    this.selectedFile  = null;
    this.barberForm.reset({ role: 'barber' });
    this.barberForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.barberForm.get('password')?.updateValueAndValidity();
    this.showBarberForm = true;
  }

  openEdit(barber: BarberStaff): void {
    this.isEdit         = true;
    this.selectedBarber = barber;
    this.photoPreview   = barber.profilePhotoUrl ?? null;
    this.selectedFile   = null;
    this.barberForm.get('password')?.clearValidators();
    this.barberForm.get('password')?.updateValueAndValidity();
    this.barberForm.patchValue({
      fullName:  barber.fullName,
      email:     barber.email,
      phone:     '',
      specialty: barber.specialty ?? '',
      bio:       barber.bio ?? '',
      role:      barber.role,
      password:  ''
    });
    this.showBarberForm = true;
  }

  saveBarber(): void {
    if (this.barberForm.invalid || this.saving) return;
    this.saving = true;
    const v = this.barberForm.value;

    const action = this.isEdit && this.selectedBarber
      ? this.staffService.update(this.selectedBarber.id, {
          fullName:  v.fullName,
          specialty: v.specialty,
          bio:       v.bio
        })
      : this.staffService.create({
          fullName:  v.fullName,
          email:     v.email,
          password:  v.password,
          specialty: v.specialty,
          bio:       v.bio
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
    const file   = input.files[0];
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
        this.selectedFile   = null;
      },
      error: () => { this.uploadingPhoto = false; }
    });
  }

  // ── Cambiar estado ────────────────────────────────────────
  openStatusChange(barber: BarberStaff): void {
    this.selectedBarber  = barber;
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
      message:     `¿Eliminar a ${barber.fullName}? Esta acción desactivará su acceso al sistema.`,
      header:      'Confirmar eliminación',
      icon:        'pi pi-exclamation-triangle',
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
    this.selectedBarber  = barber;
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
              day.active    = s.isActive;
              day.startTime = s.startTime?.substring(0, 5);
              day.endTime   = s.endTime?.substring(0, 5);
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
        dayOfWeek:    d.dayOfWeek,
        startTime:    d.startTime,
        endTime:      d.endTime,
        slotDuration: 30,
        isActive:     d.active
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
}