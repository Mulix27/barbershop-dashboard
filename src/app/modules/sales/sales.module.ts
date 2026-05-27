import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { SalesListComponent } from './pages/sale-list/sale-list.component';
import { NewSaleComponent }   from './pages/new-sale/new-sale.component';

// PrimeNG 17
import { ButtonModule }        from 'primeng/button';
import { DialogModule }        from 'primeng/dialog';
import { DropdownModule }      from 'primeng/dropdown';
import { InputTextModule }     from 'primeng/inputtext';
import { InputNumberModule }   from 'primeng/inputnumber';
import { TableModule }         from 'primeng/table';
import { TagModule }           from 'primeng/tag';
import { TooltipModule }       from 'primeng/tooltip';
import { SkeletonModule }      from 'primeng/skeleton';
import { ToastModule }         from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectButtonModule }  from 'primeng/selectbutton';
import { DividerModule }       from 'primeng/divider';
import { CalendarModule }      from 'primeng/calendar';
import { TabViewModule }       from 'primeng/tabview';
import { MessageService, ConfirmationService } from 'primeng/api';

// Chart.js
import { NgChartsModule } from 'ng2-charts';

const routes: Routes = [
  { path: '',       component: SalesListComponent },
  { path: 'new',    component: NewSaleComponent }
];

@NgModule({
  declarations: [SalesListComponent, NewSaleComponent],
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    RouterModule.forChild(routes),
    ButtonModule, DialogModule, DropdownModule,
    InputTextModule, InputNumberModule, TableModule,
    TagModule, TooltipModule, SkeletonModule,
    ToastModule, ConfirmDialogModule, SelectButtonModule,
    DividerModule, CalendarModule, TabViewModule,
    NgChartsModule
  ],
  providers: [MessageService, ConfirmationService]
})
export class SalesModule {}