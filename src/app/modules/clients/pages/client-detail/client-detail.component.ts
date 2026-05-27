import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';

import { ClientService } from '../../../../core/services/client.service';
import { SaleService } from '../../../../core/services/sale.service';
import { Client, ClientHaircut, HaircutPhoto } from '../../../../core/models/client.model';
import { Sale } from '../../../../core/models/sale.model';
import { ApiResponse } from '../../../../core/models/auth.model';

@Component({
  selector: 'app-client-detail',
  templateUrl: './client-detail.component.html',
  styleUrls: ['./client-detail.component.scss']
})
export class ClientDetailComponent implements OnInit {

  // ── Estado ────────────────────────────────────────────────
  loading = true;
  clientId = '';

  // ── Datos ──────────────────────────────────────────────────
  client: Client | null = null;
  sales: Sale[] = [];
  selectedHaircut: ClientHaircut | null = null;
  visiblePhotos = 8;

  // ── Tabs ──────────────────────────────────────────────────
  activeSection = 'history';

  // ── Dialogs ───────────────────────────────────────────────
  showEditClient = false;
  showAddHaircut = false;
  showUploadPhoto = false;
  showPhotoViewer = false;
  saving = false;

  viewerPhoto: HaircutPhoto | null = null;
  viewerHaircut: ClientHaircut | null = null;

  // ── Upload ─────────────────────────────────────────────────
  uploadFile: File | null = null;
  uploadPreview: string | null = null;
  uploadNotes = '';
  uploading = false;
  showQrCode = false;

  pendingPhotos: { file: File; preview: string; notes: string }[] = [];
  uploadingAll = false;
  uploadProgress = 0;

  // ── Formularios ───────────────────────────────────────────
  editForm!: FormGroup;
  haircutForm!: FormGroup;

  serviceTypeOptions = [
    { label: 'Cabello', value: 'hair' },
    { label: 'Barba', value: 'beard' },
    { label: 'Combo', value: 'combo' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientService: ClientService,
    private saleService: SaleService,
    private fb: FormBuilder,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id') ?? '';
    this.buildForms();
    this.loadData();
  }

  buildForms(): void {
    this.editForm = this.fb.group({
      fullName: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', Validators.email],
      birthDate: [''],
      notes: ['']
    });

    this.haircutForm = this.fb.group({
      type: ['hair', Validators.required],
      name: ['', Validators.required],
      description: [''],
      isPreferred: [false]
    });
  }

  // ── Carga de datos ────────────────────────────────────────

  loadData(): void {
  this.loading = true;
 
  forkJoin({
    client: this.clientService.getById(this.clientId),
    sales:  this.saleService.getByClient(this.clientId)
  }).subscribe({
    next: ({ client, sales }) => {
      this.client = client.success ? client.data : null;
      this.sales  = sales.success  ? sales.data  : [];
      this.loading = false;
    },
    error: () => {
      this.client  = null;
      this.sales   = [];
      this.loading = false;
    }
  });
}

  // ── Métricas ──────────────────────────────────────────────

  get totalVisits(): number {
    return this.sales.filter(s => s.status === 'completed').length;
  }

  get totalSpent(): number {
    return this.sales
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + Number(s.total), 0);
  }

  get lastVisit(): string {
    const done = this.sales
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return done.length ? this.timeAgo(done[0].createdAt) : 'Sin visitas';
  }

  get memberSince(): string {
    if (!this.client?.createdAt) return '';
    return new Date(this.client.createdAt).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  get preferredHaircut(): ClientHaircut | undefined {
    return this.client?.haircuts?.find(h => h.isPreferred);
  }

  get allPhotos(): { photo: HaircutPhoto; haircut: ClientHaircut }[] {
    const result: { photo: HaircutPhoto; haircut: ClientHaircut }[] = [];
    this.client?.haircuts?.forEach(h => {
      h.photos?.forEach(p => result.push({ photo: p, haircut: h }));
    });
    return result.sort((a, b) =>
      new Date(b.photo.takenAt).getTime() - new Date(a.photo.takenAt).getTime()
    );
  }

  get visibleGallery() { return this.allPhotos.slice(0, this.visiblePhotos); }
  get hasMorePhotos(): boolean { return this.allPhotos.length > this.visiblePhotos; }
  loadMore(): void { this.visiblePhotos += 8; }

  // ── Editar cliente ────────────────────────────────────────

  openEdit(): void {
    if (!this.client) return;
    this.editForm.patchValue({
      fullName: this.client.fullName,
      phone: this.client.phone,
      email: this.client.email ?? '',
      birthDate: this.client.birthDate ?? '',
      notes: this.client.notes ?? ''
    });
    this.showEditClient = true;
  }

  saveClient(): void {
    if (this.editForm.invalid || this.saving) return;
    this.saving = true;

    this.clientService.update(this.clientId, this.editForm.value).subscribe({
      next: (res) => {
        if (res.success) {
          this.client = res.data;
          this.showEditClient = false;
          this.toast('success', 'Listo', 'Perfil actualizado');
        } else {
          this.toast('error', 'Error', res.message);
        }
        this.saving = false;
      },
      error: () => { this.saving = false; }
    });
  }

  // ── Agregar corte ─────────────────────────────────────────

  openAddHaircut(): void {
    this.haircutForm.reset({ type: 'hair', isPreferred: false });
    this.showAddHaircut = true;
  }

  saveHaircut(): void {
  if (this.haircutForm.invalid || this.saving) return;
  this.saving = true;

  this.clientService.addHaircut(this.clientId, this.haircutForm.value).subscribe({
    next: (res) => {
      if (res.success) {
        this.showAddHaircut = false;
        this.toast('success', '¡Corte guardado!', res.data.name);
        this.loadData();

        setTimeout(() => {
          this.selectedHaircut  = res.data;
          this.pendingPhotos    = [];
          this.uploadingAll     = false;
          this.uploadProgress   = 0;
          this.showUploadPhoto  = true;
        }, 800);
      }
      this.saving = false;
    },
    error: () => { this.saving = false; }
  });
}

  // ── Subir foto ────────────────────────────────────────────

  openUploadPhoto(haircut: ClientHaircut): void {
    this.selectedHaircut = haircut;
    this.uploadFile = null;
    this.uploadPreview = null;
    this.uploadNotes = '';
    this.showUploadPhoto = true;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toast('error', 'Archivo inválido', 'Solo se permiten imágenes');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.toast('warn', 'Archivo muy grande', 'La imagen no puede superar 10MB');
      return;
    }

    this.uploadFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { this.uploadPreview = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  uploadPhoto(): void {
    if (!this.uploadFile || !this.selectedHaircut || this.uploading) return;
    this.uploading = true;

    // ✅ FormData con los campos correctos que espera el backend
    const formData = new FormData();
    formData.append('file', this.uploadFile, this.uploadFile.name);
    if (this.uploadNotes.trim()) {
      formData.append('notes', this.uploadNotes.trim());
    }

    this.clientService.uploadPhoto(this.selectedHaircut.id, formData).subscribe({
      next: (res: ApiResponse<HaircutPhoto>) => {
        if (res.success) {
          this.showUploadPhoto = false;
          this.uploadFile = null;
          this.uploadPreview = null;
          this.toast('success', '¡Foto subida!', 'Foto agregada al historial');
          this.loadData();   // recargar para ver la foto nueva
        } else {
          this.toast('error', 'Error al subir', res.message);
        }
        this.uploading = false;
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Error de conexión. Intenta de nuevo.';
        this.toast('error', 'Error al subir', msg);
        this.uploading = false;
      }
    });
  }

  // ── Visor de fotos ────────────────────────────────────────

  openPhotoViewer(photo: HaircutPhoto, haircut: ClientHaircut): void {
    this.viewerPhoto = photo;
    this.viewerHaircut = haircut;
    this.showPhotoViewer = true;
  }

  onMultipleFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const spaces = 5 - this.pendingPhotos.length;

    files.slice(0, spaces).forEach(file => {
      if (!file.type.startsWith('image/')) {
        this.toast('warn', 'Formato inválido', `${file.name} no es una imagen`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        this.toast('warn', 'Archivo muy grande', `${file.name} supera 10MB`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        this.pendingPhotos.push({
          file,
          preview: e.target?.result as string,
          notes: ''
        });
      };
      reader.readAsDataURL(file);
    });

    // Limpiar input para poder re-seleccionar los mismos archivos
    input.value = '';
  }

  removePendingPhoto(index: number): void {
    this.pendingPhotos.splice(index, 1);
  }

  // Sube todas las fotos de la cola en secuencia
  uploadAllPhotos(): void {
    if (!this.selectedHaircut || this.pendingPhotos.length === 0) return;

    this.uploadingAll = true;
    this.uploadProgress = 0;

    const uploadNext = (index: number) => {
      if (index >= this.pendingPhotos.length) {
        // ✅ Todas subidas
        this.uploadingAll = false;
        this.uploadProgress = 100;
        this.showUploadPhoto = false;
        this.pendingPhotos = [];
        this.toast('success', '¡Fotos subidas!',
          `${index} foto${index !== 1 ? 's' : ''} guardada${index !== 1 ? 's' : ''} en el historial`);
        this.loadData();
        return;
      }

      const item = this.pendingPhotos[index];
      const formData = new FormData();
      formData.append('file', item.file, item.file.name);
      if (item.notes?.trim()) formData.append('notes', item.notes.trim());

      this.clientService.uploadPhoto(this.selectedHaircut!.id, formData).subscribe({
        next: () => {
          this.uploadProgress = Math.round(((index + 1) / this.pendingPhotos.length) * 100);
          uploadNext(index + 1);
        },
        error: () => {
          this.toast('warn', 'Error en foto', `No se pudo subir la foto ${index + 1}, continuando...`);
          uploadNext(index + 1);
        }
      });
    };

    uploadNext(0);
  }

  // ── Navegación ────────────────────────────────────────────

  goBack(): void { this.router.navigate(['/clients']); }
  goToAgenda(): void { this.router.navigate(['/agenda']); }

  // ── Helpers ───────────────────────────────────────────────

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN', minimumFractionDigits: 2
    }).format(v);
  }

  formatDate(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    if (weeks === 1) return 'Hace 1 semana';
    if (weeks < 4) return `Hace ${weeks} semanas`;
    if (months === 1) return 'Hace 1 mes';
    return `Hace ${months} meses`;
  }

  typeLabel(t: string): string {
    return t === 'hair' ? 'Cabello' : t === 'beard' ? 'Barba' : 'Combo';
  }

  saleStatusLabel(s: string): string {
    return s === 'completed' ? 'Completada' : s === 'cancelled' ? 'Cancelada' : 'Reembolsada';
  }

  saleStatusSeverity(s: string): 'success' | 'danger' | 'warning' {
    return s === 'completed' ? 'success' : s === 'cancelled' ? 'danger' : 'warning';
  }

  private toast(severity: string, summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 3500 });
  }
}