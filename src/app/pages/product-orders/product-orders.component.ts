import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SideNavComponent } from 'src/app/shared/side-nav/side-nav.component';
import { SideNavSection } from 'src/app/shared/side-nav/side-nav.model';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';
import { ProductOrdersPaths } from './product-orders.paths';

@Component({
  selector: 'app-product-orders',
  standalone: true,
  imports: [TranslateModule, CommonModule, RouterModule, SideNavComponent, ContentCardComponent],
  templateUrl: './product-orders.component.html',
  styleUrl: './product-orders.component.css'
})
export class ProductOrdersComponent {
  readonly paths = ProductOrdersPaths;

  readonly sections: SideNavSection[] = [
    {
      items: [
        { label: 'PRODUCT_ORDERS._orders', routerLink: this.paths.orders() },
        { label: 'PRODUCT_ORDERS._invoices', routerLink: this.paths.invoice(), dataCy: 'invoices' },
      ],
    },
  ];
}
