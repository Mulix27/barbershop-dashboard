import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { CatalogListComponent } from './pages/catalog-list/catalog-list.component';
import { CatalogFormComponent } from './pages/catalog-form/catalog-form.component';

const routes: Routes = [
  {
    path: '',
    component: CatalogListComponent
  },
  {
    path: 'new',
    component: CatalogFormComponent
  },
  {
    path: ':id/edit',
    component: CatalogFormComponent
  }
];

@NgModule({
  declarations: [
    CatalogListComponent,
    CatalogFormComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class CatalogModule {}