import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiResponse,
  AvailableSlot,
  BackendServiceOption,
  DayAvailabilityResponse,
  PublicBarbershop,
  PublicBookingRequest,
  PublicBookingResponse,
  PublicServiceOption
} from '../models/public-booking.model';

@Injectable({
  providedIn: 'root'
})
export class PublicBookingService {

  private readonly apiUrl = 'http://localhost:8080/api/public/barbershops';

  constructor(private http: HttpClient) { }

  getBarbershop(barbershopId: string): Observable<PublicBarbershop> {
    return this.http
      .get<ApiResponse<PublicBarbershop>>(
        `${this.apiUrl}/${barbershopId}`
      )
      .pipe(
        map((response: ApiResponse<PublicBarbershop>) => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'No se pudo cargar la barbería');
          }

          return response.data;
        })
      );
  }

  getServices(barbershopId: string): Observable<PublicServiceOption[]> {
    return this.http
      .get<ApiResponse<BackendServiceOption[]>>(
        `${this.apiUrl}/${barbershopId}/services`
      )
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            return [];
          }

          return response.data.map(service => ({
            serviceCategoryId: service.categoryId,
            serviceVariantId: service.variantId ?? null,
            displayName: service.displayName,
            description: service.variantName ?? service.categoryName,
            price: Number(service.price),
            durationMin: Number(service.durationMin)
          }));
        })
      );
  }

  getAvailability(
    barbershopId: string,
    date: string,
    service: PublicServiceOption
  ): Observable<AvailableSlot[]> {
    const params = new HttpParams()
      .set('date', date);

    return this.http
      .get<ApiResponse<DayAvailabilityResponse>>(
        `${this.apiUrl}/${barbershopId}/availability`,
        { params }
      )
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            return [];
          }

          return response.data.slots.map(slot => ({
            startTime: slot.startTime.substring(0, 5),
            endTime: slot.endTime.substring(0, 5),
            available: slot.available
          }));
        })
      );
  }

  createBooking(
    barbershopId: string,
    request: PublicBookingRequest
  ): Observable<PublicBookingResponse> {
    return this.http
      .post<ApiResponse<PublicBookingResponse>>(
        `${this.apiUrl}/${barbershopId}/appointments`,
        request
      )
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