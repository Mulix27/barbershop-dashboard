import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';

import { BarberScheduleService } from '../../../../core/services/barber-schedule.service';
import { forkJoin } from 'rxjs';

import { AppointmentService } from '../../../../core/services/appointment.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Appointment } from 'src/app/core/models/appointment.model';

import { ClientService } from '../../../../core/services/client.service';
import { Client, ClientHaircut } from 'src/app/core/models/client.model';
import { CatalogService, ServiceSelectOption } from '../../../../core/services/catalog.service';

import { BarberStaffService } from '../../../../core/services/barber-staff.service';
import { BarberOptionResponse } from '../../../../core/models/barber-staff.model';

import { WhatsappService } from 'src/app/core/services/whatsapp.service';

interface TimeSlot {
  time: string;   // "09:00"
  label: string;  // "09:00 AM"
}

interface DaySchedule {
  dayOfWeek: number;
  label: string;
  active: boolean;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-agenda',
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.scss']
})
export class AgendaComponent implements OnInit {

  // ── Estado general ────────────────────────────────────────
  loading = true;
  selectedDate = new Date();
  calendarDate = new Date();
  viewMode = 'day';

  viewOptions = [
    { label: 'Día', value: 'day' },
    { label: 'Semana', value: 'week' }
  ];

  // ── Datos ──────────────────────────────────────────────────
  appointments: Appointment[] = [];
  barbershopId = '';
  isSingleBarber = false;

  // ── Slots ─────────────────────────────────────────────────
  timeSlots: TimeSlot[] = [];
  workStart = '08:00';
  workEnd = '20:00';
  slotStep = 30;

  // ── Horarios ──────────────────────────────────────────────
  daySchedules: DaySchedule[] = [
    { dayOfWeek: 1, label: 'Lunes', active: true, startTime: '09:00', endTime: '18:00' },
    { dayOfWeek: 2, label: 'Martes', active: true, startTime: '09:00', endTime: '18:00' },
    { dayOfWeek: 3, label: 'Miércoles', active: true, startTime: '09:00', endTime: '18:00' },
    { dayOfWeek: 4, label: 'Jueves', active: true, startTime: '09:00', endTime: '18:00' },
    { dayOfWeek: 5, label: 'Viernes', active: true, startTime: '09:00', endTime: '18:00' },
    { dayOfWeek: 6, label: 'Sábado', active: true, startTime: '09:00', endTime: '15:00' },
    { dayOfWeek: 7, label: 'Domingo', active: false, startTime: '09:00', endTime: '13:00' },
  ];

  // ── Resumen ───────────────────────────────────────────────
  get totalAppts(): number { return this.appointments.length; }
  get confirmedAppts(): number { return this.appointments.filter(a => a.status === 'confirmed').length; }
  get pendingAppts(): number { return this.appointments.filter(a => a.status === 'pending').length; }
  get cancelledAppts(): number { return this.appointments.filter(a => a.status === 'cancelled').length; }
  get inProgressAppts(): number { return this.appointments.filter(a => a.status === 'in_progress').length; }

  nextAppt: Appointment | null = null;

  // ── Dialogs ───────────────────────────────────────────────
  showNewAppt = false;
  showSchedule = false;
  showStatusMenu = false;
  selectedAppt: Appointment | null = null;

  // ── Clientes ──────────────────────────────────────────────
  clients: Client[] = [];
  selectedClient: Client | null = null;
  clientHaircuts: ClientHaircut[] = [];
  isNewClient = false;
  userId = '';

  // ── Servicios del catálogo v2 ─────────────────────────────
  serviceOptions: ServiceSelectOption[] = [];
  selectedService: ServiceSelectOption | null = null;
  loadingServices = false;
  calculatedEndTime = '';

  apptForm!: FormGroup;
  readonly SLOT_HEIGHT = 72;
  readonly MIN_APPT_HEIGHT = 38;
  readonly APPT_GAP = 10;

  barbers: BarberOptionResponse[] = [];
  loadingBarbers = false;

  statusOptions = [
    { label: 'Confirmar', value: 'confirmed', icon: 'pi-check', severity: 'success' },
    { label: 'En progreso', value: 'in_progress', icon: 'pi-play', severity: 'info' },
    { label: 'Completada', value: 'completed', icon: 'pi-check-circle', severity: 'secondary' },
    { label: 'Cancelar', value: 'cancelled', icon: 'pi-times', severity: 'danger' },
    { label: 'No asistió', value: 'no_show', icon: 'pi-user-minus', severity: 'warning' },
  ];

  private readonly FINAL_STATUSES = ['completed', 'cancelled', 'no_show'];

  private readonly BLOCKING_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed'];
  private readonly RELEASED_STATUSES = ['cancelled', 'no_show'];

  isBlockingStatus(status: string): boolean {
    return this.BLOCKING_STATUSES.includes(status);
  }

  isReleasedStatus(status: string): boolean {
    return this.RELEASED_STATUSES.includes(status);
  }


  userRole = '';
  canManage = false;

  constructor(
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmService: ConfirmationService,
    private clientService: ClientService,
    private barberScheduleService: BarberScheduleService,
    private catalogService: CatalogService,
    private barberStaffService: BarberStaffService,
    private whatsappService: WhatsappService
  ) { }

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userRole = user.role;
      this.userId = user.userId;
      this.barbershopId = user.barbershopId;
      this.isSingleBarber = user.singleBarber;

      // Owner y secretary pueden crear citas
      this.canManage = ['owner', 'secretary'].includes(user.role);
    }

    if (this.canManage && !this.isSingleBarber) {
      this.loadBarbers();
    }

    this.buildForm();
    this.generateTimeSlots();
    this.loadSchedules();
    this.loadClients();
    this.loadAppointments();
    this.loadServiceOptions();
  }

  // ── Formulario ────────────────────────────────────────────
  buildForm(): void {
    this.apptForm = this.fb.group({
      clientId: [null],
      clientName: ['', Validators.required],
      clientPhone: ['', Validators.required],
      clientNotes: [''],
      clientHaircutId: [null],
      haircutName: [''],
      serviceNotes: [''],
      appointmentDate: [null, Validators.required],
      startTime: [null, Validators.required],
      source: ['dashboard'],
      serviceCategoryId: [null, Validators.required],
      serviceVariantId: [null],
      serviceName: [''],
      servicePrice: [null],
      serviceDurationMin: [null],
      assignedToId: [null],
    });
  }

  // ── Servicios del catálogo ────────────────────────────────
  loadServiceOptions(): void {
    this.loadingServices = true;
    this.catalogService.getSelectOptions().subscribe({
      next: (res) => {
        this.serviceOptions = res.success ? res.data : [];
        this.loadingServices = false;
      },
      error: () => { this.loadingServices = false; }
    });
  }

  onServiceSelected(categoryId: string): void {
    this.selectedService = this.serviceOptions.find(o => o.categoryId === categoryId) ?? null;
    if (!this.selectedService) return;

    this.apptForm.patchValue({
      serviceCategoryId: this.selectedService.categoryId,
      serviceVariantId: this.selectedService.variantId ?? null,
      serviceName: this.selectedService.displayName,
      servicePrice: this.selectedService.price,
      serviceDurationMin: this.selectedService.durationMin,
    });

    this.recalcEndTime();
  }

  recalcEndTime(): void {
    const startTime = this.apptForm.get('startTime')?.value;
    const duration = this.selectedService?.durationMin;

    if (!startTime || !duration) { this.calculatedEndTime = ''; return; }

    let h: number, m: number;
    if (startTime instanceof Date) {
      h = startTime.getHours(); m = startTime.getMinutes();
    } else {
      [h, m] = String(startTime).split(':').map(Number);
    }

    const totalMin = h * 60 + m + duration;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    this.calculatedEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }

  getApptStartingAtSlot(time: string): Appointment | null {
    const apptsAtSlot = this.appointments.filter(
      appt => appt.startTime?.substring(0, 5) === time
    );

    const blockingAppt = apptsAtSlot.find(
      appt => this.isBlockingStatus(appt.status)
    );

    if (blockingAppt) {
      return blockingAppt;
    }

    return apptsAtSlot.find(
      appt => this.isReleasedStatus(appt.status)
    ) ?? null;
  }

  generateTimeSlots(): void {
    this.timeSlots = [];
    const [startH, startM] = this.workStart.split(':').map(Number);
    const [endH, endM] = this.workEnd.split(':').map(Number);
    let h = startH, m = startM;

    while (h < endH || (h === endH && m < endM)) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const ampm = h < 12 ? 'AM' : 'PM';
      const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const label = `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
      this.timeSlots.push({ time, label });
      m += this.slotStep;
      if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
    }
  }

  // ── Carga de datos ────────────────────────────────────────
  loadClients(): void {
    this.clientService.getAll().subscribe({
      next: (res) => { this.clients = res.success ? res.data : []; },
      error: () => { this.clients = []; }
    });
  }

  loadAppointments(): void {
    this.loading = true;
    const dateStr = this.formatDateISO(this.selectedDate);

    // Barber solo ve su agenda
    const request$ = this.userRole === 'barber'
      ? this.appointmentService.getMyAgenda(dateStr)
      : this.appointmentService.getByDate(dateStr);

    request$.subscribe({
      next: (res) => {
        this.appointments = res.success ? res.data : [];
        this.setNextAppt();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadSchedules(): void {
    if (!this.userId) return;
    this.barberScheduleService.getSchedules(this.userId).subscribe({
      next: (res) => {
        this.daySchedules.forEach(day => { day.active = false; });
        (res.data ?? []).forEach(s => {
          const day = this.daySchedules.find(d => d.dayOfWeek === s.dayOfWeek);
          if (day) {
            day.active = s.isActive;
            day.startTime = s.startTime?.substring(0, 5);
            day.endTime = s.endTime?.substring(0, 5);
          }
        });
      }
    });
  }

  setNextAppt(): void {
    const now = new Date();
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isToday = this.formatDateISO(this.selectedDate) === this.formatDateISO(now);

    const activeAppointments = this.appointments
      .filter(a => ['pending', 'confirmed', 'in_progress'].includes(a.status))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    this.nextAppt = isToday
      ? activeAppointments.find(a => a.startTime >= nowTime) ?? null
      : activeAppointments[0] ?? null;
  }

  // ── Selección de cliente ──────────────────────────────────
  onClientSelected(clientId: string): void {
    const client = this.clients.find(c => c.id === clientId) ?? null;
    this.selectedClient = client;
    this.selectedHaircut = null;
    this.clientHaircuts = [];

    this.apptForm.patchValue({
      clientId,
      clientName: client?.fullName ?? '',
      clientPhone: client?.phone ?? '',
      clientNotes: client?.notes ?? '',
      clientHaircutId: null,
      haircutName: ''
    });

    if (!client) return;
    this.clientService.getById(client.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.selectedClient = res.data;
          this.clientHaircuts = res.data.haircuts ?? [];
        }
      }
    });
  }

  loadBarbers(): void {
    this.loadingBarbers = true;
    this.barberStaffService.getOptions().subscribe({
      next: (res) => {
        this.barbers = res.success ? res.data : [];
        this.loadingBarbers = false;
      },
      error: () => { this.loadingBarbers = false; }
    });
  }

  isWithinWorkingHours(time: string): boolean {
    const dow = this.selectedDate.getDay();
    const iso = dow === 0 ? 7 : dow;
    const daySchedule = this.daySchedules.find(d => d.dayOfWeek === iso);

    if (!daySchedule || !daySchedule.active) return false;

    const [h, m] = time.split(':').map(Number);
    const slotMin = h * 60 + m;
    const [startH, startM] = daySchedule.startTime.split(':').map(Number);
    const [endH, endM] = daySchedule.endTime.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    return slotMin >= startMin && slotMin < endMin;
  }

  sendAppointmentWhatsapp(appointment: Appointment): void {
    const serviceName =
      appointment.serviceName ||
      appointment.haircutName ||
      appointment.serviceNotes ||
      'servicio de barbería';

    const message =
      `Hola ${appointment.clientName}, tu cita ha sido confirmada.\n\n` +
      `Servicio: ${serviceName}\n` +
      `Fecha: ${this.formatWhatsappDate(appointment.appointmentDate)}\n` +
      `Hora: ${this.formatWhatsappTime(appointment.startTime)}\n\n` +
      `Te esperamos.`;

    this.whatsappService.openChat(appointment.clientPhone, message);
  }

  private formatWhatsappDate(date: string): string {
    return new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  private formatWhatsappTime(time: string): string {
    const [hour, minute] = time.substring(0, 5).split(':').map(Number);
    const date = new Date();

    date.setHours(hour, minute, 0, 0);

    return date.toLocaleTimeString('es-MX', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  // ── Helpers de slots ──────────────────────────────────────
  isSlotCoveredByAppt(time: string): boolean {
    const [h, m] = time.split(':').map(Number);
    const slotMin = h * 60 + m;

    return this.appointments.some(appt => {
      if (!this.isBlockingStatus(appt.status)) {
        return false;
      }

      const [ah, am] = appt.startTime.substring(0, 5).split(':').map(Number);
      const startMin = ah * 60 + am;
      const duration = this.getApptDuration(appt);
      const endMin = startMin + duration;

      return slotMin > startMin && slotMin < endMin;
    });
  }

  getApptHeight(appt: Appointment): number {
    const duration = this.getApptDuration(appt);
    const alturaCalculada = Math.round((duration / this.slotStep) * this.SLOT_HEIGHT) - this.APPT_GAP;

    if (duration <= 15) {
      return Math.max(36, alturaCalculada);
    }

    if (duration <= 35) {
      return Math.max(78, alturaCalculada);
    }

    return Math.max(124, alturaCalculada);
  }

  getApptDuration(appt: Appointment): number {
    if (appt.serviceDurationMin && Number(appt.serviceDurationMin) > 0) {
      return Number(appt.serviceDurationMin);
    }

    return this.getMinutesBetween(appt.startTime, appt.endTime);
  }

  getMinutesBetween(startTime: string, endTime: string): number {
    if (!startTime || !endTime) return this.slotStep;

    const [startHour, startMinute] = startTime.substring(0, 5).split(':').map(Number);
    const [endHour, endMinute] = endTime.substring(0, 5).split(':').map(Number);

    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;
    const duration = endTotal - startTotal;

    return duration > 0 ? duration : this.slotStep;
  }

  isCompactAppt(appt: Appointment): boolean {
    const duration = this.getApptDuration(appt);
    return duration > 15 && duration <= 35;
  }

  isMiniAppt(appt: Appointment): boolean {
    return this.getApptDuration(appt) <= 15;
  }

  isNormalAppt(appt: Appointment): boolean {
    return this.getApptDuration(appt) > 35;
  }

  isSlotAvailableForDuration(time: string, durationMin: number): boolean {
    if (this.isPastSlot(time)) return false;
    if (!this.isWorkingDay()) return false;

    const [h, m] = time.split(':').map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + durationMin;

    return !this.appointments.some(appt => {
      if (!this.isBlockingStatus(appt.status)) {
        return false;
      }

      const [ah, am] = appt.startTime.substring(0, 5).split(':').map(Number);
      const aStart = ah * 60 + am;
      const aEnd = aStart + this.getApptDuration(appt);

      return startMin < aEnd && endMin > aStart;
    });
  }

  selectedHaircut: ClientHaircut | null = null;

  onHaircutSelected(haircutId: string): void {
    const haircut = this.clientHaircuts.find(h => h.id === haircutId) ?? null;
    this.selectedHaircut = haircut;
    this.apptForm.patchValue({
      clientHaircutId: haircut?.id ?? null,
      haircutName: haircut?.name ?? '',
      serviceNotes: haircut
        ? `${haircut.name}${haircut.description ? ' - ' + haircut.description : ''}`
        : ''
    });
  }

  onClientModeChange(isNew: boolean): void {
    this.isNewClient = isNew;
    this.selectedClient = null;
    this.selectedHaircut = null;
    this.clientHaircuts = [];
    this.apptForm.patchValue({
      clientId: null, clientName: '', clientPhone: '',
      clientNotes: '', clientHaircutId: null, haircutName: '', serviceNotes: ''
    });
  }

  // ── Navegación de fecha ───────────────────────────────────
  prevDay(): void {
    const d = new Date(this.selectedDate);
    d.setDate(d.getDate() - 1);
    this.selectedDate = d;
    this.loadAppointments();
  }

  nextDay(): void {
    const d = new Date(this.selectedDate);
    d.setDate(d.getDate() + 1);
    this.selectedDate = d;
    this.loadAppointments();
  }

  goToday(): void {
    this.selectedDate = new Date();
    this.calendarDate = new Date();
    this.loadAppointments();
  }

  onCalendarSelect(date: Date): void {
    this.selectedDate = date;
    this.loadAppointments();
  }

  // ── Slots helpers ─────────────────────────────────────────
  getApptAtSlot(time: string): Appointment | null { return this.getApptStartingAtSlot(time); }

  isSlotOccupied(time: string): boolean {
    return this.isSlotCoveredByAppt(time) || this.hasBlockingApptStartingAtSlot(time);
  }

  hasBlockingApptStartingAtSlot(time: string): boolean {
    return this.appointments.some(appt =>
      this.isBlockingStatus(appt.status) &&
      appt.startTime?.substring(0, 5) === time
    );
  }

  isCurrentTime(time: string): boolean {
    const now = new Date();
    const isToday = this.formatDateISO(this.selectedDate) === this.formatDateISO(now);
    if (!isToday) return false;
    const [h, m] = time.split(':').map(Number);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const slotMin = h * 60 + m;
    return nowMin >= slotMin && nowMin < slotMin + this.slotStep;
  }

  isWorkingDay(): boolean {
    const dow = this.selectedDate.getDay();
    const iso = dow === 0 ? 7 : dow;
    return this.daySchedules.find(d => d.dayOfWeek === iso)?.active ?? false;
  }

  // ── Estados finales ───────────────────────────────────────
  /**
   * Devuelve true si el estado de la cita es final y NO debe
   * permitirse cambio de estado desde la UI.
   */
  isFinalStatus(status: string): boolean {
    return this.FINAL_STATUSES.includes(status);
  }

  // ── Acciones sobre citas ──────────────────────────────────
  openApptMenu(appt: Appointment): void {
    if (this.isFinalStatus(appt.status)) {
      this.messageService.add({
        severity: 'info',
        summary: 'Cita finalizada',
        detail: `Esta cita ya está ${this.statusLabel(appt.status).toLowerCase()} y no puede modificarse.`,
        life: 3500
      });
      return;
    }

    this.selectedAppt = appt;
    this.showStatusMenu = true;
  }

  updateStatus(appt: Appointment, newStatus: string): void {
    this.showStatusMenu = false;
    this.appointmentService.updateStatus(appt.id, newStatus).subscribe({
      next: (res) => {
        if (res.success) {
          const idx = this.appointments.findIndex(a => a.id === appt.id);
          if (idx >= 0) this.appointments[idx] = res.data;

          const detail = newStatus === 'completed' && res.data?.saleId
            ? 'Cita completada — venta generada automáticamente'
            : 'Estado de cita actualizado';

          this.messageService.add({ severity: 'success', summary: 'Actualizado', detail });
        }
      }
    });
  }

  openNewAppt(time?: string): void {
    if (!this.isWorkingDay()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Día no laborable',
        detail: 'No puedes agendar citas en un día marcado como no laborable.'
      });
      return;
    }

    if (time && this.isPastSlot(time)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Horario vencido',
        detail: 'No puedes agendar una cita en un horario que ya pasó.'
      });
      return;
    }

    this.selectedService = null;
    this.calculatedEndTime = '';
    this.selectedClient = null;
    this.selectedHaircut = null;
    this.clientHaircuts = [];
    this.isNewClient = false;

    this.apptForm.reset({ source: 'dashboard' });
    this.apptForm.reset({ source: 'dashboard', assignedToId: null });

    if (time) {
      const [h, m] = time.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      this.apptForm.patchValue({ startTime: d, appointmentDate: this.selectedDate });
      this.recalcEndTime();
    }

    this.showNewAppt = true;
  }

  saveAppt(): void {
    if (this.apptForm.invalid) return;

    const val = this.apptForm.value;
    const dateStr = this.formatDateISO(val.appointmentDate);
    const timeStr = `${String(val.startTime.getHours()).padStart(2, '0')}:${String(val.startTime.getMinutes()).padStart(2, '0')}`;

    const createAppointment = (clientId: string) => {
      const body = { ...val, clientId, appointmentDate: dateStr, startTime: timeStr };
      return this.appointmentService.createPublic(this.barbershopId, body);
    };

    if (this.isNewClient) {
      const existing = this.clients.find(c => c.phone === val.clientPhone);
      if (existing) {
        this.messageService.add({
          severity: 'warn', summary: 'Cliente ya registrado',
          detail: `Ese teléfono ya pertenece a ${existing.fullName}. Selecciónalo como cliente existente.`
        });
        this.onClientModeChange(false);
        this.apptForm.patchValue({
          clientId: existing.id, clientName: existing.fullName,
          clientPhone: existing.phone, clientNotes: existing.notes ?? ''
        });
        this.onClientSelected(existing.id);
        return;
      }

      this.clientService.create({ fullName: val.clientName, phone: val.clientPhone, notes: val.clientNotes }).subscribe({
        next: (clientRes) => {
          if (!clientRes.success) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: clientRes.message });
            return;
          }
          createAppointment(clientRes.data.id).subscribe({
            next: (res) => this.handleAppointmentResponse(res, timeStr)
          });
        }
      });
      return;
    }

    if (!val.clientId) {
      this.messageService.add({
        severity: 'warn', summary: 'Cliente requerido',
        detail: 'Selecciona un cliente o cambia a Cliente nuevo'
      });
      return;
    }

    createAppointment(val.clientId).subscribe({
      next: (res) => this.handleAppointmentResponse(res, timeStr)
    });
  }

  // ── Horarios ──────────────────────────────────────────────
  toggleDay(day: DaySchedule): void { day.active = !day.active; }

  saveSchedules(): void {
    if (!this.userId) return;

    const requests = this.daySchedules.map(d =>
      this.barberScheduleService.saveSchedule(this.userId, {
        dayOfWeek: d.dayOfWeek,
        startTime: d.startTime,
        endTime: d.endTime,
        slotDuration: this.slotStep,
        isActive: d.active
      })
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.showSchedule = false;
        this.loadSchedules();
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Horarios actualizados' });
      }
    });
  }

  onAppointmentClick(appt: Appointment): void {
    if (this.isReleasedStatus(appt.status)) {
      this.openNewAppt(appt.startTime.substring(0, 5));
      return;
    }

    this.openApptMenu(appt);
  }

  // ── Helpers ───────────────────────────────────────────────
  private handleAppointmentResponse(res: any, timeStr: string): void {
    if (res.success) {
      this.showNewAppt = false;
      this.loadClients();
      this.loadAppointments();
      this.messageService.add({
        severity: 'success', summary: '¡Cita agendada!',
        detail: `${res.data.clientName} — ${timeStr}`
      });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message });
    }
  }

  formatCurrency(v: number): string {
    if (!v) return '';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN', minimumFractionDigits: 2
    }).format(v);
  }

  get selectedDateLabel(): string {
    return this.selectedDate.toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  get isToday(): boolean {
    return this.formatDateISO(this.selectedDate) === this.formatDateISO(new Date());
  }

  formatDateISO(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  formatTime(t: string): string { return t?.substring(0, 5) ?? ''; }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      confirmed: 'Confirmado',
      pending: 'Pendiente',
      in_progress: 'En curso',
      completed: 'Completado',
      cancelled: 'Cancelado',
      no_show: 'No asistió'
    };
    return m[s] ?? s;
  }

  statusSeverity(s: string): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' | undefined {
    const m: Record<string, 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast'> = {
      confirmed: 'success',
      pending: 'warning',
      in_progress: 'info',
      completed: 'secondary',
      cancelled: 'danger',
      no_show: 'danger'
    };
    return m[s] ?? 'secondary';
  }

  isPastSlot(time: string): boolean {
    const today = this.formatDateISO(new Date());
    const selected = this.formatDateISO(this.selectedDate);

    if (selected < today) return true;
    if (selected > today) return false;

    const now = new Date();
    const [h, m] = time.split(':').map(Number);
    const slotDate = new Date(this.selectedDate);
    slotDate.setHours(h, m, 0, 0);
    return slotDate < now;
  }

  shouldShowAppointment(appt: Appointment): boolean {
    return !['completed', 'cancelled', 'no_show'].includes(appt.status);
  }

  canOpenSlot(time: string): boolean {
    return !this.isPastSlot(time) && !this.isSlotOccupied(time);
  }
}