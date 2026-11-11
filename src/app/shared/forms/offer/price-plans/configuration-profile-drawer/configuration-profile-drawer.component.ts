import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ModalComponent } from 'src/app/shared/modal/modal.component';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';
import { formatProfileValue, isProfileSelectableCharacteristic } from '../profile-value.util';

@Component({
  selector: 'app-configuration-profile-drawer',
  standalone: true,
  templateUrl: './configuration-profile-drawer.component.html',
  imports: [
    TranslateModule,
    ButtonComponent,
    ModalComponent,
    ContentCardComponent,
    DynamicFormComponent
  ]
})
export class ConfigurationProfileDrawerComponent implements OnInit {

  @Input() profileData: any[] = []; // Array of prodSpecCharValueUse
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  form = new FormGroup<Record<string, FormControl<string>>>({});
  fields: FormField[] = [];
  private characteristics: any[] = [];

  ngOnInit() {
    this.characteristics = this.profileData.filter(isProfileSelectableCharacteristic);

    // One select per characteristic. The control holds the *index* of the chosen option rather
    // than its value: 'object' values are JSON objects and ranges have no `value` at all, and
    // neither survives a round-trip through a native <select> as a string.
    this.characteristics.forEach((char, i) => {
      const options: any[] = char.productSpecCharacteristicValue ?? [];
      const defaultIndex = Math.max(options.findIndex(opt => opt.isDefault), 0);
      const controlName = this.controlName(i);

      this.form.addControl(controlName, new FormControl(String(defaultIndex), { nonNullable: true }));
      this.fields.push({
        type: 'select', name: controlName, label: char.name, colSpan: 1, dataCy: 'offerProfileSelect',
        options: options.map((opt, optIndex) => ({ value: String(optIndex), label: formatProfileValue(opt) })),
      });
    });
  }

  /** Characteristic ids are URNs and may contain dots, which FormGroup.get() treats as a path. */
  private controlName(index: number): string {
    return `char_${index}`;
  }

  private mapFormToProfile(): any[] {
    return this.characteristics.map((char, i) => {
      const selectedIndex = Number(this.form.get(this.controlName(i))!.value);
      return {
        id: char.id,
        name: char.name,
        description: char.description || '',
        // Copies, never the caller's option objects — those belong to the product spec.
        productSpecCharacteristicValue: (char.productSpecCharacteristicValue ?? []).map((opt: any, optIndex: number) => {
          const isDefault = optIndex === selectedIndex;
          const copy = { ...opt, isDefault };
          // A range has no `value`; the chosen band carries its lower bound as one, which is what
          // the price plan's profile summary (and the stored prodSpecCharValueUse) read back.
          if (isDefault && !('value' in opt) && 'valueFrom' in opt) {
            copy.value = 'unitOfMeasure' in opt ? Number(opt.valueFrom) : opt.valueFrom;
          }
          return copy;
        }),
      };
    });
  }

  saveProfile() {
    if (this.form.invalid) return;

    this.save.emit(this.mapFormToProfile());
    this.cancel();
  }

  cancel() {
    this.close.emit();
  }
}
