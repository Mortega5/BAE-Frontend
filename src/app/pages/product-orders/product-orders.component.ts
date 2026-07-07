import { AfterViewInit, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { initFlowbite } from 'flowbite';
import { TranslateModule } from '@ngx-translate/core';
import { OrderInfoComponent } from "./sections/order-info/order-info.component";
import { InvoicesInfoComponent } from "./sections/invoices-info/invoices-info.component";

@Component({
  selector: 'app-product-orders',
  standalone: true,
  imports: [TranslateModule, CommonModule, OrderInfoComponent, InvoicesInfoComponent],
  templateUrl: './product-orders.component.html',
  styleUrl: './product-orders.component.css'
})
export class ProductOrdersComponent implements OnInit, AfterViewInit {
  show_orders: boolean = true;
  show_invoices: boolean = false;

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    let order_button = document.getElementById('order-button')
    let invoices_button = document.getElementById('bill-button')

    this.selectMenu(order_button, 'text-white bg-primary-100');
    this.unselectMenu(invoices_button, 'text-white bg-primary-100');
  }

  ngAfterViewInit() {
    initFlowbite();
  }

  removeClass(elem: HTMLElement, cls: string) {
    var str = " " + elem.className + " ";
    elem.className = str.replace(" " + cls + " ", " ").replace(/^\s+|\s+$/g, "");
  }

  addClass(elem: HTMLElement, cls: string) {
    elem.className += (" " + cls);
  }

  unselectMenu(elem: HTMLElement | null, cls: string) {
    if (elem != null) {
      if (elem.className.match(cls)) {
        this.removeClass(elem, cls)
      }
    }
  }

  selectMenu(elem: HTMLElement | null, cls: string) {
    if (elem != null) {
      if (!elem.className.match(cls)) {
        this.addClass(elem, cls)
      }
    }
  }

  goToOrders() {
    this.show_invoices = false;
    this.show_orders = true;

    let order_button = document.getElementById('order-button')
    let invoices_button = document.getElementById('bill-button')

    this.selectMenu(order_button, 'text-white bg-primary-100');
    this.unselectMenu(invoices_button, 'text-white bg-primary-100');

    this.cdr.detectChanges();
  }

  goToInvoices() {
    this.show_invoices = true;
    this.show_orders = false;

    let order_button = document.getElementById('order-button')
    let invoices_button = document.getElementById('bill-button')

    this.unselectMenu(order_button, 'text-white bg-primary-100');
    this.selectMenu(invoices_button, 'text-white bg-primary-100');

    this.cdr.detectChanges();
  }
}
