import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AvailableSlot,
  PublicBarbershop,
  PublicBookingRequest,
  PublicServiceOption
} from '../../models/public-booking.model';
import { PublicBookingService } from '../../services/public-booking.service';

interface CalendarDay {
  date: string;
  day: number;
  inCurrentMonth: boolean;
  selected: boolean;
  disabled: boolean;
  available: boolean;
}

@Component({
  selector: 'app-public-booking',
  templateUrl: './public-booking.component.html',
  styleUrls: ['./public-booking.component.scss']
})
export class PublicBookingComponent implements OnInit {

  isLoading = true;
  isSaving = false;
  bookingConfirmed = false;

  barbershopId = '';
  currentStep = 1;

  barbershop: PublicBarbershop | null = null;
  services: PublicServiceOption[] = [];
  availableSlots: AvailableSlot[] = [];

  selectedService: PublicServiceOption | null = null;
  selectedSlot: AvailableSlot | null = null;

  selectedDate = this.getTodayDate();
  currentMonthDate = new Date();

  calendarDays: CalendarDay[] = [];

  clientName = '';
  clientPhone = '';
  clientNotes = '';

  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private publicBookingService: PublicBookingService
  ) { }

  ngOnInit(): void {
    this.barbershopId = this.route.snapshot.paramMap.get('barbershopId') ?? '';
    this.buildCalendar();
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.publicBookingService.getBarbershop(this.barbershopId).subscribe({
      next: barbershop => {
        this.barbershop = barbershop;
        this.loadServices();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'No pudimos encontrar esta barbería.';
      }
    });
  }

  loadServices(): void {
    this.publicBookingService.getServices(this.barbershopId).subscribe({
      next: services => {
        this.services = services;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'No pudimos cargar los servicios.';
      }
    });
  }

  selectService(service: PublicServiceOption): void {
    this.selectedService = service;
    this.selectedSlot = null;
    this.errorMessage = '';
    this.currentStep = 2;
    this.loadAvailability();
  }

  loadAvailability(): void {
  if (!this.selectedService) {
    return;
  }

  this.errorMessage = '';

  this.publicBookingService
    .getAvailability(this.barbershopId, this.selectedDate, this.selectedService)
    .subscribe({
      next: slots => {
        this.availableSlots = this.removePastSlots(slots);
      },
      error: () => {
        this.errorMessage = 'No pudimos cargar los horarios disponibles.';
      }
    });
}

  selectDate(date: string): void {
    this.selectedDate = date;
    this.selectedSlot = null;
    this.buildCalendar();
    this.loadAvailability();
  }

  selectSlot(slot: AvailableSlot): void {
    if (!slot.available) {
      return;
    }

    this.selectedSlot = slot;
    this.errorMessage = '';
    this.currentStep = 3;
  }

  confirmBooking(): void {
    this.errorMessage = '';

    if (!this.selectedService || !this.selectedSlot) {
      this.errorMessage = 'Selecciona un servicio y un horario.';
      return;
    }

    if (!this.clientName.trim()) {
      this.errorMessage = 'Ingresa tu nombre.';
      return;
    }

    if (!this.clientPhone.trim()) {
      this.errorMessage = 'Ingresa tu número de WhatsApp.';
      return;
    }

    const request: PublicBookingRequest = {
      clientName: this.clientName.trim(),
      clientPhone: this.clientPhone.trim(),
      clientNotes: this.clientNotes.trim(),
      serviceCategoryId: this.selectedService.serviceCategoryId,
      serviceVariantId: this.selectedService.serviceVariantId,
      serviceName: this.selectedService.displayName,
      servicePrice: this.selectedService.price,
      serviceDurationMin: this.selectedService.durationMin,
      appointmentDate: this.selectedDate,
      startTime: this.selectedSlot.startTime,
      source: 'web'
    };

    this.isSaving = true;

    this.publicBookingService.createBooking(this.barbershopId, request).subscribe({
      next: () => {
        this.isSaving = false;
        this.bookingConfirmed = true;
        this.currentStep = 4;
      },
      error: () => {
        this.isSaving = false;
        this.errorMessage = 'No pudimos registrar tu cita. Intenta con otro horario.';
      }
    });
  }

  goBack(): void {
    this.errorMessage = '';

    if (this.currentStep === 3) {
      this.currentStep = 2;
      return;
    }

    if (this.currentStep === 2) {
      this.currentStep = 1;
      this.selectedService = null;
      this.selectedSlot = null;
      return;
    }

    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  goToPreviousMonth(): void {
    this.currentMonthDate = new Date(
      this.currentMonthDate.getFullYear(),
      this.currentMonthDate.getMonth() - 1,
      1
    );

    this.buildCalendar();
  }

  goToNextMonth(): void {
    this.currentMonthDate = new Date(
      this.currentMonthDate.getFullYear(),
      this.currentMonthDate.getMonth() + 1,
      1
    );

    this.buildCalendar();
  }

  buildCalendar(): void {
    const year = this.currentMonthDate.getFullYear();
    const month = this.currentMonthDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const firstWeekDay = this.getMondayBasedWeekDay(firstDay);
    const totalDays = lastDay.getDate();

    const days: CalendarDay[] = [];

    const previousMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = firstWeekDay - 1; i > 0; i--) {
      const day = previousMonthLastDay - i + 1;
      const date = new Date(year, month - 1, day);
      days.push(this.createCalendarDay(date, false));
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      days.push(this.createCalendarDay(date, true));
    }

    while (days.length % 7 !== 0) {
      const nextDay = days.length - (firstWeekDay - 1) - totalDays + 1;
      const date = new Date(year, month + 1, nextDay);
      days.push(this.createCalendarDay(date, false));
    }

    this.calendarDays = days;
  }

  private createCalendarDay(date: Date, inCurrentMonth: boolean): CalendarDay {
    const isoDate = this.formatDateISO(date);
    const today = this.getTodayDate();
    const dayOfWeek = date.getDay();

    const isPast = isoDate < today;
    const isSunday = dayOfWeek === 0;

    return {
      date: isoDate,
      day: date.getDate(),
      inCurrentMonth,
      selected: isoDate === this.selectedDate,
      disabled: isPast || isSunday || !inCurrentMonth,
      available: !isPast && !isSunday && inCurrentMonth
    };
  }

  private getMondayBasedWeekDay(date: Date): number {
    const day = date.getDay();
    return day === 0 ? 7 : day;
  }

  get monthLabel(): string {
    return this.currentMonthDate.toLocaleDateString('es-MX', {
      month: 'long',
      year: 'numeric'
    });
  }

  get selectedDateLabel(): string {
    const date = this.parseDate(this.selectedDate);

    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  get finalDateLabel(): string {
    const date = this.parseDate(this.selectedDate);

    return date.toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(value);
  }

  formatTime(time: string): string {
    const [hour, minute] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hour, minute, 0, 0);

    return date.toLocaleTimeString('es-MX', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  private getTodayDate(): string {
    return this.formatDateISO(new Date());
  }

  private formatDateISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private parseDate(date: string): Date {
    return new Date(`${date}T12:00:00`);
  }

  private removePastSlots(slots: AvailableSlot[]): AvailableSlot[] {
    if (!this.isSelectedDateToday()) {
      return slots;
    }

    const currentMinutes = this.getCurrentMinutes();

    return slots.filter(slot => {
      const slotMinutes = this.getMinutesFromTime(slot.startTime);
      return slot.available && slotMinutes > currentMinutes;
    });
  }

  private isSelectedDateToday(): boolean {
    return this.selectedDate === this.getTodayDate();
  }

  private getCurrentMinutes(): number {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  private getMinutesFromTime(time: string): number {
    const [hours, minutes] = time.substring(0, 5).split(':').map(Number);
    return hours * 60 + minutes;
  }
}