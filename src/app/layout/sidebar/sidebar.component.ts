import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { filter } from 'rxjs/operators';

interface NavItem {
  label:         string;
  icon:          string;
  route:         string;
  roles?:        string[];
  hideIfSingle?: boolean;
}

@Component({
  selector:    'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls:   ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  @Input() collapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  currentRoute      = '';
  userName          = '';
  userRole          = '';
  userInitials      = '';
  barbershopName    = '';
  barbershopLogoUrl = '';
  isSingleBarber    = false;

  // ✅ Propiedad isMobile para controlar el HTML
  isMobile = false;

  navItems: NavItem[] = [
    { label: 'Dashboard',    icon: 'pi-home',         route: '/dashboard'                          },
    { label: 'Agenda',       icon: 'pi-calendar',     route: '/agenda'                             },
    { label: 'Clientes',     icon: 'pi-users',        route: '/clients'                            },
    { label: 'Ventas',       icon: 'pi-shopping-cart',route: '/sales'                              },
    { label: 'Catálogo',     icon: 'pi-list',         route: '/catalog',  roles: ['owner']         },
    {
      label:        'Barber Staff',
      icon:         'pi-id-card',
      route:        '/staff',
      roles:        ['owner'],
      hideIfSingle: true
    },
    { label: 'Reportes',     icon: 'pi-chart-bar',    route: '/reports',  roles: ['owner']         },
  ];

  constructor(
    private router:      Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userName          = user.fullName;
      this.userRole          = user.role;
      this.barbershopName    = user.barbershopName;
      this.barbershopLogoUrl = user.logoUrl ?? '';
      this.isSingleBarber    = user.singleBarber;

      this.userInitials = user.fullName
        .split(' ')
        .slice(0, 2)
        .map((n: string) => n[0])
        .join('')
        .toUpperCase();
    }

    // ✅ Detectar móvil al iniciar
    this.checkMobile();

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.currentRoute = e.url);

    this.currentRoute = this.router.url;
  }

  // ✅ Actualizar isMobile al cambiar tamaño de ventana
  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < 768;
  }

  get visibleItems(): NavItem[] {
    const role = this.authService.getRole();
    return this.navItems.filter(item => {
      if (item.roles && !item.roles.includes(role)) return false;
      if (item.hideIfSingle && this.isSingleBarber)  return false;
      return true;
    });
  }

  isActive(route: string): boolean {
    return this.currentRoute.startsWith(route);
  }

  logout(): void {
    this.authService.logout();
  }
}