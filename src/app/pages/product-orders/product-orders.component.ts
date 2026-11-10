import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';

/** Card around the routed page. The menu lives in the dashboard shell, which mounts these routes. */
@Component({
  selector: 'app-product-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, ContentCardComponent],
  templateUrl: './product-orders.component.html',
  styleUrl: './product-orders.component.css'
})
export class ProductOrdersComponent {}
