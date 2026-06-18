import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.model';
import { Product } from '../models/catalog.model';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

export type StockMovementType =
  | 'initial_stock'
  | 'sale'
  | 'manual_in'
  | 'manual_out'
  | 'correction'
  | 'sale_cancel_return';

export interface StockMovementResponse {
  id: string;
  productId: string;
  productName: string;
  saleId?: string | null;
  movementType: StockMovementType;
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  reason?: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private http: HttpClient) { }

  getAll(): Observable<ApiResponse<Product[]>> {
    return this.http.get<ApiResponse<Product[]>>(`${API}/api/products`);
  }

  create(data: Partial<Product>, file?: File): Observable<ApiResponse<Product>> {
    const formData = new FormData();

    formData.append(
      'product',
      new Blob([JSON.stringify(data)], { type: 'application/json' })
    );

    if (file) {
      formData.append('file', file);
    }

    return this.http.post<ApiResponse<Product>>(
      `${API}/api/products`,
      formData
    );
  }

  update(id: string, data: Partial<Product>): Observable<ApiResponse<Product>> {
    return this.http.put<ApiResponse<Product>>(`${API}/api/products/${id}`, data);
  }

  adjustStock(id: string, quantity: number, reason?: string | null): Observable<ApiResponse<Product>> {
    let params = new HttpParams().set('quantity', quantity);

    if (reason && reason.trim()) {
      params = params.set('reason', reason.trim());
    }

    return this.http.patch<ApiResponse<Product>>(
      `${API}/api/products/${id}/stock`,
      null,
      { params }
    );
  }

  getRecentStockMovements(
    type: StockMovementType | 'all' = 'all',
    limit = 30
  ): Observable<ApiResponse<StockMovementResponse[]>> {
    const params = new HttpParams()
      .set('type', type)
      .set('limit', limit);

    return this.http.get<ApiResponse<StockMovementResponse[]>>(
      `${API}/api/products/stock-movements/recent`,
      { params }
    );
  }

  getStockMovements(id: string): Observable<ApiResponse<StockMovementResponse[]>> {
    return this.http.get<ApiResponse<StockMovementResponse[]>>(
      `${API}/api/products/${id}/stock-movements`
    );
  }

  toggle(id: string): Observable<ApiResponse<Product>> {
    return this.http.patch<ApiResponse<Product>>(
      `${API}/api/products/${id}/toggle`,
      {}
    );
  }

  uploadImage(id: string, file: File): Observable<ApiResponse<Product>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.patch<ApiResponse<Product>>(
      `${API}/api/products/${id}/image`,
      formData
    );
  }
}