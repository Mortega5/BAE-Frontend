import {Component, EventEmitter, Input, Output} from '@angular/core';
import {TranslateModule} from "@ngx-translate/core";
import { faEdit, faTrash } from '@fortawesome/pro-solid-svg-icons';
import { TableColumn } from 'src/app/models/table-column.model';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { TableInputComponent } from 'src/app/shared/forms/table-input/table-input.component';
import { ModalComponent } from 'src/app/shared/modal/modal.component';

@Component({
  selector: 'app-price-plans-table',
  standalone: true,
  imports: [
    TranslateModule,
    ButtonComponent,
    ModalComponent,
    TableInputComponent
  ],
  templateUrl: './price-plans-table.component.html'
})
export class PricePlansTableComponent {
  private _pricePlans: any[] = [];

  @Input() set pricePlans(value: any) {
    this._pricePlans = Array.isArray(value) ? value : [];
  }

  get pricePlans(): any[] {
    return this._pricePlans;
  }
  @Output() edit = new EventEmitter<any>(); // Emitir evento al editar
  @Output() delete = new EventEmitter<number>(); // Emitir evento al eliminar

  showDeleteModal = false;
  pricePlanToDelete: any | null = null;
  planIndex: number;

  readonly columns: TableColumn[] = [
    { header: 'FORMS.PRICE_PLANS._name', getValue: (plan: any) => plan.name },
    { header: 'FORMS.PRICE_PLANS._description', cellClass: 'break-words', getValue: (plan: any) => plan.description },
    {
      header: 'FORMS.PRICE_PLANS._online_payment', type: 'status-badge', width: 'w-40',
      getValue: (plan: any) => plan.paymentOnline ? '_yes' : '_no',
      getStatus: (plan: any) => plan.paymentOnline ? 'success' : 'danger',
    },
    {
      header: 'FORMS.PRICE_PLANS._actions', type: 'actions', width: 'w-36',
      actions: [
        {
          icon: faEdit, tooltip: 'FORMS.PRICE_PLANS._edit', dataCy: 'editPricePlan',
          onClick: (plan: any) => this.editPricePlan(plan),
        },
        {
          icon: faTrash, tooltip: 'FORMS.PRICE_PLANS._delete', dataCy: 'deletePricePlan',
          buttonClass: 'bg-red-500 hover:bg-red-600 focus:ring-red-300 text-white',
          onClick: (plan: any) => this.confirmDelete(plan, this.pricePlans.indexOf(plan)),
        },
      ],
    },
  ];

  editPricePlan(plan: any) {
    this.edit.emit(plan); // Emitir el evento con el plan a editar
  }

  confirmDelete(plan: any, index: number) {
    this.pricePlanToDelete = plan;
    this.planIndex = index;
    this.showDeleteModal = true;
  }

  deletePricePlan() {
    if (this.pricePlanToDelete && this.planIndex >= 0) {
      this.delete.emit(this.planIndex);
      this.showDeleteModal = false;
      this.pricePlanToDelete = null;
    }
  }
}
