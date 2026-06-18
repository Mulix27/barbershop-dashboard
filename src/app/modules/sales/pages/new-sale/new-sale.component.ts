import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { forkJoin, Observable } from 'rxjs';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { SaleService } from '../../../../core/services/sale.service';
import { ClientService } from '../../../../core/services/client.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { ProductService } from '../../../../core/services/product.service';
import { BarberStaffService } from '../../../../core/services/barber-staff.service';
import { AuthService } from '../../../../core/services/auth.service';

import { Client } from 'src/app/core/models/client.model';
import { Product } from 'src/app/core/models/catalog.model';
import { ServiceSelectOption } from '../../../../core/services/catalog.service';
import { SaleRequest } from 'src/app/core/models/sale.model';
import { BarberOptionResponse } from 'src/app/core/models/barber-staff.model';

interface CartItem {
  id: string;
  type: 'service' | 'product';
  name: string;
  price: number;
  quantity: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Component({
  selector: 'app-new-sale',
  templateUrl: './new-sale.component.html',
  styleUrls: ['./new-sale.component.scss']
})
export class NewSaleComponent implements OnInit {

  services: ServiceSelectOption[] = [];
  products: Product[] = [];
  loading = true;

  clientSearch = '';
  clientResults: Client[] = [];
  selectedClient: Client | null = null;
  searchingClient = false;
  private clientSearch$ = new Subject<string>();

  barbers: BarberOptionResponse[] = [];
  selectedBarberId: string | null = null;
  loadingBarbers = false;
  isSingleBarber = false;

  cart: CartItem[] = [];

  paymentMethod = 'cash';
  discount = 0;
  saving = false;

  paymentOptions = [
    { label: 'Efectivo', value: 'cash', icon: 'pi-money-bill' },
    { label: 'Tarjeta', value: 'card', icon: 'pi-credit-card' },
    { label: 'Transferencia', value: 'transfer', icon: 'pi-send' }
  ];

  activeItemTab: 'services' | 'products' = 'services';

  constructor(
    private saleService: SaleService,
    private clientService: ClientService,
    private catalogService: CatalogService,
    private productService: ProductService,
    private barberStaffService: BarberStaffService,
    private authService: AuthService,
    private messageService: MessageService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const user = this.authService.getUser() as any;
    this.isSingleBarber = !!user?.singleBarber;

    if (this.isSingleBarber) {
      this.selectedBarberId = user?.id ?? user?.userId ?? null;
    }

    forkJoin({
      services: this.catalogService.getSelectOptions(),
      products: this.productService.getAll()
    }).subscribe({
      next: ({ services, products }) => {
        this.services = services.success
          ? services.data.filter((s: ServiceSelectOption) => Number(s.price ?? 0) > 0)
          : [];

        this.products = products.success
          ? products.data.filter((p: Product) => Number(p.stock ?? 0) > 0)
          : [];

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });

    this.loadBarbers();

    this.clientSearch$.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(q => this.searchClient(q));
  }

  loadBarbers(): void {
    this.loadingBarbers = true;

    this.barberStaffService.getOptions().subscribe({
      next: (res) => {
        this.barbers = res.success ? res.data : [];

        if (!this.selectedBarberId && this.barbers.length === 1) {
          this.selectedBarberId = this.barbers[0].userId;
        }

        this.loadingBarbers = false;
      },
      error: () => {
        this.barbers = [];
        this.loadingBarbers = false;
      }
    });
  }

  get barberOptions(): { label: string; value: string }[] {
    return this.barbers.map(barber => ({
      label: barber.specialty
        ? `${barber.fullName} · ${barber.specialty}`
        : barber.fullName,
      value: barber.userId
    }));
  }

  get selectedBarberName(): string {
    if (!this.selectedBarberId) return 'Sin seleccionar';
    return this.barbers.find(b => b.userId === this.selectedBarberId)?.fullName ?? 'Barbero';
  }

  get requiresBarberSelection(): boolean {
    return !this.isSingleBarber;
  }

  onClientSearch(q: string): void {
    if (!q.trim()) {
      this.clientResults = [];
      return;
    }

    this.clientSearch$.next(q);
  }

  searchClient(q: string): void {
    this.searchingClient = true;

    const obs: Observable<ApiResponse<Client | Client[]>> = q.match(/^\d+$/)
      ? this.clientService.getByPhone(q)
      : this.clientService.search(q);

    obs.subscribe({
      next: (res) => {
        if (res.success) {
          this.clientResults = Array.isArray(res.data) ? res.data : [res.data];
        }

        this.searchingClient = false;
      },
      error: () => {
        this.searchingClient = false;
      }
    });
  }

  selectClient(c: Client): void {
    this.selectedClient = c;
    this.clientSearch = c.fullName;
    this.clientResults = [];
  }

  clearClient(): void {
    this.selectedClient = null;
    this.clientSearch = '';
  }

  addService(service: ServiceSelectOption): void {
    const price = this.getServicePrice(service);

    if (price <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Servicio sin precio',
        detail: `El servicio ${service.displayName} no tiene precio configurado`
      });
      return;
    }

    const serviceId = this.getServiceCartId(service);
    const existing = this.cart.find(i => i.id === serviceId && i.type === 'service');

    if (existing) {
      existing.quantity++;
    } else {
      this.cart.push({
        id: serviceId,
        type: 'service',
        name: service.displayName,
        price,
        quantity: 1
      });
    }
  }

  addProduct(product: Product): void {
    const price = Number(product.price ?? 0);

    if (price <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Producto sin precio',
        detail: `El producto ${product.name} no tiene precio configurado`
      });
      return;
    }

    const existing = this.cart.find(i => i.id === product.id && i.type === 'product');

    if (existing) {
      if (existing.quantity < Number(product.stock ?? 0)) {
        existing.quantity++;
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Stock',
          detail: 'No hay más stock disponible'
        });
      }
    } else {
      this.cart.push({
        id: product.id,
        type: 'product',
        name: product.name,
        price,
        quantity: 1
      });
    }
  }

  removeItem(item: CartItem): void {
    this.cart = this.cart.filter(i => !(i.id === item.id && i.type === item.type));
  }

  changeQty(item: CartItem, delta: number): void {
    item.quantity += delta;

    if (item.quantity <= 0) {
      this.removeItem(item);
    }
  }

  get subtotal(): number {
    return this.cart.reduce((s, i) => s + Number(i.price ?? 0) * Number(i.quantity ?? 0), 0);
  }

  get total(): number {
    return Math.max(0, this.subtotal - Number(this.discount || 0));
  }

  confirmSale(): void {
    if (this.cart.length === 0 || this.saving) return;

    if (this.requiresBarberSelection && !this.selectedBarberId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Selecciona un barbero',
        detail: 'Indica qué barbero atendió esta venta'
      });
      return;
    }

    this.saving = true;

    const body: SaleRequest = {
      clientId: this.selectedClient?.id,
      attendedByUserId: this.selectedBarberId ?? undefined,
      paymentMethod: this.paymentMethod,
      discount: Number(this.discount || 0),
      items: this.cart.map(i => ({
        itemType: i.type,
        itemRefId: i.id,
        quantity: i.quantity
      }))
    };

    this.saleService.create(body).subscribe({
      next: (res) => {
        if (res.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Venta registrada',
            detail: `Total: ${this.formatCurrency(this.total)}`
          });

          setTimeout(() => this.router.navigate(['/sales']), 1200);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: res.message || 'No se pudo registrar la venta'
          });

          this.saving = false;
        }
      },
      error: (err) => {
        this.saving = false;

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err?.error?.message || 'No se pudo registrar la venta'
        });
      }
    });
  }

  getServicePrice(service: ServiceSelectOption): number {
    return Number(service.price ?? 0);
  }

  getServiceCartId(service: ServiceSelectOption): string {
    return service.variantId ?? service.categoryId;
  }

  getProductPrice(product: Product): number {
    return Number(product.price ?? 0);
  }

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(Number(v ?? 0));
  }

  getInitials(name: string): string {
    if (!name) return '—';

    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }

  isInCart(id: string, type: string): boolean {
    return this.cart.some(i => i.id === id && i.type === type);
  }

  cartQty(id: string, type: string): number {
    return this.cart.find(i => i.id === id && i.type === type)?.quantity ?? 0;
  }

  goBack(): void {
    this.router.navigate(['/sales']);
  }
}