import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ReportsComponent } from './pages/reports/reports.component';

// PrimeNG 17
import { ButtonModule }       from 'primeng/button';
import { CalendarModule }     from 'primeng/calendar';
import { DropdownModule }     from 'primeng/dropdown';
import { SkeletonModule }     from 'primeng/skeleton';
import { ToastModule }        from 'primeng/toast';
import { TableModule }        from 'primeng/table';
import { TagModule }          from 'primeng/tag';
import { TooltipModule }      from 'primeng/tooltip';
import { DividerModule }      from 'primeng/divider';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageService }     from 'primeng/api';

// Chart.js
import { NgChartsModule } from 'ng2-charts';

const routes: Routes = [
  { path: '', component: ReportsComponent }
];

@NgModule({
  declarations: [ReportsComponent],
  imports: [
    CommonModule, FormsModule,
    RouterModule.forChild(routes),
    ButtonModule, CalendarModule, DropdownModule,
    SkeletonModule, ToastModule, TableModule,
    TagModule, TooltipModule, DividerModule,
    SelectButtonModule, NgChartsModule
  ],
  providers: [MessageService]
})
export class ReportsModule {}