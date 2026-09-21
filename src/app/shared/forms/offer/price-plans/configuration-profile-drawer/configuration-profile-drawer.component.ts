import { Component, EventEmitter, Input, Output, OnInit, HostListener } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import {NgForOf, NgIf} from "@angular/common";
import { certifications } from 'src/app/models/certification-standards.const';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';

@Component({
  selector: 'app-configuration-profile-drawer',
  standalone: true,
  templateUrl: './configuration-profile-drawer.component.html',
  imports: [
    NgIf,
    NgForOf,
    TranslateModule,
    ButtonComponent,
    ContentCardComponent
  ],
  styleUrl: './configuration-profile-drawer.component.css'
})
export class ConfigurationProfileDrawerComponent implements OnInit {

  @Input() profileData: any[] = []; // Array of prodSpecCharValueUse
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    const characteristicsData = this.profileData.filter(char => this.isSelectableForProfile(char));

    this.form = this.fb.group({
      characteristics: this.fb.array(characteristicsData.map(char => this.createCharacteristicForm(char)))
    });
  }

  /** A characteristic belongs in the profile picker unless it's a certification/compliance
   * marker, an "- enabled" companion toggle, a fixed-schema config type, or a configurable
   * characteristic with no predefined value — those are meant to be filled in by the
   * customer at order time, not fixed into a plan's profile. */
  private isSelectableForProfile(char: any): boolean {
    const charName = (char?.name ?? '').toString().trim();
    const isOptionalToggle = charName.toLowerCase().endsWith('- enabled');
    const isConfigurableWithoutValue = char.configurable !== false && !char.productSpecCharacteristicValue?.length;

    return !certifications.some(certification => certification.name === charName)
      && !charName.startsWith('Compliance:')
      && !isOptionalToggle
      && char.valueType !== 'credentialsConfiguration'
      && char.valueType !== 'authorizationPolicy'
      && !isConfigurableWithoutValue;
  }

  private createCharacteristicForm(char: any): FormGroup {
    const defaultOption = char.productSpecCharacteristicValue.find((v: any) => v.isDefault);
    const defaultValue = defaultOption?.value ?? defaultOption?.valueFrom ?? '';

    return this.fb.group({
      id: new FormControl(char.id),
      name: new FormControl(char.name),
      selectedValue: new FormControl(defaultValue),
      options: new FormControl(char.productSpecCharacteristicValue || [])
    });
  }

  get characteristics(): FormArray {
    return this.form.get('characteristics') as FormArray;
  }

  changeProfileValue(index: number, event: any) {
    const rawValue = event.target.value;
    let parsedValue: any = rawValue;

    if (rawValue === 'true') {
      parsedValue = true;
    } else if (rawValue === 'false') {
      parsedValue = false;
    }

    this.characteristics.at(index).patchValue({ selectedValue: parsedValue });
    console.log(this.characteristics.at(index))
  }

  private mapFormToProfile(): any[] {
    const profileArray = this.characteristics.value;  
    return profileArray.map((char: any) => ({
      id: char.id,
      name: char.name,
      description: char.description || '',
      productSpecCharacteristicValue: char.options.map((opt: any) => {
        if (!("value" in opt) || "valueFrom" in opt) {
          opt.value = "unitOfMeasure" in opt ? Number(char.selectedValue) : char.selectedValue;
        }
        return {
          ...opt,
          isDefault: String(opt.value) === String(char.selectedValue),
        };
      })
    }));
  }
  

  hasKey(obj: any, key: string): boolean {
    return obj?.hasOwnProperty(key);
  }

  saveProfile() {
    if (this.form.invalid) return;

    const formattedProfile = this.mapFormToProfile();
    this.save.emit(formattedProfile);

    this.cancel();
  }

  cancel() {
    this.close.emit();
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    this.cancel();
  }
}
