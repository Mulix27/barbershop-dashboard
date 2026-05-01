// layout.component.ts
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit {
  collapsed = false;

  ngOnInit(): void {
    this.collapsed = localStorage.getItem('sidebar_collapsed') === 'true';
  }

  toggle(): void {
    this.collapsed = !this.collapsed;
    localStorage.setItem('sidebar_collapsed', String(this.collapsed));
  }
}