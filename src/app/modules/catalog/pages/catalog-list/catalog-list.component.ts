import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Subject } from 'rxjs';
import { of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { ProductService, StockMovementResponse, StockMovementType } from '../../../../core/services/product.service';
import { CatalogService, ServiceCategoryResponse, ServiceCategoryRequest } from '../../../../core/services/catalog.service';
import { Product } from '../../../../core/models/catalog.model';

@Component({
  selector: 'app-catalog-list',
  templateUrl: './catalog-list.component.html',
  styleUrls: ['./catalog-list.component.scss']
})
export class CatalogListComponent implements OnInit {

  @ViewChild('productImageInput') productImageInput!: ElementRef<HTMLInputElement>;

  // ── Estado ────────────────────────────────────────────────
  loading = true;
  activeTab = 'services';
  viewMode = 'grid';

  // ── Datos ──────────────────────────────────────────────────
  products: Product[] = [];
  categories: ServiceCategoryResponse[] = [];
  filtered: Product[] = [];

  // ── Búsqueda y filtros ────────────────────────────────────
  searchQuery = '';
  sortBy = 'recent';
  priceRange = [0, 9999];
  stockFilter = 'all';
  private search$ = new Subject<string>();

  sortOptions = [
    { label: 'Más reciente', value: 'recent' },
    { label: 'Nombre A-Z', value: 'name_asc' },
    { label: 'Nombre Z-A', value: 'name_desc' },
    { label: 'Precio menor', value: 'price_asc' },
    { label: 'Precio mayor', value: 'price_desc' },
    { label: 'Stock bajo', value: 'low_stock' }
  ];

  stockOptions = [
    { label: 'Todos', value: 'all' },
    { label: 'En stock', value: 'in_stock' },
    { label: 'Stock bajo', value: 'low_stock' },
    { label: 'Sin stock', value: 'out_of_stock' }
  ];

  // ── Métricas de productos ─────────────────────────────────
  get totalProducts(): number { return this.products.length; }
  get totalValue(): number { return this.products.reduce((s, p) => s + p.price * p.stock, 0); }
  get lowStockCount(): number { return this.products.filter(p => p.lowStock && p.stock > 0).length; }
  get outOfStockCount(): number { return this.products.filter(p => p.stock === 0).length; }

  // ── Métricas de servicios ─────────────────────────────────
  get totalCategories(): number { return this.categories.length; }
  get totalVariants(): number { return this.categories.reduce((s, c) => s + c.variants.length, 0); }
  get fixedCount(): number { return this.categories.filter(c => c.pricingMode === 'fixed').length; }
  get variantCount(): number { return this.categories.filter(c => c.pricingMode === 'variants').length; }

  // ── Dialogs: Productos ────────────────────────────────────
  showProductForm = false;
  showStockAdjust = false;
  isEditProduct = false;
  savingProduct = false;
  selectedProduct: Product | null = null;
  selectedImageFile: File | null = null;
  imagePreview: string | null = null;
  stockDelta = 0;
  stockAdjustType = 'add';
  productForm!: FormGroup;

  showStockMovements = false;
  loadingStockMovements = false;
  stockMovements: StockMovementResponse[] = [];
  stockReason = '';

  showQuickRestock = false;
  restockQuantity = 1;
  restockReason = 'Compra a proveedor';
  restockingProduct = false;

  showInventoryMovements = false;
  loadingInventoryMovements = false;
  inventoryMovements: StockMovementResponse[] = [];
  inventoryMovementType: StockMovementType | 'all' = 'all';

  inventoryMovementTypeOptions: { label: string; value: StockMovementType | 'all' }[] = [
    { label: 'Todos', value: 'all' },
    { label: 'Entradas', value: 'manual_in' },
    { label: 'Salidas', value: 'manual_out' },
    { label: 'Ventas', value: 'sale' },
    { label: 'Devoluciones', value: 'sale_cancel_return' },
    { label: 'Stock inicial', value: 'initial_stock' },
    { label: 'Correcciones', value: 'correction' }
  ];

  // ── Dialogs: Servicios ────────────────────────────────────
  showServiceForm = false;
  savingService = false;
  isEditService = false;
  selectedCategory: ServiceCategoryResponse | null = null;

  // Variable alias para mantener compatibilidad con el HTML existente
  get isEdit(): boolean { return this.activeTab === 'products' ? this.isEditProduct : this.isEditService; }
  get saving(): boolean { return this.activeTab === 'products' ? this.savingProduct : this.savingService; }

  // Expone ServiceCategoryRequest para el serviceForm
  pendingServiceData: ServiceCategoryRequest | null = null;

  constructor(
    private productService: ProductService,
    private catalogService: CatalogService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit(): void {
    this.buildProductForm();
    this.loadData();
    this.search$.pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.applyFilters());
  }

  buildProductForm(): void {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      sku: [''],
      description: [''],
      price: [null, [Validators.required, Validators.min(0.01)]],
      cost: [null],
      stock: [0],
      stockMin: [5]
    });
  }

  loadData(): void {
    this.loading = true;

    this.productService.getAll().subscribe({
      next: (res) => {
        this.products = res.success ? res.data : [];
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });

    this.catalogService.getCategories(false).subscribe({
      next: (res) => { this.categories = res.success ? res.data : []; }
    });
  }

  // ── Filtros de productos ──────────────────────────────────

  onSearch(): void { this.search$.next(this.searchQuery); }

  applyFilters(): void {
    let result = [...this.products];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) || (p.sku?.toLowerCase().includes(q) ?? false)
      );
    }
    if (this.stockFilter === 'in_stock') result = result.filter(p => p.stock > p.stockMin);
    if (this.stockFilter === 'low_stock') result = result.filter(p => p.lowStock && p.stock > 0);
    if (this.stockFilter === 'out_of_stock') result = result.filter(p => p.stock === 0);
    result = result.filter(p => p.price >= this.priceRange[0] && p.price <= this.priceRange[1]);
    switch (this.sortBy) {
      case 'name_asc': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'name_desc': result.sort((a, b) => b.name.localeCompare(a.name)); break;
      case 'price_asc': result.sort((a, b) => a.price - b.price); break;
      case 'price_desc': result.sort((a, b) => b.price - a.price); break;
      case 'low_stock': result.sort((a, b) => a.stock - b.stock); break;
    }
    this.filtered = result;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.stockFilter = 'all';
    this.priceRange = [0, 9999];
    this.sortBy = 'recent';
    this.applyFilters();
  }

  // ── CRUD Productos ────────────────────────────────────────

  openCreate(): void {
    this.isEditProduct = false;
    this.selectedProduct = null;
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.productForm.reset({ stock: 0, stockMin: 5 });
    this.showProductForm = true;
  }

  openEdit(p: Product): void {
    this.isEditProduct = true;
    this.selectedProduct = p;
    this.selectedImageFile = null;
    this.imagePreview = (p as any).imageUrl ?? null;
    this.productForm.patchValue(p);
    this.showProductForm = true;
  }

  saveProduct(): void {
    if (this.productForm.invalid || this.savingProduct) return;
    this.savingProduct = true;
    const data = this.productForm.value;

    const action = this.isEditProduct && this.selectedProduct
      ? this.productService.update(this.selectedProduct.id, data).pipe(
        switchMap(res => {
          if (res.success && this.selectedImageFile && this.selectedProduct)
            return this.productService.uploadImage(this.selectedProduct.id, this.selectedImageFile);
          return of(res);
        })
      )
      : this.productService.create(data, this.selectedImageFile ?? undefined);

    action.subscribe({
      next: (res) => {
        if (res.success) {
          this.messageService.add({
            severity: 'success', summary: 'Listo',
            detail: this.isEditProduct ? 'Producto actualizado' : 'Producto creado'
          });
          this.showProductForm = false;
          this.selectedImageFile = null;
          this.imagePreview = null;
          this.clearProductImage();
          this.loadData();
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message });
        }
        this.savingProduct = false;
      },
      error: () => { this.savingProduct = false; }
    });
  }

  confirmToggle(p: Product): void {
    this.confirmationService.confirm({
      message: `¿${p.isActive ? 'Desactivar' : 'Activar'} "${p.name}"?`,
      accept: () => {
        this.productService.toggle(p.id).subscribe((res: any) => {
          if (res.success) {
            this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Estado actualizado' });
            this.loadData();
          }
        });
      }
    });
  }

  openStockAdjust(p: Product): void {
    this.selectedProduct = p;
    this.stockDelta = 1;
    this.stockReason = '';
    this.stockAdjustType = 'add';
    this.showStockAdjust = true;
  }

  setStockAdjustType(type: 'add' | 'remove'): void {
    this.stockAdjustType = type;

    if (!this.stockDelta || this.stockDelta <= 0) {
      this.stockDelta = 1;
    }
  }

  adjustStock(): void {
    if (!this.selectedProduct || this.stockDelta <= 0) return;

    const qty = this.stockAdjustType === 'add' ? this.stockDelta : -this.stockDelta;

    if (this.stockAdjustType === 'remove' && this.selectedProduct.stock - this.stockDelta < 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Stock insuficiente',
        detail: 'No puedes quitar más unidades de las disponibles'
      });
      return;
    }

    this.productService.adjustStock(this.selectedProduct.id, qty, this.stockReason).subscribe({
      next: (res) => {
        if (res.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Stock actualizado',
            detail: `Nuevo stock: ${res.data.stock}`
          });

          this.showStockAdjust = false;
          this.stockReason = '';
          this.loadData();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: res.message
          });
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el stock'
        });
      }
    });
  }

  openQuickRestock(product: Product): void {
    this.selectedProduct = product;
    this.restockQuantity = Math.max(product.stockMin - product.stock + 1, 1);
    this.restockReason = 'Compra a proveedor';
    this.showQuickRestock = true;
  }

  increaseRestockQuantity(): void {
    this.restockQuantity = Number(this.restockQuantity || 0) + 1;
  }

  decreaseRestockQuantity(): void {
    const nextValue = Number(this.restockQuantity || 1) - 1;
    this.restockQuantity = Math.max(1, nextValue);
  }

  get quickRestockNewStock(): number {
    if (!this.selectedProduct) return 0;
    return this.selectedProduct.stock + Number(this.restockQuantity || 0);
  }

  confirmQuickRestock(): void {
    if (!this.selectedProduct || this.restockQuantity <= 0 || this.restockingProduct) return;

    this.restockingProduct = true;

    this.productService
      .adjustStock(this.selectedProduct.id, this.restockQuantity, this.restockReason)
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'Producto reabastecido',
              detail: `Nuevo stock: ${res.data.stock}`
            });

            this.showQuickRestock = false;
            this.restockingProduct = false;
            this.restockReason = 'Compra a proveedor';
            this.restockQuantity = 1;
            this.loadData();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: res.message || 'No se pudo reabastecer el producto'
            });

            this.restockingProduct = false;
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo reabastecer el producto'
          });

          this.restockingProduct = false;
        }
      });
  }

  // ── CRUD Servicios (nuevo modelo) ─────────────────────────

  openCreateService(): void {
    this.isEditService = false;
    this.selectedCategory = null;
    this.pendingServiceData = null;
    this.showServiceForm = true;
  }

  openEditService(cat: ServiceCategoryResponse): void {
    this.isEditService = true;
    this.selectedCategory = cat;
    this.showServiceForm = true;
  }

  // Este método es llamado desde el ServiceFormComponent via (saved)
  onServiceSaved(): void {
    this.showServiceForm = false;
    this.catalogService.getCategories(false).subscribe(res => {
      if (res.success) this.categories = res.data;
    });
    this.messageService.add({
      severity: 'success', summary: 'Listo',
      detail: this.isEditService ? 'Servicio actualizado' : 'Servicio creado'
    });
  }

  onServiceCancelled(): void {
    this.showServiceForm = false;
  }

  toggleCategory(cat: ServiceCategoryResponse): void {
    this.catalogService.toggleCategory(cat.id).subscribe(res => {
      if (res.success) {
        this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Estado actualizado' });
        this.catalogService.getCategories(false).subscribe(r => {
          if (r.success) this.categories = r.data;
        });
      }
    });
  }

  confirmDeleteCategory(cat: ServiceCategoryResponse): void {
    this.confirmationService.confirm({
      message: `¿Desactivar el servicio "${cat.name}"?`,
      accept: () => {
        this.catalogService.deleteCategory(cat.id).subscribe(res => {
          if (res.success) {
            this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Servicio desactivado' });
            this.catalogService.getCategories(false).subscribe(r => {
              if (r.success) this.categories = r.data;
            });
          }
        });
      }
    });
  }

  openInventoryMovements(): void {
    this.inventoryMovementType = 'all';
    this.showInventoryMovements = true;
    this.loadInventoryMovements();
  }

  setInventoryMovementType(type: StockMovementType | 'all'): void {
    this.inventoryMovementType = type;
    this.loadInventoryMovements();
  }

  loadInventoryMovements(): void {
    this.loadingInventoryMovements = true;

    this.productService.getRecentStockMovements(this.inventoryMovementType, 50).subscribe({
      next: (res) => {
        this.inventoryMovements = res.success ? res.data : [];
        this.loadingInventoryMovements = false;
      },
      error: () => {
        this.loadingInventoryMovements = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los movimientos de inventario'
        });
      }
    });
  }

  get inventoryTotalIn(): number {
    return this.inventoryMovements
      .filter(m => m.quantityChange > 0)
      .reduce((sum, m) => sum + m.quantityChange, 0);
  }

  get inventoryTotalOut(): number {
    return Math.abs(
      this.inventoryMovements
        .filter(m => m.quantityChange < 0)
        .reduce((sum, m) => sum + m.quantityChange, 0)
    );
  }

  // ── Upload imagen producto ────────────────────────────────

  onProductImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.messageService.add({ severity: 'error', summary: 'Archivo inválido', detail: 'Solo se permiten imágenes' });
      return;
    }
    this.selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = () => { this.imagePreview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  clearProductImage(): void {
    this.selectedImageFile = null;
    this.imagePreview = null;
    if (this.productImageInput) this.productImageInput.nativeElement.value = '';
  }

  // ── Helpers ───────────────────────────────────────────────

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN', minimumFractionDigits: 2
    }).format(v);
  }

  stockLabel(p: Product): string {
    if (p.stock === 0) return 'Sin stock';
    if (p.lowStock) return `Stock bajo: ${p.stock}`;
    return `En stock: ${p.stock}`;
  }

  stockStatus(p: Product): string {
    if (p.stock === 0) return 'danger';
    if (p.lowStock) return 'warning';
    return 'success';
  }

  pricingModeLabel(mode: string): string {
    return mode === 'fixed' ? 'Precio fijo' : 'Por variantes';
  }

  pricingModeBadgeClass(mode: string): string {
    return mode === 'fixed' ? 'badge-fixed' : 'badge-variants';
  }

  activeVariants(cat: ServiceCategoryResponse): number {
    return cat.variants.filter(v => v.isActive).length;
  }

  openStockMovements(product: Product): void {
    this.selectedProduct = product;
    this.stockMovements = [];
    this.loadingStockMovements = true;
    this.showStockMovements = true;

    this.productService.getStockMovements(product.id).subscribe({
      next: (res) => {
        this.stockMovements = res.success ? res.data : [];
        this.loadingStockMovements = false;
      },
      error: () => {
        this.loadingStockMovements = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el historial de stock'
        });
      }
    });
  }

  movementLabel(type: StockMovementType): string {
    const labels: Record<StockMovementType, string> = {
      initial_stock: 'Stock inicial',
      sale: 'Venta',
      manual_in: 'Entrada manual',
      manual_out: 'Salida manual',
      correction: 'Corrección',
      sale_cancel_return: 'Devolución por cancelación'
    };

    return labels[type] ?? type;
  }

  movementIcon(type: StockMovementType): string {
    const icons: Record<StockMovementType, string> = {
      initial_stock: 'pi-box',
      sale: 'pi-shopping-cart',
      manual_in: 'pi-plus-circle',
      manual_out: 'pi-minus-circle',
      correction: 'pi-refresh',
      sale_cancel_return: 'pi-undo'
    };

    return icons[type] ?? 'pi-info-circle';
  }

  movementClass(movement: StockMovementResponse): string {
    if (movement.movementType === 'initial_stock') return 'initial';
    if (movement.quantityChange > 0) return 'positive';
    if (movement.quantityChange < 0) return 'negative';
    return 'neutral';
  }

  signedQuantity(value: number): string {
    if (value > 0) return `+${value}`;
    return `${value}`;
  }

  getCategoryForEdit(): any {
    if (!this.selectedCategory) return null;
    return {
      id: this.selectedCategory.id,
      name: this.selectedCategory.name,
      icon: this.selectedCategory.icon,
      pricingMode: this.selectedCategory.pricingMode,
      basePrice: this.selectedCategory.basePrice ?? undefined,
      baseDuration: this.selectedCategory.baseDuration ?? undefined,
      isActive: this.selectedCategory.isActive,
      variants: this.selectedCategory.variants
    };
  }

  increaseStockDelta(): void {
    this.stockDelta = Number(this.stockDelta || 0) + 1;
  }

  decreaseStockDelta(): void {
    const nextValue = Number(this.stockDelta || 1) - 1;
    this.stockDelta = Math.max(1, nextValue);
  }
}