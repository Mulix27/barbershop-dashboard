import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

// Importa qrcode — asegúrate de tener: npm install qrcode @types/qrcode
declare const QRCode: any;

@Component({
  selector: 'app-qr-dialog',
  templateUrl: './qr-dialog.component.html',
  styleUrls: ['./qr-dialog.component.scss']
})
export class QrDialogComponent implements OnInit, OnDestroy {

  @Input() type: 'photo' | 'agenda' = 'photo';
  @Input() clientHaircutId = '';

  @ViewChild('qrCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  loading  = true;
  error    = false;
  qrUrl    = '';
  copied   = false;
  timeLeft = 0;
  private timerInterval: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.generate();
  }

  ngOnDestroy(): void {
    clearInterval(this.timerInterval);
  }

  generate(): void {
    this.loading  = true;
    this.error    = false;
    this.timeLeft = 0;
    clearInterval(this.timerInterval);

    const endpoint = this.type === 'photo'
      ? `/api/qr/photo/${this.clientHaircutId}`
      : `/api/qr/agenda`;

    this.http.post<any>(`${environment.apiUrl}${endpoint}`, {}).subscribe({
      next: (res) => {
        if (res.success || res.data) {
          this.qrUrl    = res.data?.url ?? res.url ?? '';
          const minutes = parseInt(res.data?.expiresInMin ?? '15', 10);
          this.timeLeft = minutes * 60;

          // Dibujar QR después de que el canvas esté disponible
          setTimeout(() => this.drawQr(), 150);

          // Countdown
          this.timerInterval = setInterval(() => {
            this.timeLeft = Math.max(0, this.timeLeft - 1);
            if (this.timeLeft === 0) clearInterval(this.timerInterval);
          }, 1000);
        } else {
          this.error = true;
        }
        this.loading = false;
      },
      error: () => {
        this.error   = true;
        this.loading = false;
      }
    });
  }

  private drawQr(): void {
  if (!this.canvasRef?.nativeElement || !this.qrUrl) return;

  import('qrcode').then((QRCodeLib) => {
    QRCodeLib.toCanvas(
      this.canvasRef.nativeElement,
      this.qrUrl,
      {
        width: 220,
        margin: 1,
        color: { dark: '#0D0D14', light: '#FFFFFF' },
        errorCorrectionLevel: 'H'
      },
      (err: any) => {
        if (err) console.error('QR error:', err);
      }
    );
  }).catch(() => {
    console.warn('Instala qrcode: npm install qrcode @types/qrcode');
  });
}

  copyUrl(): void {
    if (!this.qrUrl) return;
    navigator.clipboard.writeText(this.qrUrl).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    });
  }

  get formattedTime(): string {
    const m = Math.floor(this.timeLeft / 60);
    const s = this.timeLeft % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  get isExpiring(): boolean {
    return this.timeLeft > 0 && this.timeLeft < 120;
  }

  get isExpired(): boolean {
    return this.timeLeft === 0 && !this.loading && !this.error;
  }

  get shortUrl(): string {
    if (!this.qrUrl) return '';
    return this.qrUrl.length > 42
      ? this.qrUrl.substring(0, 39) + '...'
      : this.qrUrl;
  }
}