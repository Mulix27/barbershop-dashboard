// ════════════════════════════════════════════════════════════════
//  barber-staff.module.ts
// ════════════════════════════════════════════════════════════════
import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { BarberStaffComponent } from './pages/barber-staff/barber-staff.component';
import { MinPipe } from './pipes/min.pipe';   // pipe {{ [a,b] | min }}

// PrimeNG
import { ButtonModule }        from 'primeng/button';
import { DialogModule }        from 'primeng/dialog';
import { InputTextModule }     from 'primeng/inputtext';
import { DropdownModule }      from 'primeng/dropdown';
import { TagModule }           from 'primeng/tag';
import { SkeletonModule }      from 'primeng/skeleton';
import { ToastModule }         from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule }       from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';

const routes: Routes = [
  { path: '', component: BarberStaffComponent }
];

@NgModule({
  declarations: [
    BarberStaffComponent,
    MinPipe,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    ButtonModule, DialogModule, InputTextModule,
    DropdownModule, TagModule, SkeletonModule,
    ToastModule, ConfirmDialogModule, TooltipModule,
  ],
  providers: [MessageService, ConfirmationService]
})
export class BarberStaffModule {}


// ════════════════════════════════════════════════════════════════
//  min.pipe.ts  —  {{ [a, b] | min }}
//  Crea este archivo en  src/app/modules/barber-staff/pipes/min.pipe.ts
// ════════════════════════════════════════════════════════════════
// import { Pipe, PipeTransform } from '@angular/core';
//
// @Pipe({ name: 'min' })
// export class MinPipe implements PipeTransform {
//   transform(value: number[]): number {
//     return Math.min(...value);
//   }
// }