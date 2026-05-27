import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { AgendaComponent } from './pages/agenda/agenda.component';

// PrimeNG 17
import { ButtonModule }        from 'primeng/button';
import { DialogModule }        from 'primeng/dialog';
import { DropdownModule }      from 'primeng/dropdown';
import { CalendarModule }      from 'primeng/calendar';
import { TagModule }           from 'primeng/tag';
import { TooltipModule }       from 'primeng/tooltip';
import { SkeletonModule }      from 'primeng/skeleton';
import { ToastModule }         from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule }     from 'primeng/inputtext';
import { SelectButtonModule }  from 'primeng/selectbutton';
import { BadgeModule }         from 'primeng/badge';
import { OverlayPanelModule }  from 'primeng/overlaypanel';
import { MessageService, ConfirmationService } from 'primeng/api';

const routes: Routes = [
  { path: '', component: AgendaComponent }
];

@NgModule({
  declarations: [AgendaComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    ButtonModule,
    DialogModule,
    DropdownModule,
    CalendarModule,
    TagModule,
    TooltipModule,
    SkeletonModule,
    ToastModule,
    ConfirmDialogModule,
    InputTextModule,
    SelectButtonModule,
    BadgeModule,
    OverlayPanelModule
  ],
  providers: [MessageService, ConfirmationService]
})
export class AgendaModule {}