import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  // Ruta pública — login
  {
    path: 'auth',
    loadChildren: () =>
      import('./modules/auth/auth.module').then(m => m.AuthModule)
  },

  // Rutas protegidas — requieren token JWT
  {
    path: '',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./layout/layout.module').then(m => m.LayoutModule)
  },

  // Fallback
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}