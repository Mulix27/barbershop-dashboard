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

  constructor(private http: HttpClient, private router: Router) {
    // Al arrancar la app verificar si el token ya expiró
    this.checkTokenOnInit();
  }

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

          // Programar logout automático cuando expire el token
          this.scheduleAutoLogout();
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/auth/login']);
  }

  // ── Verificar si el token JWT está expirado ────────────────
  isTokenExpired(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return true;

    try {
      // El JWT tiene 3 partes separadas por "."
      // La parte del medio (payload) está en Base64
      const payload = JSON.parse(atob(token.split('.')[1]));

      // "exp" es la fecha de expiración en segundos Unix
      const expiresAt = payload.exp * 1000; // convertir a ms
      return Date.now() > expiresAt;
    } catch {
      // Si el token está malformado → tratar como expirado
      return true;
    }
  }

  // ── Cuántos ms faltan para que expire el token ─────────────
  getTokenExpiresIn(): number {
    const token = localStorage.getItem('token');
    if (!token) return 0;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      return Math.max(0, expiresAt - Date.now());
    } catch {
      return 0;
    }
  }

  // ── Programar logout automático cuando expire ──────────────
  private logoutTimer: any = null;

  scheduleAutoLogout(): void {
    // Cancelar timer anterior si existe
    if (this.logoutTimer) clearTimeout(this.logoutTimer);

    const expiresIn = this.getTokenExpiresIn();
    if (expiresIn <= 0) {
      this.logout();
      return;
    }

    console.log(`Token expira en ${Math.round(expiresIn / 1000 / 60)} minutos`);

    this.logoutTimer = setTimeout(() => {
      this.logout();
    }, expiresIn);
  }

  // ── Verificar al iniciar la app ────────────────────────────
  private checkTokenOnInit(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (this.isTokenExpired()) {
      // Token expirado mientras la app estaba cerrada
      this.logout();
    } else {
      // Token válido → programar el logout automático
      this.scheduleAutoLogout();
    }
  }

  // ── Resto de métodos sin cambios ───────────────────────────

  getUser(): LoginResponse | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token') && !this.isTokenExpired();
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

  isBarber(): boolean {
    return this.getRole() === 'barber';
  }

  isSecretary(): boolean {
    return this.getRole() === 'secretary';
  }

  isCashier(): boolean {
    return this.getRole() === 'cashier';
  }

  canManageAppointments(): boolean {
    return ['owner', 'secretary'].includes(this.getRole());
  }

  canViewAllAppointments(): boolean {
    return ['owner', 'secretary', 'cashier'].includes(this.getRole());
  }
}