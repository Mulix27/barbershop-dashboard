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
export class ProductService {
  constructor(private http: HttpClient) {}
 
  getAll(): Observable<ApiResponse<Product[]>> {
    return this.http.get<ApiResponse<Product[]>>(`${API}/api/products`);
  }
 
  create(data: Partial<Product>): Observable<ApiResponse<Product>> {
    return this.http.post<ApiResponse<Product>>(`${API}/api/products`, data);
  }
 
  update(id: string, data: Partial<Product>): Observable<ApiResponse<Product>> {
    return this.http.put<ApiResponse<Product>>(`${API}/api/products/${id}`, data);
  }
 
  adjustStock(id: string, quantity: number): Observable<ApiResponse<Product>> {
    return this.http.patch<ApiResponse<Product>>(
      `${API}/api/products/${id}/stock`, null,
      { params: new HttpParams().set('quantity', quantity) }
    );
  }
}
 