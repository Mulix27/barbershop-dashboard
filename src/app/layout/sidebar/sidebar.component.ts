import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { filter } from 'rxjs/operators';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  @Input()  collapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  currentRoute = '';
  userName = '';
  userRole = '';
  userInitials = '';
  barbershopName = '';

  navItems: NavItem[] = [
    { label: 'Dashboard',  icon: 'pi-home',          route: '/dashboard' },
    { label: 'Agenda',     icon: 'pi-calendar',      route: '/agenda' },
    { label: 'Clientes',   icon: 'pi-users',         route: '/clients' },
    { label: 'Ventas',     icon: 'pi-shopping-cart', route: '/sales' },
    { label: 'Catálogo',   icon: 'pi-list',          route: '/catalog',  roles: ['owner'] },
    { label: 'Reportes',   icon: 'pi-chart-bar',     route: '/reports',  roles: ['owner'] },
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userName       = user.fullName;
      this.userRole       = user.role;
      this.barbershopName = user.barbershopName;
      this.userInitials   = user.fullName
        .split(' ').slice(0, 2)
        .map((n: string) => n[0]).join('').toUpperCase();
    }

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.currentRoute = e.url);

    this.currentRoute = this.router.url;
  }

  get visibleItems(): NavItem[] {
    const role = this.authService.getRole();
    return this.navItems.filter(item =>
      !item.roles || item.roles.includes(role)
    );
  }

  isActive(route: string): boolean {
    return this.currentRoute.startsWith(route);
  }

  logout(): void {
    this.authService.logout();
  }
}