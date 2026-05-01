import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SaleListComponent } from './pages/sale-list/sale-list.component';
import { NewSaleComponent } from './pages/new-sale/new-sale.component';

const routes: Routes = [
  { path: '', component: SaleListComponent },
  { path: 'new', component: NewSaleComponent }
];

@NgModule({
  declarations: [
    SaleListComponent,
    NewSaleComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class SalesModule {}