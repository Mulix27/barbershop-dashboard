import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ApiResponse, Client, ClientHaircut, Sale, SaleRequest,
  HaircutCatalogItem, Product, Appointment, DayAvailability, FullReport
} from '../models/models';
import { environment } from '../../../environments/environment';
 
const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class CatalogService {
  constructor(private http: HttpClient) {}
 
  getAll(): Observable<ApiResponse<HaircutCatalogItem[]>> {
    return this.http.get<ApiResponse<HaircutCatalogItem[]>>(`${API}/api/catalog`);
  }
 
  create(data: Partial<HaircutCatalogItem>): Observable<ApiResponse<HaircutCatalogItem>> {
    return this.http.post<ApiResponse<HaircutCatalogItem>>(`${API}/api/catalog`, data);
  }
 
  update(id: string, data: Partial<HaircutCatalogItem>): Observable<ApiResponse<HaircutCatalogItem>> {
    return this.http.put<ApiResponse<HaircutCatalogItem>>(`${API}/api/catalog/${id}`, data);
  }
 
  toggle(id: string): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${API}/api/catalog/${id}/toggle`, {});
  }
}