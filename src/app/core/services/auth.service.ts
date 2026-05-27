import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiResponse, LoginRequest, LoginResponse } from '../models/auth.model';
import { environment } from '../../../environments/environment';


@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = `${environment.apiUrl}/api/auth`;

  constructor(private http: HttpClient, private router: Router) { }

  login(credentials: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(
      `${this.apiUrl}/login`, credentials
    ).pipe(
      tap(res => {
        if (res.success && res.data) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify({
            userId: res.data.userId,
            fullName: res.data.fullName,
            email: res.data.email,
            role: res.data.role,
            barbershopId: res.data.barbershopId,
            barbershopName: res.data.barbershopName,
            logoUrl: res.data.logoUrl,
            singleBarber: res.data.singleBarber
          }));
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/auth/login']);
  }

  getUser(): LoginResponse | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getRole(): string {
    return this.getUser()?.role ?? '';
  }

  getBarbershopId(): string {
    return this.getUser()?.barbershopId ?? '';
  }

  isOwner(): boolean {
    return this.getRole() === 'owner';
  }

  isSingleBarber(): boolean {
    return this.getUser()?.singleBarber ?? false;
  }
}