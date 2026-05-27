import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { BarberStaffService }                          from '../../../../core/services/barber-staff.service';
import { BarberStaff, BarberStatus, BARBER_STATUS_LABELS } from '../../../../core/models/barber-staff.model';

@Component({
  selector:    'app-barber-staff',
  templateUrl: './barber-staff.component.html',
  styleUrls:   ['./barber-staff.component.scss']
})
export class BarberStaffComponent implements OnInit {

  // ── Estado ────────────────────────────────────────────────
  loading   = true;
  viewMode  = 'grid';   // grid | list
  saving    = false;
  isEdit    = false;

  // ── Datos ──────────────────────────────────────────────────
  barbers:  BarberStaff[] = [];
  filtered: BarberStaff[] = [];

  // ── Búsqueda y filtros ────────────────────────────────────
  searchQuery  = '';
  sortBy       = 'name';
  statusFilter = 'all';
  private search$ = new Subject<string>();

  sortOptions = [
    { label: 'Nombre (A-Z)',     value: 'name'       },
    { label: 'Rating',           value: 'rating'     },
    { label: 'Total de cortes',  value: 'totalCuts'  },
  ];

  statusOptions = [
    { label: 'Todos',          value: 'all'      },
    { label: 'Activos',        value: 'active'   },
    { label: 'En descanso',    value: 'on_break' },
    { label: 'Inactivos',      value: 'inactive' },
  ];

  showFilters = false;

  // ── Paginación ────────────────────────────────────────────
  page      = 1;
  pageSize  = 8;
  get totalPages(): number { return Math.ceil(this.filtered.length / this.pageSize); }
  get paginated(): BarberStaff[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }
  get pages(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  // ── Métricas del header ───────────────────────────────────
  get totalBarbers():  number { return this.barbers.length; }
  get activeBarbers(): number { return this.barbers.filter(b => b.status === 'active').length; }
  get avgRating():     number {
    const rated = this.barbers.filter(b => b.rating != null);
    if (!rated.length) return 0;
    return Math.round(rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length * 10) / 10;
  }
  get totalCutsAll():  number {
    return this.barbers.reduce((s, b) => s + (b.totalCuts ?? 0), 0);
  }

  // ── Dialogs ───────────────────────────────────────────────
  showBarberForm   = false;
  showStatusDialog = false;
  showScheduleView = false;
  selectedBarber:  BarberStaff | null = null;

  barberForm!: FormGroup;

  constructor(
    private staffService:        BarberStaffService,
    private fb:                  FormBuilder,
    private messageService:      MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadBarbers();
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => this.applyFilters());
  }

  buildForm(): void {
    this.barberForm = this.fb.group({
      fullName:  ['', [Validators.required, Validators.minLength(3)]],
      email:     ['', [Validators.required, Validators.email]],
      phone:     [''],
      specialty: [''],
      password:  [''],
      role:      ['barber', Validators.required]
    });
  }

  // ── Carga ──────────────────────────────────────────────────

  loadBarbers(): void {
    this.loading = true;
    this.staffService.getAll().subscribe({
      next: (res) => {
        this.barbers  = res.success ? res.data : [];
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

    // Búsqueda
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(b =>
        b.fullName.toLowerCase().includes(q)  ||
        (b.specialty?.toLowerCase().includes(q) ?? false)
      );
    }

    // Estado
    if (this.statusFilter !== 'all') {
      result = result.filter(b => b.status === this.statusFilter);
    }

    // Orden
    switch (this.sortBy) {
      case 'name':
        result.sort((a, b) => a.fullName.localeCompare(b.fullName)); break;
      case 'rating':
        result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break;
      case 'totalCuts':
        result.sort((a, b) => (b.totalCuts ?? 0) - (a.totalCuts ?? 0)); break;
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

  // ── CRUD ──────────────────────────────────────────────────

  openCreate(): void {
    this.isEdit = false;
    this.barberForm.reset({ role: 'barber' });
    this.barberForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.barberForm.get('password')?.updateValueAndValidity();
    this.showBarberForm = true;
  }

  openEdit(barber: BarberStaff): void {
    this.isEdit          = true;
    this.selectedBarber  = barber;
    this.barberForm.get('password')?.clearValidators();
    this.barberForm.get('password')?.updateValueAndValidity();
    this.barberForm.patchValue({
      fullName:  barber.fullName,
      email:     barber.email,
      phone:     barber.phone     ?? '',
      specialty: barber.specialty ?? '',
      role:      barber.role,
      password:  ''
    });
    this.showBarberForm = true;
  }

  saveBarber(): void {
    if (this.barberForm.invalid || this.saving) return;
    this.saving = true;
    const data  = this.barberForm.value;

    const action = this.isEdit && this.selectedBarber
      ? this.staffService.update(this.selectedBarber.id, data)
      : this.staffService.create(data);

    action.subscribe({
      next: (res) => {
        if (res.success) {
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
          this.messageService.add({ severity: 'success', summary: 'Estado actualizado', detail: BARBER_STATUS_LABELS[status] });
        }
        this.showStatusDialog = false;
      }
    });
  }

  // ── Ver horario ───────────────────────────────────────────

  viewSchedule(barber: BarberStaff): void {
    this.selectedBarber  = barber;
    this.showScheduleView = true;
  }

  // ── Paginación ────────────────────────────────────────────

  goPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
  }

  // ── Helpers ───────────────────────────────────────────────

  statusLabel(s: BarberStatus): string {
    return BARBER_STATUS_LABELS[s] ?? s;
  }

  statusClass(s: BarberStatus): string {
    return { active: 'st-active', on_break: 'st-break', inactive: 'st-inactive' }[s] ?? '';
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  starsArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i);
  }

  formatNumber(n?: number): string {
    if (!n) return '0';
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  }

  roleOptions = [
    { label: 'Barbero',     value: 'barber' },
    { label: 'Owner',       value: 'owner'  },
    { label: 'Aprendiz',    value: 'apprentice' },
  ];
}