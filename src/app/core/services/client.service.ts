import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.model';
import { Client, ClientHaircut, HaircutPhoto } from '../models/client.model';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ClientService {

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<Client[]>> {
    return this.http.get<ApiResponse<Client[]>>(`${API}/api/clients`);
  }

  getById(id: string): Observable<ApiResponse<Client>> {
    return this.http.get<ApiResponse<Client>>(`${API}/api/clients/${id}`);
  }

  getByPhone(phone: string): Observable<ApiResponse<Client>> {
    return this.http.get<ApiResponse<Client>>(`${API}/api/clients/phone/${phone}`);
  }

  search(name: string): Observable<ApiResponse<Client[]>> {
    return this.http.get<ApiResponse<Client[]>>(`${API}/api/clients/search`, {
      params: new HttpParams().set('name', name)
    });
  }

  create(data: Partial<Client>): Observable<ApiResponse<Client>> {
    return this.http.post<ApiResponse<Client>>(`${API}/api/clients`, data);
  }

  update(id: string, data: Partial<Client>): Observable<ApiResponse<Client>> {
    return this.http.put<ApiResponse<Client>>(`${API}/api/clients/${id}`, data);
  }

  deactivate(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${API}/api/clients/${id}`);
  }

  addHaircut(clientId: string, data: Partial<ClientHaircut>): Observable<ApiResponse<ClientHaircut>> {
    return this.http.post<ApiResponse<ClientHaircut>>(
      `${API}/api/clients/${clientId}/haircuts`, data
    );
  }

  getPhotos(clientHaircutId: string): Observable<ApiResponse<HaircutPhoto[]>> {
    return this.http.get<ApiResponse<HaircutPhoto[]>>(
      `${API}/api/clients/haircuts/${clientHaircutId}/photos`
    );
  }

  uploadPhoto(haircutId: string, formData: FormData): Observable<ApiResponse<HaircutPhoto>> {
    return this.http.post<ApiResponse<HaircutPhoto>>(
      `${API}/api/clients/haircuts/${haircutId}/photos`,
      formData
    );
  }

  deletePhoto(photoId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${API}/api/clients/haircuts/photos/${photoId}`
    );
  }
}