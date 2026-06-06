import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicBookingComponent } from './pages/public-booking/public-booking.component';

const routes: Routes = [
  {
    path: ':barbershopId',
    component: PublicBookingComponent
  },
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicBookingRoutingModule { }