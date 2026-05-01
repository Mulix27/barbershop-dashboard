import { Injectable } from '@angular/core';
import {
  CanActivate, ActivatedRouteSnapshot, Router
} from '@angular/router';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const allowedRoles: string[] = route.data['roles'] ?? [];
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (allowedRoles.includes(user.role)) return true;

    // Sin permisos → redirigir al dashboard
    this.router.navigate(['/']);
    return false;
  }
}