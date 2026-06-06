import { Injectable } from '@angular/core';
import {
  HttpRequest, HttpHandler, HttpEvent,
  HttpInterceptor, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private router: Router,
    private messageService: MessageService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('token');

    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {

        if (error.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');

          try {
            this.messageService.add({
              severity: 'warn',
              summary:  'Sesión expirada',
              detail:   'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
              life:     4000
            });
          } catch { /* MessageService puede no estar disponible en todas las rutas */ }

          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 1500);
        }

        return throwError(() => error);
      })
    );
  }
}