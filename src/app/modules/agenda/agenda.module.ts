import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { AgendaComponent } from './pages/agenda/agenda.component';

const routes: Routes = [
  {
    path: '',
    component: AgendaComponent
  }
];

@NgModule({
  declarations: [AgendaComponent, AgendaComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class AgendaModule {}