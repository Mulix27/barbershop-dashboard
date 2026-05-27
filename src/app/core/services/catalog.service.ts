import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';

const API = environment.apiUrl;

// ── Modelos ───────────────────────────────────────────────────

export interface ServiceVariantResponse {
  id:          string;
  name:        string;
  description: string | null;
  price:       number;
  durationMin: number;
  sortOrder:   number;
  isActive:    boolean;
  createdAt:   string;
}

export interface ServiceCategoryResponse {
  id:           string;
  name:         string;
  icon:         string;
  pricingMode:  'fixed' | 'variants';
  basePrice:    number | null;
  baseDuration: number | null;
  sortOrder:    number;
  isActive:     boolean;
  createdAt:    string;
  variants:     ServiceVariantResponse[];
}

export interface ServiceSelectOption {
  categoryId:   string;
  categoryName: string;
  categoryIcon: string;
  pricingMode:  string;
  variantId:    string | null;
  variantName:  string | null;
  price:        number;
  durationMin:  number;
  displayName:  string;
}

export interface ServiceCategoryRequest {
  name:         string;
  icon?:        string;
  pricingMode:  'fixed' | 'variants';
  basePrice?:   number | null;
  baseDuration?: number | null;
  sortOrder?:   number;
  variants?:    {
    id?:         string;
    name:        string;
    description?: string;
    price:       number;
    durationMin: number;
    sortOrder?:  number;
    isActive?:   boolean;
  }[];
}

// ── Service ───────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CatalogService {

  constructor(private http: HttpClient) {}

  // ── Categorías (nuevo modelo) ─────────────────────────────

  getCategories(onlyActive = true): Observable<ApiResponse<ServiceCategoryResponse[]>> {
    return this.http.get<ApiResponse<ServiceCategoryResponse[]>>(
      `${API}/api/catalog/categories`,
      { params: new HttpParams().set('onlyActive', String(onlyActive)) }
    );
  }

  // Lista aplanada para selectores en ventas y citas
  getSelectOptions(): Observable<ApiResponse<ServiceSelectOption[]>> {
    return this.http.get<ApiResponse<ServiceSelectOption[]>>(
      `${API}/api/catalog/categories/options`
    );
  }

  createCategory(data: ServiceCategoryRequest): Observable<ApiResponse<ServiceCategoryResponse>> {
    return this.http.post<ApiResponse<ServiceCategoryResponse>>(
      `${API}/api/catalog/categories`, data
    );
  }

  updateCategory(id: string, data: ServiceCategoryRequest): Observable<ApiResponse<ServiceCategoryResponse>> {
    return this.http.put<ApiResponse<ServiceCategoryResponse>>(
      `${API}/api/catalog/categories/${id}`, data
    );
  }

  toggleCategory(id: string): Observable<ApiResponse<ServiceCategoryResponse>> {
    return this.http.patch<ApiResponse<ServiceCategoryResponse>>(
      `${API}/api/catalog/categories/${id}/toggle`, {}
    );
  }

  deleteCategory(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${API}/api/catalog/categories/${id}`
    );
  }

  // ── Métodos legacy (para compatibilidad con código existente) ──

  getAll(): Observable<ApiResponse<any[]>> {
    return this.getCategories() as any;
  }

  create(data: any): Observable<ApiResponse<any>> {
    return this.createCategory(data);
  }

  update(id: string, data: any): Observable<ApiResponse<any>> {
    return this.updateCategory(id, data);
  }

  toggle(id: string): Observable<ApiResponse<any>> {
    return this.toggleCategory(id);
  }
}