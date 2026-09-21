import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';
import { ItemCardComponent } from 'src/app/shared/item-card/item-card.component';
import {
  applyCharacteristicConstraints,
  characteristicValuesOverlap,
  CharacteristicConstraintValueUse,
  hasConstraintValues,
  isRangeCharacteristicValue
} from '../../../../price-plan-constraint.utils';

interface PricePlanCharacteristicSelection extends CharacteristicConstraintValueUse {
  id: string;
  name: string;
  allowed: boolean;
  sourceValues: any[];
  allowedValues: any[];
}

/** Seller-side picker for which of the price plan's characteristics (and, for range
 * characteristics, which sub-range) are usable by this plan and its price components.
 * Emits the resulting forbidden-characteristics list — the inverse of the selection —
 * for the parent to persist as a linked "constraint" ProductOfferingPrice. */
@Component({
  selector: 'app-price-plan-characteristics-drawer',
  standalone: true,
  templateUrl: './price-plan-characteristics-drawer.component.html',
  imports: [
    NgClass,
    TranslateModule,
    ButtonComponent,
    ContentCardComponent,
    ItemCardComponent
  ],
  styleUrl: './price-plan-characteristics-drawer.component.css'
})
export class PricePlanCharacteristicsDrawerComponent implements OnInit {
  @Input() characteristics: any[] = [];
  @Input() forbiddenCharacteristics: CharacteristicConstraintValueUse[] = [];
  @Input() priceComponents: any[] = [];
  @Output() save = new EventEmitter<CharacteristicConstraintValueUse[]>();
  @Output() close = new EventEmitter<void>();

  selection: PricePlanCharacteristicSelection[] = [];

  ngOnInit(): void {
    this.selection = (this.characteristics || [])
      .filter((characteristic: any) => characteristic?.id && characteristic?.name)
      .map((characteristic: any) => {
        const matchingConstraints = (this.forbiddenCharacteristics || []).filter((constraint) =>
          constraint.name === characteristic.name
        );
        const fullyForbidden = matchingConstraints.some((constraint) => !hasConstraintValues(constraint));
        const effectiveCharacteristic = applyCharacteristicConstraints(
          [characteristic],
          matchingConstraints
        )[0];
        const sourceValues = (characteristic.productSpecCharacteristicValue || [])
          .map((value: any) => ({ ...value }));

        return {
          id: characteristic.id,
          name: characteristic.name,
          allowed: !fullyForbidden,
          sourceValues,
          allowedValues: fullyForbidden
            ? sourceValues.map((value: any) => ({ ...value }))
            : (effectiveCharacteristic?.productSpecCharacteristicValue || [])
              .map((value: any) => ({ ...value }))
        };
      });
  }

  toggleCharacteristic(index: number): void {
    const characteristic = this.selection[index];
    if (!characteristic) return;
    if (characteristic.allowed && this.isCharacteristicUsed(characteristic)) return;
    characteristic.allowed = !characteristic.allowed;
  }

  isCharacteristicRange(characteristic: PricePlanCharacteristicSelection): boolean {
    return characteristic.sourceValues.some(isRangeCharacteristicValue);
  }

  isValueAllowed(characteristic: PricePlanCharacteristicSelection, value: any): boolean {
    return characteristic.allowedValues.some((allowedValue) =>
      characteristicValuesOverlap(allowedValue, value)
    );
  }

  toggleValue(characteristicIndex: number, valueIndex: number): void {
    const characteristic = this.selection[characteristicIndex];
    const value = characteristic?.sourceValues[valueIndex];
    if (!characteristic || !value) return;

    const isAllowed = this.isValueAllowed(characteristic, value);
    if (isAllowed && this.isValueUsed(characteristic, value)) return;

    characteristic.allowedValues = isAllowed
      ? characteristic.allowedValues.filter((allowedValue) => !characteristicValuesOverlap(allowedValue, value))
      : [...characteristic.allowedValues, { ...value }];
  }

  getSourceRange(characteristic: PricePlanCharacteristicSelection): any {
    return characteristic.sourceValues.find(isRangeCharacteristicValue) || {};
  }

  getAllowedRange(characteristic: PricePlanCharacteristicSelection): any {
    return characteristic.allowedValues.find(isRangeCharacteristicValue) ||
      this.getSourceRange(characteristic);
  }

  setRangeBound(characteristic: PricePlanCharacteristicSelection, bound: 'valueFrom' | 'valueTo', event: Event): void {
    const sourceRange = this.getSourceRange(characteristic);
    const allowedRange = this.getAllowedRange(characteristic);
    characteristic.allowedValues = [{
      ...sourceRange,
      ...allowedRange,
      [bound]: Number((event.target as HTMLInputElement).value)
    }];
  }

  hasSelectionError(): boolean {
    return this.selection.some((characteristic) => {
      if (!characteristic.allowed || characteristic.sourceValues.length === 0) return false;
      if (characteristic.allowedValues.length === 0) return true;

      if (this.isCharacteristicRange(characteristic)) {
        const sourceRange = this.getSourceRange(characteristic);
        const allowedRange = this.getAllowedRange(characteristic);
        const sourceFrom = Number(sourceRange.valueFrom);
        const sourceTo = Number(sourceRange.valueTo);
        const allowedFrom = Number(allowedRange.valueFrom);
        const allowedTo = Number(allowedRange.valueTo);
        if (allowedFrom < sourceFrom || allowedTo > sourceTo || allowedFrom > allowedTo) return true;
      }

      const forbiddenCharacteristic = this.buildForbiddenCharacteristic(characteristic);
      return (forbiddenCharacteristic?.productSpecCharacteristicValue || []).some((forbiddenValue: any) =>
        this.isValueUsed(characteristic, forbiddenValue)
      );
    });
  }

  isCharacteristicUsed(characteristic: CharacteristicConstraintValueUse): boolean {
    return (this.priceComponents || []).some((component: any) =>
      (component?.selectedCharacteristic || []).some((used: any) => used?.name === characteristic.name)
    );
  }

  isValueUsed(characteristic: CharacteristicConstraintValueUse, value: any): boolean {
    return (this.priceComponents || []).some((component: any) =>
      (component?.selectedCharacteristic || [])
        .filter((used: any) => used?.name === characteristic.name)
        .flatMap((used: any) => used.productSpecCharacteristicValue || [])
        .some((usedValue: any) => characteristicValuesOverlap(usedValue, value))
    );
  }

  saveSelection(): void {
    if (this.hasSelectionError()) return;
    const forbiddenCharacteristics = this.selection
      .map((characteristic) => this.buildForbiddenCharacteristic(characteristic))
      .filter((characteristic): characteristic is CharacteristicConstraintValueUse => characteristic !== null);
    this.save.emit(forbiddenCharacteristics);
    this.close.emit();
  }

  private buildForbiddenCharacteristic(
    characteristic: PricePlanCharacteristicSelection
  ): CharacteristicConstraintValueUse | null {
    const base = { id: characteristic.id, name: characteristic.name };
    if (!characteristic.allowed) return base;

    let forbiddenValues: any[];
    if (this.isCharacteristicRange(characteristic)) {
      const sourceRange = this.getSourceRange(characteristic);
      const allowedRange = this.getAllowedRange(characteristic);
      forbiddenValues = [];
      if (Number(allowedRange.valueFrom) > Number(sourceRange.valueFrom)) {
        forbiddenValues.push({
          ...sourceRange,
          valueFrom: sourceRange.valueFrom,
          valueTo: Number(allowedRange.valueFrom) - 1
        });
      }
      if (Number(allowedRange.valueTo) < Number(sourceRange.valueTo)) {
        forbiddenValues.push({
          ...sourceRange,
          valueFrom: Number(allowedRange.valueTo) + 1,
          valueTo: sourceRange.valueTo
        });
      }
    } else {
      forbiddenValues = characteristic.sourceValues.filter((sourceValue) =>
        !this.isValueAllowed(characteristic, sourceValue)
      );
    }

    if (forbiddenValues.length === 0) return null;
    return {
      ...base,
      productSpecCharacteristicValue: forbiddenValues.map((value) => {
        const { isDefault, ...constraintValue } = value;
        return constraintValue;
      })
    };
  }

  cancel(): void {
    this.close.emit();
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent): void {
    event.stopPropagation();
    this.cancel();
  }
}
