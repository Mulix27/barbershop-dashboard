import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PublicBookingService {

  private readonly apiUrl = `${environment.apiUrl}/api/public/barbershops`;

  constructor(private http: HttpClient) { }

  getBarbershop(barbershopId: string): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/${barbershopId}`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'No se pudo cargar la barbería');
          }

          return response.data;
        })
      );
  }

  getServices(barbershopId: string): Observable<any[]> {
    return this.http
      .get<any>(`${this.apiUrl}/${barbershopId}/services`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            return [];
          }

          return response.data.map((service: any) => ({
            serviceCategoryId: service.categoryId,
            serviceVariantId: service.variantId || null,
            displayName: service.displayName,
            description: service.variantName || service.categoryName,
            price: Number(service.price),
            durationMin: Number(service.durationMin)
          }));
        })
      );
  }

  getAvailability(
    barbershopId: string,
    date: string,
    service: any
  ): Observable<any[]> {
    const params = new HttpParams()
      .set('date', date)
      .set('durationMin', String(service.durationMin));

    return this.http
      .get<any>(`${this.apiUrl}/${barbershopId}/availability`, { params })
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            return [];
          }

          return response.data.slots.map((slot: any) => ({
            startTime: slot.startTime.substring(0, 5),
            endTime: slot.endTime.substring(0, 5),
            available: slot.available
          }));
        })
      );
  }

  createBooking(barbershopId: string, request: any): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/${barbershopId}/appointments`, request)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'No se pudo crear la reserva');
          }

          return response.data;
        })
      );
  }
}