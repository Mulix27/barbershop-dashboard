// shared.module.ts
import { NgModule } from '@angular/core';
import { QrDialogComponent } from './components/qr-dialog/qr-dialog.component';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [QrDialogComponent],
  exports:      [QrDialogComponent],
  imports:      [CommonModule]
})
export class SharedModule {}