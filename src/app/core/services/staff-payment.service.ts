import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';

import {
    CancelStaffPaymentRequest,
    GenerateStaffPaymentPeriodRequest,
    RegisterStaffPaymentRequest,
    StaffPaymentCardSummaryResponse,
    StaffPaymentConfigRequest,
    StaffPaymentConfigResponse,
    StaffPaymentHistoryFilters,
    StaffPaymentHistoryResponse,
    StaffPaymentPeriodResponse,
    StaffPaymentPeriodSaleResponse,
    StaffPaymentResponse,
    StaffPaymentSummaryResponse
} from '../models/staff-payment.model';

const API = environment.apiUrl;

@Injectable({
    providedIn: 'root'
})
export class StaffPaymentService {

    private readonly baseUrl = `${API}/api/staff`;

    constructor(private http: HttpClient) { }

    getConfig(userId: string): Observable<ApiResponse<StaffPaymentConfigResponse | null>> {
        return this.http.get<ApiResponse<StaffPaymentConfigResponse | null>>(
            `${this.baseUrl}/${userId}/payment-config`
        );
    }

    saveConfig(
        userId: string,
        request: StaffPaymentConfigRequest
    ): Observable<ApiResponse<StaffPaymentConfigResponse>> {
        return this.http.post<ApiResponse<StaffPaymentConfigResponse>>(
            `${this.baseUrl}/${userId}/payment-config`,
            request
        );
    }

    updateConfig(
        userId: string,
        request: StaffPaymentConfigRequest
    ): Observable<ApiResponse<StaffPaymentConfigResponse>> {
        return this.http.put<ApiResponse<StaffPaymentConfigResponse>>(
            `${this.baseUrl}/${userId}/payment-config`,
            request
        );
    }

    getPeriods(userId: string): Observable<ApiResponse<StaffPaymentPeriodResponse[]>> {
        return this.http.get<ApiResponse<StaffPaymentPeriodResponse[]>>(
            `${this.baseUrl}/${userId}/payment-periods`
        );
    }

    generatePeriod(
        userId: string,
        request: GenerateStaffPaymentPeriodRequest
    ): Observable<ApiResponse<StaffPaymentPeriodResponse>> {
        return this.http.post<ApiResponse<StaffPaymentPeriodResponse>>(
            `${this.baseUrl}/${userId}/payment-periods/generate`,
            request
        );
    }

    closePeriod(periodId: string): Observable<ApiResponse<StaffPaymentPeriodResponse>> {
        return this.http.post<ApiResponse<StaffPaymentPeriodResponse>>(
            `${this.baseUrl}/payment-periods/${periodId}/close`,
            {}
        );
    }

    registerPayment(
        periodId: string,
        request: RegisterStaffPaymentRequest
    ): Observable<ApiResponse<StaffPaymentResponse>> {
        return this.http.post<ApiResponse<StaffPaymentResponse>>(
            `${this.baseUrl}/payment-periods/${periodId}/pay`,
            request
        );
    }

    getPaymentsByPeriod(periodId: string): Observable<ApiResponse<StaffPaymentResponse[]>> {
        return this.http.get<ApiResponse<StaffPaymentResponse[]>>(
            `${this.baseUrl}/payment-periods/${periodId}/payments`
        );
    }

    getSummary(): Observable<ApiResponse<StaffPaymentSummaryResponse>> {
        return this.http.get<ApiResponse<StaffPaymentSummaryResponse>>(
            `${this.baseUrl}/payment-summary`
        );
    }

    getCardSummaries(): Observable<ApiResponse<StaffPaymentCardSummaryResponse[]>> {
        return this.http.get<ApiResponse<StaffPaymentCardSummaryResponse[]>>(
            `${this.baseUrl}/payment-card-summaries`
        );
    }

    getPaymentHistory(
        filters?: StaffPaymentHistoryFilters
    ): Observable<ApiResponse<StaffPaymentHistoryResponse[]>> {
        let params = new HttpParams();

        if (filters?.userId) {
            params = params.set('userId', filters.userId);
        }

        if (filters?.startDate) {
            params = params.set('startDate', filters.startDate);
        }

        if (filters?.endDate) {
            params = params.set('endDate', filters.endDate);
        }

        if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
            params = params.set('paymentMethod', filters.paymentMethod);
        }

        return this.http.get<ApiResponse<StaffPaymentHistoryResponse[]>>(
            `${this.baseUrl}/payments/history`,
            { params }
        );
    }

    getSalesByPeriod(periodId: string): Observable<ApiResponse<StaffPaymentPeriodSaleResponse[]>> {
        return this.http.get<ApiResponse<StaffPaymentPeriodSaleResponse[]>>(
            `${API}/api/staff/payment-periods/${periodId}/sales`
        );
    }

    cancelPayment(
        paymentId: string,
        request: CancelStaffPaymentRequest
    ): Observable<ApiResponse<StaffPaymentResponse>> {
        return this.http.post<ApiResponse<StaffPaymentResponse>>(
            `${this.baseUrl}/payments/${paymentId}/cancel`,
            request
        );
    }

    generateCurrentPeriod(userId: string): Observable<ApiResponse<StaffPaymentPeriodResponse>> {
        return this.http.post<ApiResponse<StaffPaymentPeriodResponse>>(
            `${this.baseUrl}/${userId}/payment-periods/current`,
            {}
        );
    }

    deletePeriod(periodId: string): Observable<ApiResponse<boolean>> {
        return this.http.delete<ApiResponse<boolean>>(
            `${API}/api/staff/payment-periods/${periodId}`
        );
    }
}