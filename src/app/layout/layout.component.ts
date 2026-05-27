import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector:    'app-layout',
  templateUrl: './layout.component.html',
  styleUrls:   ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {

  collapsed   = false;
  mobileOpen  = false;
  isMobile    = false;

  private routerSub!: Subscription;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // ✅ Detectar móvil PRIMERO antes de restaurar collapsed
    this.checkMobile();

    // Solo restaurar collapsed si estamos en desktop
    if (!this.isMobile) {
      this.collapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    }

    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobile) this.mobileOpen = false;
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < 768;
    if (!this.isMobile) this.mobileOpen = false;
  }

  toggle(): void {
    if (this.isMobile) {
      this.mobileOpen = !this.mobileOpen;
    } else {
      this.collapsed = !this.collapsed;
      localStorage.setItem('sidebar_collapsed', String(this.collapsed));
    }
  }

  closeMobile(): void {
    this.mobileOpen = false;
  }
}