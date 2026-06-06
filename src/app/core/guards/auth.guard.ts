import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard {

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  canActivate(): boolean {
    const token = localStorage.getItem('token');

    if (!token) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    if (this.authService.isTokenExpired()) {
      this.authService.logout();
      return false;
    }

    return true;
  }
}