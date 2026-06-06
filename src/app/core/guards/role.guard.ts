import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class RoleGuard {

  constructor(private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const allowedRoles: string[] = route.data['roles'] ?? [];
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role: string = user.role ?? '';

    if (allowedRoles.includes(role)) return true;

    // Redirigir a la primera ruta que el rol sí puede ver
    const fallback = this.getFallbackRoute(role);
    this.router.navigate([fallback]);
    return false;
  }

  private getFallbackRoute(role: string): string {
    switch (role) {
      case 'barber': return '/agenda';     // barber siempre va a su agenda
      case 'cashier': return '/sales';      // cashier va a ventas
      case 'secretary': return '/agenda';     // secretary va a agenda
      default: return '/dashboard';
    }
  }
}