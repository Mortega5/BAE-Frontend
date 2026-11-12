import { OptionCardOption } from 'src/app/models/formFields/form-field.model';
import { OptionCardsComponent } from 'src/app/shared/forms/option-cards/option-cards.component';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ModalComponent } from 'src/app/shared/modal/modal.component';

@Component({
  selector: 'app-plan-subtype-modal',
  standalone: true,
  templateUrl: './plan-subtype-modal.component.html',
  imports: [TranslateModule, ButtonComponent, ModalComponent, OptionCardsComponent]
})
export class PlanSubtypeModalComponent {

  /** Standard plans price a configuration profile, so they need a product spec with configuration options. */
  @Input() standardAvailable = true;
  @Output() select = new EventEmitter<'standard' | 'flex'>();
  @Output() closed = new EventEmitter<void>();

  selectedType: 'standard' | 'flex' | null = null;

  private cached?: { standardAvailable: boolean; options: OptionCardOption[] };

  /** Kept while `standardAvailable` does not change: a new array on every check would be seen as a changed binding. */
  get options(): OptionCardOption[] {
    if (this.cached?.standardAvailable === this.standardAvailable) return this.cached.options;
    const options: OptionCardOption[] = [
      {
        value: 'standard', label: 'CREATE_OFFER._standard_plan', description: 'CREATE_OFFER._standard_plan_desc', dataCy: 'planSubtypeStandard',
        disabled: !this.standardAvailable,
        note: this.standardAvailable ? undefined : 'CREATE_OFFER._standard_plan_requires_configuration_options',
      },
      { value: 'flex', label: 'CREATE_OFFER._flex_plan', description: 'CREATE_OFFER._flex_plan_desc', dataCy: 'planSubtypeFlex' },
    ];
    this.cached = { standardAvailable: this.standardAvailable, options };
    return options;
  }

  pick(type: 'standard' | 'flex'): void {
    if (type === 'standard' && !this.standardAvailable) return;
    this.selectedType = type;
  }

  confirm(): void {
    if (!this.selectedType) return;
    this.select.emit(this.selectedType);
  }

  cancel(): void {
    this.closed.emit();
  }
}
