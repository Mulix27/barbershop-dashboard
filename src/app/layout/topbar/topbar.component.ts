// topbar.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnInit {

  @Input()  sidebarCollapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  userName = '';
  barbershopName = '';
  greeting = '';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userName       = user.fullName.split(' ')[0];
      this.barbershopName = user.barbershopName;
    }

    const hour = new Date().getHours();
    if (hour < 12)      this.greeting = 'Buenos días';
    else if (hour < 18) this.greeting = 'Buenas tardes';
    else                this.greeting = 'Buenas noches';
  }

  get today(): string {
    return new Date().toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }
}