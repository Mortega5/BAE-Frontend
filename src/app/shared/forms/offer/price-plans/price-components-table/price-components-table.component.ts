import { Component, EventEmitter, Input, Output } from '@angular/core';
import {NgIf} from "@angular/common";
import {TranslateModule} from "@ngx-translate/core";
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';

@Component({
  selector: 'app-price-components-table',
  standalone: true,
  templateUrl: './price-components-table.component.html',
  imports: [
    NgIf,
    TranslateModule,
    ButtonComponent,
    ContentCardComponent
  ],
  styleUrl: './price-components-table.component.css'
})
export class PriceComponentsTableComponent {
  @Input() priceComponents: any[] = []; // Lista de price components
  @Output() edit = new EventEmitter<any>(); // Emitir evento al editar
  @Output() delete = new EventEmitter<string>(); // Emitir evento al eliminar

  showDeleteModal = false;
  componentToDelete: any | null = null;

  editPriceComponent(component: any) {
    this.edit.emit(component); // Emitir evento con el componente a editar
  }

  confirmDelete(component: any) {
    this.componentToDelete = component;
    this.showDeleteModal = true;
  }

  deletePriceComponent() {
    if (this.componentToDelete) {
      console.log('delete')
      this.delete.emit(this.componentToDelete.id);
      this.showDeleteModal = false;
      this.componentToDelete = null;
    }
  }

  getPriceTypeLabelKey(priceType: string): string {
    const keys: { [key: string]: string } = {
      'one time': 'FORMS.PRICE_PLAN_COMPONENT._one_time',
      'recurring': 'FORMS.PRICE_PLAN_COMPONENT._recurring',
      'recurring-prepaid': 'FORMS.PRICE_PLAN_COMPONENT._recurring_prepaid',
      'usage': 'FORMS.PRICE_PLAN_COMPONENT._usage'
    };
    return keys[priceType] || priceType;
  }
}
