import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';
import {
  BarberStaff, BarberStaffResponse, BarberStatus,
  CreateBarberRequest, UpdateBarberRequest,
  mapBarberResponse, MOCK_BARBERS
} from '../models/barber-staff.model';

const API = environment.apiUrl;

// ── Cambiar a false para conectar al backend real ─────────────
const USE_MOCK = false;

@Injectable({ providedIn: 'root' })
export class BarberStaffService {

  constructor(private http: HttpClient) {}

  // ── GET /api/barbershop/staff ─────────────────────────────
  getAll(): Observable<ApiResponse<BarberStaff[]>> {
    if (USE_MOCK) {
      return of({ success: true, message: 'OK', data: MOCK_BARBERS, timestamp: '' });
    }
    return this.http.get<ApiResponse<BarberStaffResponse[]>>(
      `${API}/api/barbershop/staff`
    ).pipe(
      map(res => ({
        ...res,
        data: res.success ? res.data.map(mapBarberResponse) : []
      }))
    );
  }

  // ── POST /api/barbershop/staff ────────────────────────────
  create(data: CreateBarberRequest): Observable<ApiResponse<BarberStaff>> {
    return this.http.post<ApiResponse<BarberStaffResponse>>(
      `${API}/api/barbershop/staff`, data
    ).pipe(
      map(res => ({ ...res, data: res.success ? mapBarberResponse(res.data) : null as any }))
    );
  }

  // ── PUT /api/barbershop/staff/{id} ────────────────────────
  // id = profileId
  update(id: string, data: UpdateBarberRequest): Observable<ApiResponse<BarberStaff>> {
    return this.http.put<ApiResponse<BarberStaffResponse>>(
      `${API}/api/barbershop/staff/${id}`, data
    ).pipe(
      map(res => ({ ...res, data: res.success ? mapBarberResponse(res.data) : null as any }))
    );
  }

  // ── PATCH /api/barbershop/staff/{id}/status ───────────────
  updateStatus(id: string, status: BarberStatus): Observable<ApiResponse<BarberStaff>> {
    return this.http.patch<ApiResponse<BarberStaffResponse>>(
      `${API}/api/barbershop/staff/${id}/status`, { status }
    ).pipe(
      map(res => ({ ...res, data: res.success ? mapBarberResponse(res.data) : null as any }))
    );
  }

  // ── DELETE /api/barbershop/staff/{id} ─────────────────────
  delete(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${API}/api/barbershop/staff/${id}`);
  }

  // ── POST /api/barbershop/staff/{id}/photo ─────────────────
  uploadPhoto(id: string, file: File): Observable<ApiResponse<BarberStaff>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ApiResponse<BarberStaffResponse>>(
      `${API}/api/barbershop/staff/${id}/photo`, formData
    ).pipe(
      map(res => ({ ...res, data: res.success ? mapBarberResponse(res.data) : null as any }))
    );
  }

  // ── DELETE /api/barbershop/staff/{id}/photo ───────────────
  deletePhoto(id: string): Observable<ApiResponse<BarberStaff>> {
    return this.http.delete<ApiResponse<BarberStaffResponse>>(
      `${API}/api/barbershop/staff/${id}/photo`
    ).pipe(
      map(res => ({ ...res, data: res.success ? mapBarberResponse(res.data) : null as any }))
    );
  }

  // ── GET /api/barbershop/staff/options ─────────────────────
  // Para dropdowns en agenda y ventas
  getOptions(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${API}/api/barbershop/staff/options`);
  }
}