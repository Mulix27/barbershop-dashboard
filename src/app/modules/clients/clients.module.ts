import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { ClientListComponent }   from './pages/client-list/client-list.component';
import { ClientDetailComponent } from './pages/client-detail/client-detail.component';

// PrimeNG 12
import { InputTextModule }    from 'primeng/inputtext';
import { ButtonModule }       from 'primeng/button';
import { DialogModule }       from 'primeng/dialog';
import { TableModule }        from 'primeng/table';
import { TagModule }          from 'primeng/tag';
import { AvatarModule }       from 'primeng/avatar';
import { TooltipModule }      from 'primeng/tooltip';
import { SkeletonModule }     from 'primeng/skeleton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabViewModule }      from 'primeng/tabview';
import { GalleriaModule }     from 'primeng/galleria';
import { FileUploadModule }   from 'primeng/fileupload';
import { DropdownModule }     from 'primeng/dropdown';
import { ToastModule }        from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { SharedModule } from 'src/app/shared/shared.module';

const routes: Routes = [
  { path: '',    component: ClientListComponent },
  { path: ':id', component: ClientDetailComponent }
];

@NgModule({
  declarations: [ClientListComponent, ClientDetailComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    InputTextModule,
    ButtonModule,
    DialogModule,
    TableModule,
    TagModule,
    AvatarModule,
    TooltipModule,
    SkeletonModule,
    ConfirmDialogModule,
    TabViewModule,
    GalleriaModule,
    FileUploadModule,
    DropdownModule,
    InputTextareaModule,
    ToastModule,
    SharedModule   
  ],
  providers: [MessageService, ConfirmationService]
})
export class ClientsModule {}