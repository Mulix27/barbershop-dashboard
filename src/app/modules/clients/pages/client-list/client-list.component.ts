import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ClientService } from '../../../../core/services/client.service';
import { Client } from 'src/app/core/models/client.model';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-client-list',
  templateUrl: './client-list.component.html',
  styleUrls: ['./client-list.component.scss']
})
export class ClientListComponent implements OnInit {

  clients: Client[] = [];
  filtered: Client[] = [];
  selected: Client | null = null;
  loading = true;
  showForm = false;
  saving = false;
  isEdit = false;

  searchQuery = '';
  private search$ = new Subject<string>();

  form!: UntypedFormGroup;

  constructor(
    private clientService: ClientService,
    private router: Router,
    private fb: UntypedFormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit(): void {
    this.buildForm();
    this.loadClients();

    // Búsqueda con debounce
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(q => this.applyFilter(q));
  }

  buildForm(): void {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(120)]],
      phone: ['', [Validators.required]],
      email: ['', Validators.email],
      birthDate: [''],
      notes: ['']
    });
  }

  loadClients(): void {
    this.loading = true;
    this.clientService.getAll().subscribe({
      next: (res) => {
        // getAll ahora retorna ApiResponse<Client[]>
        if (res.success) {
          this.clients = res.data;
          this.filtered = res.data;
          if (this.clients.length > 0 && !this.selected) {
            this.select(this.clients[0]);
          }
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onSearch(q: string): void {
    this.search$.next(q);
  }

  applyFilter(q: string): void {
    if (!q.trim()) {
      this.filtered = this.clients;
      return;
    }
    const lower = q.toLowerCase();
    this.filtered = this.clients.filter(c =>
      c.fullName.toLowerCase().includes(lower) ||
      c.phone?.includes(q)
    );
  }

  select(client: Client): void {
    this.selected = client;
    this.clientService.getById(client.id).subscribe(res => {
      // getById ahora retorna ApiResponse<Client>
      if (res.success) this.selected = res.data;
    });
  }

  openCreate(): void {
    this.isEdit = false;
    this.form.reset();
    this.showForm = true;
  }

  openEdit(client: Client): void {
    this.isEdit = true;
    this.form.patchValue({
      fullName: client.fullName,
      phone: client.phone,
      email: client.email ?? '',
      birthDate: client.birthDate ?? '',
      notes: client.notes ?? ''
    });
    this.selected = client;
    this.showForm = true;
  }

  save(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    const data = this.form.value;

    const action = this.isEdit && this.selected
      ? this.clientService.update(this.selected.id, data)
      : this.clientService.create(data);

    action.subscribe({
      next: (res) => {
        if (res.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Listo',
            detail: this.isEdit ? 'Cliente actualizado' : 'Cliente creado'
          });
          this.showForm = false;
          this.loadClients();
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message });
        }
        this.saving = false;
      },
      error: () => { this.saving = false; }
    });
  }

  confirmDeactivate(client: Client): void {
    this.confirmationService.confirm({
      message: `¿Desactivar al cliente ${client.fullName}?`,
      accept: () => {
        this.clientService.deactivate(client.id).subscribe(res => {
          if (res.success) {
            this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Cliente desactivado' });
            this.loadClients();
          }
        });
      }
    });
  }

  goToDetail(client: Client): void {
    this.router.navigate(['/clients', client.id]);
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }
}