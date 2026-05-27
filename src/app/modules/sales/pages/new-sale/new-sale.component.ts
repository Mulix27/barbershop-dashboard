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
import { Client } from 'src/app/core/models/client.model';
import { HaircutCatalogItem } from 'src/app/core/models/catalog.model';
import { Product } from 'src/app/core/models/catalog.model';
import { SaleRequest } from 'src/app/core/models/sale.model';

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
}

@Component({
  selector: 'app-new-sale',
  templateUrl: './new-sale.component.html',
  styleUrls: ['./new-sale.component.scss']
})
export class NewSaleComponent implements OnInit {

  // ── Datos ──────────────────────────────────────────────────
  services: HaircutCatalogItem[] = [];
  products: Product[] = [];
  loading = true;

  // ── Búsqueda de cliente ───────────────────────────────────
  clientSearch = '';
  clientResults: Client[] = [];
  selectedClient: Client | null = null;
  searchingClient = false;
  private clientSearch$ = new Subject<string>();

  // ── Carrito ───────────────────────────────────────────────
  cart: CartItem[] = [];

  // ── Pago ──────────────────────────────────────────────────
  paymentMethod = 'cash';
  discount = 0;
  saving = false;

  paymentOptions = [
    { label: 'Efectivo', value: 'cash', icon: 'pi-money-bill' },
    { label: 'Tarjeta', value: 'card', icon: 'pi-credit-card' },
    { label: 'Transferencia', value: 'transfer', icon: 'pi-send' }
  ];

  activeItemTab = 'services'; // services | products

  constructor(
    private saleService: SaleService,
    private clientService: ClientService,
    private catalogService: CatalogService,
    private productService: ProductService,
    private messageService: MessageService,
    private router: Router
  ) { }

  ngOnInit(): void {
    forkJoin({
      services: this.catalogService.getAll(),
      products: this.productService.getAll()
    }).subscribe({
      next: ({ services, products }) => {
        this.services = services.success ? services.data : [];
        this.products = products.success
          ? products.data.filter((p: Product) => p.stock > 0)
          : [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });

    // Búsqueda de cliente con debounce
    this.clientSearch$.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(q => this.searchClient(q));
  }

  // ── Búsqueda de cliente ───────────────────────────────────

  onClientSearch(q: string): void {
    if (!q.trim()) { this.clientResults = []; return; }
    this.clientSearch$.next(q);
  }

  searchClient(q: string): void {
    this.searchingClient = true;

    const obs: Observable<ApiResponse<Client | Client[]>> = q.match(/^\d+$/)
      ? this.clientService.getByPhone(q)
      : this.clientService.search(q);

    obs.subscribe(
      (res: ApiResponse<Client | Client[]>) => {
        if (res.success) {
          this.clientResults = Array.isArray(res.data) ? res.data : [res.data];
        }

        this.searchingClient = false;
      },
      () => {
        this.searchingClient = false;
      }
    );
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

  // ── Carrito ───────────────────────────────────────────────

  addService(service: HaircutCatalogItem): void {
    const existing = this.cart.find(i => i.id === service.id && i.type === 'service');
    if (existing) {
      existing.quantity++;
    } else {
      this.cart.push({ id: service.id, type: 'service', name: service.name, price: service.price, quantity: 1 });
    }
  }

  addProduct(product: Product): void {
    const existing = this.cart.find(i => i.id === product.id && i.type === 'product');
    if (existing) {
      if (existing.quantity < product.stock) existing.quantity++;
      else this.messageService.add({ severity: 'warn', summary: 'Stock', detail: 'No hay más stock disponible' });
    } else {
      this.cart.push({ id: product.id, type: 'product', name: product.name, price: product.price, quantity: 1 });
    }
  }

  removeItem(item: CartItem): void {
    this.cart = this.cart.filter(i => !(i.id === item.id && i.type === item.type));
  }

  changeQty(item: CartItem, delta: number): void {
    item.quantity += delta;
    if (item.quantity <= 0) this.removeItem(item);
  }

  // ── Totales ───────────────────────────────────────────────

  get subtotal(): number {
    return this.cart.reduce((s, i) => s + i.price * i.quantity, 0);
  }

  get total(): number {
    return Math.max(0, this.subtotal - (this.discount || 0));
  }

  // ── Confirmar venta ───────────────────────────────────────

  confirmSale(): void {
    if (this.cart.length === 0 || this.saving) return;
    this.saving = true;

    const body: SaleRequest = {
      clientId: this.selectedClient?.id,
      paymentMethod: this.paymentMethod,
      discount: this.discount || 0,
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
            summary: '¡Venta registrada!',
            detail: `Total: $${this.total.toFixed(2)}`
          });
          setTimeout(() => this.router.navigate(['/sales']), 1500);
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message });
          this.saving = false;
        }
      },
      error: () => { this.saving = false; }
    });
  }

  // ── Helpers ───────────────────────────────────────────────

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN', minimumFractionDigits: 2
    }).format(v);
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
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