import { Component, EventEmitter, Input, OnInit, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { FormField } from 'src/app/models/formFields/form-field.model';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableColumn } from 'src/app/models/table-column.model';
import { FilteredPaginatedTableComponent } from 'src/app/shared/forms/filtered-paginated-table/filtered-paginated-table.component';
import { FormChangeState } from "../../../../models/interfaces";
import { AccountServiceService } from "../../../../services/account-service.service";

@Component({
  selector: 'app-related-party-id',
  standalone: true,
  imports: [
    FilteredPaginatedTableComponent
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RelatedPartyIdComponent),
      multi: true
    }
  ],
  templateUrl: './related-party-id.component.html',
  styleUrl: './related-party-id.component.css'
})
export class RelatedPartyIdComponent implements OnInit, ControlValueAccessor {
  constructor(
    private accService: AccountServiceService,
  ) {
  }
  @Input() partyId: any;
  @Output() formChange = new EventEmitter<FormChangeState>();

  selectedParty: any = null;
  private incomingValue: any = null;
  private allPartiesPromise?: Promise<any[]>;

  partyColumns: TableColumn<any>[] = [
    { header: 'OFFERINGS._name', getValue: (item: any) => item.tradingName ?? '-' },
  ];

  partyFilters: FormField[] = [
    { type: 'string', name: 'search', label: 'CREATE_OFFER._search_party', placeholder: 'CREATE_OFFER._search_party_ph' },
  ];

  async ngOnInit() {
    const requestedPartyId = this.incomingValue?.id ?? this.partyId;

    if (requestedPartyId) {
      try {
        this.selectedParty = await this.accService.getOrgInfo(requestedPartyId);
      } catch (error) {
        console.error('Unable to load requested party by id:', requestedPartyId, error);
      }
    } else if (this.incomingValue?.id) {
      this.selectedParty = this.incomingValue;
    }
  }

  private getAllParties(): Promise<any[]> {
    if (!this.allPartiesPromise) {
      this.allPartiesPromise = this.accService.getOrgList();
    }
    return this.allPartiesPromise;
  }

  fetchParties = async (params: PageRequest, filters: Record<string, any>): Promise<PageResult<any>> => {
    const parties = await this.getAllParties();
    const term = (filters['search'] ?? '').toString().toLowerCase().trim();
    const filtered = term
      ? parties.filter(p => p.tradingName?.toLowerCase().includes(term))
      : parties;

    return {
      items: filtered.slice(params.offset, params.offset + params.limit),
      total: filtered.length,
    };
  }

  onSelectedChange(value: any): void {
    this.selectedParty = value;
    this.onChange(value);
    this.onTouched();
  }

  // As ControlValueAccessor
  onChange: (value: any) => void = () => { };
  onTouched: () => void = () => { };

  writeValue(value: any): void {
    this.incomingValue = value;
    if (value) {
      this.selectedParty = value;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
}
