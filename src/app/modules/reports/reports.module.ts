import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReportsComponent } from './pages/reports/reports.component';

const routes: Routes = [
  { path: '', component: ReportsComponent }
];

@NgModule({
  declarations: [ReportsComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class ReportsModule {}