import { NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

export interface SegmentedToggleOption {
  value: string;
  /** i18n key. */
  label: string;
  dataCy?: string;
}

/** A choice between a few options (two or three) shown as the segments of one control: the chosen one is a raised piece
 * that slides over a sunken track, so its shadow falls on the others. For switching how the same thing is looked at
 * (the overview as a seller or as a buyer), not for navigating: use `app-tabs` for sections. */
@Component({
  selector: 'app-segmented-toggle',
  standalone: true,
  imports: [NgClass, TranslateModule],
  templateUrl: './segmented-toggle.component.html',
})
export class SegmentedToggleComponent {
  @Input({ required: true }) options: SegmentedToggleOption[] = [];
  /** The `value` of the chosen option. */
  @Input() value?: string;
  /** i18n key that names the group for assistive technology. */
  @Input() label?: string;
  @Input() dataCy?: string;
  @Output() valueChange = new EventEmitter<string>();

  get selectedIndex(): number {
    return Math.max(0, this.options.findIndex(option => option.value === this.value));
  }

  select(option: SegmentedToggleOption): void {
    if (option.value === this.value) return;
    this.value = option.value;
    this.valueChange.emit(option.value);
  }
}
