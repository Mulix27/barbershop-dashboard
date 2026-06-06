import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PublicBookingRoutingModule } from './public-booking-routing.module';
import { PublicBookingComponent } from './pages/public-booking/public-booking.component';

@NgModule({
  declarations: [
    PublicBookingComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    PublicBookingRoutingModule
  ]
})
export class PublicBookingModule { }