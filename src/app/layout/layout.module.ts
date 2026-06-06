import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { RoleGuard } from '../core/guards/role.guard';

// PrimeNG
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        loadChildren: () =>
          import('../modules/dashboard/dashboard.module').then(m => m.DashboardModule)
      },

      // Agenda: todos los roles
      {
        path: 'agenda',
        loadChildren: () =>
          import('../modules/agenda/agenda.module').then(m => m.AgendaModule)
      },

      // Clientes: owner, secretary, cashier — barber NO
      {
        path: 'clients',
        canActivate: [RoleGuard],
        data: { roles: ['owner', 'secretary', 'cashier'] },
        loadChildren: () =>
          import('../modules/clients/clients.module').then(m => m.ClientsModule)
      },

      // Ventas: owner, secretary, cashier — barber NO
      {
        path: 'sales',
        canActivate: [RoleGuard],
        data: { roles: ['owner', 'secretary', 'cashier'] },
        loadChildren: () =>
          import('../modules/sales/sales.module').then(m => m.SalesModule)
      },

      // Catálogo: solo owner
      {
        path: 'catalog',
        canActivate: [RoleGuard],
        data: { roles: ['owner'] },
        loadChildren: () =>
          import('../modules/catalog/catalog.module').then(m => m.CatalogModule)
      },

      // Staff: solo owner, y solo si no es singleBarber (lo controla el sidebar)
      {
        path: 'staff',
        canActivate: [RoleGuard],
        data: { roles: ['owner'] },
        loadChildren: () =>
          import('../modules/barber-staff/barber-staff.module').then(m => m.BarberStaffModule)
      },

      // Reportes: owner y secretary
      {
        path: 'reports',
        canActivate: [RoleGuard],
        data: { roles: ['owner', 'secretary'] },
        loadChildren: () =>
          import('../modules/reports/reports.module').then(m => m.ReportsModule)
      }
    ]
  }
];

@NgModule({
  declarations: [LayoutComponent, SidebarComponent, TopbarComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    TooltipModule,
    BadgeModule,
    AvatarModule,
    MenuModule
  ]
})
export class LayoutModule { }