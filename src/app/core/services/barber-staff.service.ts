import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';
import {
  BarberStaff, BarberStatus,
  CreateBarberRequest, UpdateBarberRequest,
  MOCK_BARBERS
} from '../models/barber-staff.model';

const API = environment.apiUrl;

// ── Cambiar a false cuando el backend esté listo ─────────────
const USE_MOCK = true;

@Injectable({ providedIn: 'root' })
export class BarberStaffService {

  constructor(private http: HttpClient) {}

  // ── GET /api/barbershop/staff ─────────────────────────────
  getAll(): Observable<ApiResponse<BarberStaff[]>> {
    if (USE_MOCK) {
      return of({ success: true, message: 'OK', data: MOCK_BARBERS, timestamp: '' });
    }
    return this.http.get<ApiResponse<BarberStaff[]>>(`${API}/api/barbershop/staff`);
  }

  // ── POST /api/barbershop/staff ────────────────────────────
  create(data: CreateBarberRequest): Observable<ApiResponse<BarberStaff>> {
    return this.http.post<ApiResponse<BarberStaff>>(`${API}/api/barbershop/staff`, data);
  }

  // ── PUT /api/barbershop/staff/{id} ────────────────────────
  update(id: string, data: UpdateBarberRequest): Observable<ApiResponse<BarberStaff>> {
    return this.http.put<ApiResponse<BarberStaff>>(`${API}/api/barbershop/staff/${id}`, data);
  }

  // ── PATCH /api/barbershop/staff/{id}/status ───────────────
  updateStatus(id: string, status: BarberStatus): Observable<ApiResponse<BarberStaff>> {
    return this.http.patch<ApiResponse<BarberStaff>>(
      `${API}/api/barbershop/staff/${id}/status`, { status }
    );
  }

  // ── GET /api/barbershop/staff/{id}/schedule ───────────────
  getSchedule(id: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${API}/api/barbershop/staff/${id}/schedule`);
  }

  // ── Upload foto de perfil ─────────────────────────────────
  uploadPhoto(id: string, file: File): Observable<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ApiResponse<{ url: string }>>(
      `${API}/api/barbershop/staff/${id}/photo`, formData
    );
  }
}