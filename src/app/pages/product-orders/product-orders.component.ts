import { AfterViewInit, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { initFlowbite } from 'flowbite';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-product-orders',
  standalone: true,
  imports: [TranslateModule, CommonModule, RouterModule],
  templateUrl: './product-orders.component.html',
  styleUrl: './product-orders.component.css'
})
export class ProductOrdersComponent implements AfterViewInit {
  ngAfterViewInit() {
    initFlowbite();
  }
}
