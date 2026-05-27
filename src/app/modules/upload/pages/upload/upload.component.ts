import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

type UploadState = 'validating' | 'invalid' | 'expired' | 'ready' | 'uploading' | 'done' | 'error';

interface PendingPhoto {
  file: File;
  preview: string;
  note: string;
}

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent implements OnInit {

  state: UploadState = 'validating';
  token = '';
  errorMsg = '';
  progress = 0;
  uploadedCount = 0;

  pendingPhotos: PendingPhoto[] = [];
  MAX_PHOTOS = 5;

  constructor(
    private route: ActivatedRoute,
    private http:  HttpClient
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.validateToken();
  }

  validateToken(): void {
    this.http.get<any>(`${environment.apiUrl}/api/public/upload/validate/${this.token}`)
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.state = 'ready';
          } else {
            this.state = res.message?.includes('expirado') ? 'expired' : 'invalid';
            this.errorMsg = res.message;
          }
        },
        error: () => { this.state = 'invalid'; }
      });
  }

  onFilesSelected(event: Event): void {
    const input  = event.target as HTMLInputElement;
    const files  = Array.from(input.files ?? []);
    const spaces = this.MAX_PHOTOS - this.pendingPhotos.length;

    files.slice(0, spaces).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader  = new FileReader();
      reader.onload = (e) => {
        this.pendingPhotos.push({
          file,
          preview: e.target?.result as string,
          note: ''
        });
      };
      reader.readAsDataURL(file);
    });

    input.value = '';
  }

  removePhoto(i: number): void {
    this.pendingPhotos.splice(i, 1);
  }

  get canAddMore(): boolean {
    return this.pendingPhotos.length < this.MAX_PHOTOS;
  }

  upload(): void {
    if (this.pendingPhotos.length === 0 || this.state === 'uploading') return;

    this.state    = 'uploading';
    this.progress = 0;

    const formData = new FormData();
    this.pendingPhotos.forEach(p => formData.append('files', p.file));
    const notes = this.pendingPhotos.map(p => p.note).filter(Boolean).join(', ');
    if (notes) formData.append('notes', notes);

    this.http.post<any>(
      `${environment.apiUrl}/api/public/upload/${this.token}`,
      formData
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.uploadedCount = res.data.uploaded;
          this.state         = 'done';
        } else {
          this.state    = 'error';
          this.errorMsg = res.message;
        }
      },
      error: () => {
        this.state    = 'error';
        this.errorMsg = 'Error de conexión. Intenta de nuevo.';
      }
    });
  }

  retry(): void {
    this.state         = 'ready';
    this.pendingPhotos = [];
    this.errorMsg      = '';
  }
}