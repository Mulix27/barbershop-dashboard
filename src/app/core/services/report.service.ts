import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.model';
import { FullReport } from '../models/report.model';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

export interface PdfReportRequest {
  period: 'today' | 'week' | 'month' | 'custom';
  from?: string;   // "2026-05-01"
  to?: string;   // "2026-05-31"
}

export interface PdfReportResponse {
  base64: string;
  fileName: string;
  period: string;
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  constructor(private http: HttpClient) { }

  getFullReport(from: string, to: string): Observable<ApiResponse<FullReport>> {
    return this.http.get<ApiResponse<FullReport>>(`${API}/api/reports/full`, {
      params: new HttpParams().set('from', from).set('to', to)
    });
  }

  getToday(): Observable<ApiResponse<FullReport>> {
    return this.http.get<ApiResponse<FullReport>>(`${API}/api/reports/today`);
  }

  getThisWeek(): Observable<ApiResponse<FullReport>> {
    return this.http.get<ApiResponse<FullReport>>(`${API}/api/reports/this-week`);
  }

  getThisMonth(): Observable<ApiResponse<FullReport>> {
    return this.http.get<ApiResponse<FullReport>>(`${API}/api/reports/this-month`);
  }

  getReport(period: string, from?: string, to?: string): Observable<ApiResponse<any>> {
    let url = `${API}/api/reports?period=${period}`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;
    return this.http.get<ApiResponse<any>>(url);
  }

  // ── NUEVO: generar PDF y retornar Base64 ──────────────────

  generatePdf(req: PdfReportRequest): Observable<ApiResponse<PdfReportResponse>> {
    return this.http.post<ApiResponse<PdfReportResponse>>(
      `${API}/api/reports/pdf`, req
    );
  }

  // ── Helper: convierte Base64 a descarga de archivo ────────

  downloadFromBase64(base64: string, fileName: string): void {
    // 1. Decodificar Base64 → bytes
    const byteChars = atob(base64);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }

    // 2. Crear Blob con tipo PDF
    const blob = new Blob(
      [new Uint8Array(byteNums)],
      { type: 'application/pdf' }
    );

    // 3. Crear URL temporal y disparar descarga
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();

    // 4. Limpiar URL temporal
    window.URL.revokeObjectURL(url);
  }
}