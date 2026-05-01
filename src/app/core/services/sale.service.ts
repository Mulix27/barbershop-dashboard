import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.model';
import { Sale, SaleRequest } from '../models/sale.model';
import { environment } from '../../../environments/environment';
 
const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class SaleService {
  constructor(private http: HttpClient) {}
 
  getAll(): Observable<ApiResponse<Sale[]>> {
    return this.http.get<ApiResponse<Sale[]>>(`${API}/api/sales`);
  }
 
  getById(id: string): Observable<ApiResponse<Sale>> {
    return this.http.get<ApiResponse<Sale>>(`${API}/api/sales/${id}`);
  }
 
  getByDateRange(from: string, to: string): Observable<ApiResponse<Sale[]>> {
    return this.http.get<ApiResponse<Sale[]>>(`${API}/api/sales/range`, {
      params: new HttpParams().set('from', from).set('to', to)
    });
  }
 
  getByClient(clientId: string): Observable<ApiResponse<Sale[]>> {
    return this.http.get<ApiResponse<Sale[]>>(`${API}/api/sales/client/${clientId}`);
  }
 
  create(data: SaleRequest): Observable<ApiResponse<Sale>> {
    return this.http.post<ApiResponse<Sale>>(`${API}/api/sales`, data);
  }
 
  cancel(id: string): Observable<ApiResponse<Sale>> {
    return this.http.patch<ApiResponse<Sale>>(`${API}/api/sales/${id}/cancel`, {});
  }
}