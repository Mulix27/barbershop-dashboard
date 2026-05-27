import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';

// PrimeNG
import { ButtonModule }       from 'primeng/button';
import { SkeletonModule }     from 'primeng/skeleton';
import { TagModule }          from 'primeng/tag';
import { AvatarModule }       from 'primeng/avatar';
import { TooltipModule }      from 'primeng/tooltip';
import { MenuModule }         from 'primeng/menu';

// Chart.js
import { NgChartsModule  }     from 'ng2-charts';

const routes: Routes = [
  { path: '', component: HomeComponent }
];

@NgModule({
  declarations: [HomeComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ButtonModule,
    SkeletonModule,
    TagModule,
    AvatarModule,
    TooltipModule,
    MenuModule,
    NgChartsModule
  ]
})
export class DashboardModule {}