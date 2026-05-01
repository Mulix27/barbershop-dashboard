import { Injectable } from '@angular/core';
import {
  HttpRequest, HttpHandler, HttpEvent,
  HttpInterceptor, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('token');

    // Clonar el request agregando el header Authorization
    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Si el token expiró o es inválido → redirigir al login
        if (error.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.router.navigate(['/auth/login']);
        }
        return throwError(() => error);
      })
    );
  }
}