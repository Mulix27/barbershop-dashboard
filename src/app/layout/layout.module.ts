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
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('../modules/dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'clients',
        loadChildren: () =>
          import('../modules/clients/clients.module').then(m => m.ClientsModule)
      },
      {
        path: 'sales',
        loadChildren: () =>
          import('../modules/sales/sales.module').then(m => m.SalesModule)
      },
      {
        path: 'agenda',
        loadChildren: () =>
          import('../modules/agenda/agenda.module').then(m => m.AgendaModule)
      },
      {
        path: 'catalog',
        canActivate: [RoleGuard],
        data: { roles: ['owner'] },
        loadChildren: () =>
          import('../modules/catalog/catalog.module').then(m => m.CatalogModule)
      },
      {
        path: 'reports',
        canActivate: [RoleGuard],
        data: { roles: ['owner'] },
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
export class LayoutModule {}