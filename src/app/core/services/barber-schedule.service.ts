import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';

const API = environment.apiUrl;

export interface BarberScheduleRequest {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
}

export interface BarberScheduleResponse {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class BarberScheduleService {
  constructor(private http: HttpClient) {}

  getSchedules(userId: string): Observable<ApiResponse<BarberScheduleResponse[]>> {
    return this.http.get<ApiResponse<BarberScheduleResponse[]>>(
      `${API}/api/barbers/${userId}/schedule`
    );
  }

  saveSchedule(
    userId: string,
    body: BarberScheduleRequest
  ): Observable<ApiResponse<BarberScheduleResponse>> {
    return this.http.post<ApiResponse<BarberScheduleResponse>>(
      `${API}/api/barbers/${userId}/schedule`,
      body
    );
  }
}