import { Component, EventEmitter, Input, Output } from '@angular/core';
import {TranslateModule} from "@ngx-translate/core";
import { faEdit, faTrash } from '@fortawesome/pro-solid-svg-icons';
import { TableColumn } from 'src/app/models/table-column.model';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { TableInputComponent } from 'src/app/shared/forms/table-input/table-input.component';
import { ModalComponent } from 'src/app/shared/modal/modal.component';

@Component({
  selector: 'app-price-components-table',
  standalone: true,
  templateUrl: './price-components-table.component.html',
  imports: [
    TranslateModule,
    ButtonComponent,
    ModalComponent,
    TableInputComponent
  ]
})
export class PriceComponentsTableComponent {
  @Input() priceComponents: any[] = []; // Lista de price components
  @Output() edit = new EventEmitter<any>(); // Emitir evento al editar
  @Output() delete = new EventEmitter<string>(); // Emitir evento al eliminar

  showDeleteModal = false;
  componentToDelete: any | null = null;

  readonly columns: TableColumn[] = [
    { header: 'FORMS.PRICE_PLAN_COMPONENT._name', getValue: (component: any) => component.name },
    { header: 'FORMS.PRICE_PLAN_COMPONENT._description', cellClass: 'break-words', getValue: (component: any) => component.description },
    { header: 'FORMS.PRICE_PLAN_COMPONENT._price_type', getValue: (component: any) => this.getPriceTypeLabelKey(component.priceType) },
    {
      header: 'FORMS.PRICE_PLAN_COMPONENT._actions', type: 'actions', width: 'w-36',
      actions: [
        {
          icon: faEdit, tooltip: 'FORMS.PRICE_PLAN_COMPONENT._edit', dataCy: 'ppEditPriceComponent',
          onClick: (component: any) => this.editPriceComponent(component),
        },
        {
          icon: faTrash, tooltip: 'FORMS.PRICE_PLAN_COMPONENT._delete', dataCy: 'ppDeletePriceComponent',
          buttonClass: 'bg-red-500 hover:bg-red-600 focus:ring-red-300 text-white',
          onClick: (component: any) => this.confirmDelete(component),
        },
      ],
    },
  ];

  editPriceComponent(component: any) {
    this.edit.emit(component); // Emitir evento con el componente a editar
  }

  confirmDelete(component: any) {
    this.componentToDelete = component;
    this.showDeleteModal = true;
  }

  deletePriceComponent() {
    if (this.componentToDelete) {
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
