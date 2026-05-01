import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  form!: UntypedFormGroup;
  loading = false;

  constructor(
    private fb: UntypedFormBuilder,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Si ya está logueado, redirigir al dashboard
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [false]
    });

    // Restaurar email si tenía "recordarme"
    const savedEmail = localStorage.getItem('remember_email');
    if (savedEmail) {
      this.form.patchValue({ email: savedEmail, remember: true });
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) return;

    this.loading = true;
    const { email, password, remember } = this.form.value;

    this.authService.login({ email, password }).subscribe({
      next: (res) => {
        if (res.success) {
          if (remember) {
            localStorage.setItem('remember_email', email);
          } else {
            localStorage.removeItem('remember_email');
          }
          this.router.navigate(['/dashboard']);
        } else {
          this.showError(res.message || 'Credenciales inválidas');
          this.loading = false;
        }
      },
      error: () => {
        this.showError('Credenciales inválidas. Verifica tu email y contraseña.');
        this.loading = false;
      }
    });
  }

  private showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 4000
    });
  }

  get emailCtrl() { return this.form.get('email')!; }
  get passwordCtrl() { return this.form.get('password')!; }
}