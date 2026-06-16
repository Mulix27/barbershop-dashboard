import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.model';
import { Appointment, CompleteAppointmentRequest } from '../models/appointment.model';
import { DayAvailability } from '../models/appointment.model';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  constructor(private http: HttpClient) { }

  getAvailability(barbershopId: string, date: string): Observable<ApiResponse<DayAvailability>> {
    return this.http.get<ApiResponse<DayAvailability>>(
      `${API}/api/public/barbershops/${barbershopId}/availability`,
      { params: new HttpParams().set('date', date) }
    );
  }

  getByDate(date?: string): Observable<ApiResponse<Appointment[]>> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.http.get<ApiResponse<Appointment[]>>(`${API}/api/appointments`, { params });
  }

  getPending(): Observable<ApiResponse<Appointment[]>> {
    return this.http.get<ApiResponse<Appointment[]>>(`${API}/api/appointments/pending`);
  }

  getMyAgenda(date?: string): Observable<ApiResponse<Appointment[]>> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.http.get<ApiResponse<Appointment[]>>(`${API}/api/appointments/my-agenda`, { params });
  }

  completeAppointment(
    id: string,
    request: CompleteAppointmentRequest
  ): Observable<ApiResponse<Appointment>> {
    return this.http.post<ApiResponse<Appointment>>(
      `${API}/api/appointments/${id}/complete`,
      request
    );
  }

  assignBarber(id: string, barberId: string): Observable<ApiResponse<Appointment>> {
    return this.http.patch<ApiResponse<Appointment>>(
      `${API}/api/appointments/${id}/assign`, { barberId }
    );
  }

  updateStatus(id: string, status: string): Observable<ApiResponse<Appointment>> {
    return this.http.patch<ApiResponse<Appointment>>(
      `${API}/api/appointments/${id}/status`, null,
      { params: new HttpParams().set('status', status) }
    );
  }

  createPublic(barbershopId: string, data: any): Observable<ApiResponse<Appointment>> {
    return this.http.post<ApiResponse<Appointment>>(
      `${API}/api/public/barbershops/${barbershopId}/appointments`, data
    );
  }

}
