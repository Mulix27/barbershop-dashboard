import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export interface ServiceVariant {
  id?:          string;
  name:         string;
  description?: string;
  price:        number;
  durationMin:  number;
  isActive:     boolean;
}

export interface ServiceCategory {
  id?:          string;
  name:         string;
  icon?:        string;
  pricingMode:  'fixed' | 'variants';
  basePrice?:   number;
  baseDuration?: number;
  isActive:     boolean;
  variants:     ServiceVariant[];
}

@Component({
  selector:    'app-service-form',
  templateUrl: './service-form.component.html',
  styleUrls:   ['./service-form.component.scss']
})
export class ServiceFormComponent implements OnInit {

  @Input()  editData: ServiceCategory | null = null;
  @Output() saved    = new EventEmitter<void>();
  @Output() cancelled= new EventEmitter<void>();

  form!:   FormGroup;
  saving = false;

  // Opciones de tipo de servicio
  categoryOptions = [
    { label: 'Cabello',   value: 'Cabello',   icon: '✂' },
    { label: 'Barba',     value: 'Barba',     icon: '🪒' },
    { label: 'Cejas',     value: 'Cejas',     icon: '✨' },
    { label: 'Coloración',value: 'Coloración',icon: '🎨' },
    { label: 'Tratamiento',value:'Tratamiento',icon:'💆' },
    { label: 'Otro',      value: 'Otro',      icon: '⭐' }
  ];

  // Iconos para la categoría
  iconOptions = [
    { label: 'Tijeras',   value: 'pi-scissors' },
    { label: 'Estrella',  value: 'pi-star'     },
    { label: 'Corazón',   value: 'pi-heart'    },
    { label: 'Tag',       value: 'pi-tag'      },
    { label: 'Bolt',      value: 'pi-bolt'     },
    { label: 'Check',     value: 'pi-check-circle' }
  ];

  constructor(
    private fb:             FormBuilder,
    private http:           HttpClient,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    if (this.editData) this.patchForm(this.editData);
  }

  buildForm(): void {
    this.form = this.fb.group({
      name:         ['', [Validators.required, Validators.maxLength(80)]],
      icon:         ['pi-scissors'],
      pricingMode:  ['fixed', Validators.required],  // 'fixed' | 'variants'
      basePrice:    [null],
      baseDuration: [30],
      variants:     this.fb.array([])
    });

    // Validación dinámica según el modo
    this.form.get('pricingMode')!.valueChanges.subscribe(mode => {
      this.updateValidators(mode);
    });
    this.updateValidators('fixed');
  }

  patchForm(data: ServiceCategory): void {
    this.form.patchValue({
      name:         data.name,
      icon:         data.icon ?? 'pi-scissors',
      pricingMode:  data.pricingMode,
      basePrice:    data.basePrice,
      baseDuration: data.baseDuration ?? 30
    });

    if (data.variants?.length) {
      data.variants.forEach(v => this.addVariant(v));
    }

    this.updateValidators(data.pricingMode);
  }

  updateValidators(mode: string): void {
  const price = this.form.get('basePrice')!;
  const duration = this.form.get('baseDuration')!;

  if (mode === 'fixed') {
    price.setValidators([Validators.required, Validators.min(0.01)]);
    duration.setValidators([Validators.required, Validators.min(1)]);

    while (this.variants.length > 0) {
      this.variants.removeAt(0);
    }
  } else {
    price.clearValidators();
    duration.clearValidators();

    if (this.variants.length === 0) {
      this.addVariant();
    }
  }

  price.updateValueAndValidity();
  duration.updateValueAndValidity();
  this.form.updateValueAndValidity();
}

  // ── FormArray de variantes ────────────────────────────────

  get variants(): FormArray {
    return this.form.get('variants') as FormArray;
  }

  get isFixed(): boolean {
    return this.form.get('pricingMode')?.value === 'fixed';
  }

  get isVariants(): boolean {
    return this.form.get('pricingMode')?.value === 'variants';
  }

  addVariant(data?: Partial<ServiceVariant>): void {
    this.variants.push(this.fb.group({
      name:        [data?.name ?? '',  [Validators.required, Validators.maxLength(60)]],
      description: [data?.description ?? ''],
      price:       [data?.price ?? null, [Validators.required, Validators.min(0.01)]],
      durationMin: [data?.durationMin ?? 30, [Validators.required, Validators.min(1)]],
      isActive:    [data?.isActive ?? true]
    }));
  }

  removeVariant(i: number): void {
    if (this.variants.length > 1) this.variants.removeAt(i);
  }

  moveVariant(i: number, dir: 'up' | 'down'): void {
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= this.variants.length) return;
    const a = this.variants.at(i);
    const b = this.variants.at(j);
    this.variants.setControl(i, b);
    this.variants.setControl(j, a);
  }

  // ── Guardar ───────────────────────────────────────────────

  save(): void {
    if (this.form.invalid || this.saving) return;

    // Si modo variantes, validar que haya al menos una
    if (this.isVariants && this.variants.length === 0) {
      this.messageService.add({
        severity: 'warn', summary: 'Atención',
        detail: 'Agrega al menos una variante o cambia a cobro general'
      });
      return;
    }

    this.saving = true;
    const body  = this.buildPayload();
    const url   = this.editData?.id
      ? `${environment.apiUrl}/api/catalog/categories/${this.editData.id}`
      : `${environment.apiUrl}/api/catalog/categories`;

    const request$ = this.editData?.id
      ? this.http.put<any>(url, body)
      : this.http.post<any>(url, body);

    request$.subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.messageService.add({
            severity: 'success', summary: 'Listo',
            detail: this.editData?.id ? 'Servicio actualizado' : 'Servicio creado'
          });
          this.saved.emit();
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: res?.message });
        }
        this.saving = false;
      },
      error: () => { this.saving = false; }
    });
  }

  private buildPayload(): any {
    const val = this.form.value;
    return {
      name:         val.name,
      icon:         val.icon,
      pricingMode:  val.pricingMode,
      basePrice:    val.pricingMode === 'fixed'    ? val.basePrice    : null,
      baseDuration: val.pricingMode === 'fixed'    ? val.baseDuration : null,
      variants:     val.pricingMode === 'variants' ? val.variants     : []
    };
  }

  // ── Helpers ───────────────────────────────────────────────

  formatCurrency(v: number): string {
    if (!v) return '';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN', minimumFractionDigits: 0
    }).format(v);
  }

  get totalVariantsRevenue(): number {
    return this.variants.controls.reduce((sum, c) => sum + (Number(c.get('price')?.value) || 0), 0);
  }

  get modeLabel(): string {
    return this.isFixed ? 'Cobro general' : 'Cobro por variantes';
  }
}