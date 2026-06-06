import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BarberStaffComponent } from './pages/barber-staff/barber-staff.component';

const routes: Routes = [
  { path: '', component: BarberStaffComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BarberStaffRoutingModule { }