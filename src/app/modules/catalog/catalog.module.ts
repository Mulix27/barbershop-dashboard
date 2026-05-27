import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { CatalogListComponent } from './pages/catalog-list/catalog-list.component';

// PrimeNG 17
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TableModule } from 'primeng/table';
import { SliderModule } from 'primeng/slider';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ServiceFormComponent } from './pages/service-form/service-form.component';

const routes: Routes = [
  { path: '', component: CatalogListComponent }
];

@NgModule({
  declarations: [CatalogListComponent, ServiceFormComponent],
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    RouterModule.forChild(routes),
    ButtonModule, DialogModule, InputTextModule,
    InputNumberModule, DropdownModule, TagModule,
    TooltipModule, SkeletonModule, ToastModule,
    ConfirmDialogModule, TableModule, SliderModule,
    BadgeModule, DividerModule,
  ],
  providers: [MessageService, ConfirmationService]
})
export class CatalogModule { }