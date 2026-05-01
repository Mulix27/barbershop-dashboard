import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.model';
import { FullReport } from '../models/report.model';
import { environment } from '../../../environments/environment';
 
const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ReportService {
  constructor(private http: HttpClient) {}
 
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
}