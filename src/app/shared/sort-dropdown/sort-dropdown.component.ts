import { NgClass } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown } from '@fortawesome/pro-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { DropdownPanelComponent } from 'src/app/shared/dropdown-panel/dropdown-panel.component';

export interface SortOption {
  value: string;
  /** i18n key. */
  label: string;
}

/** "Sort by: <the chosen order> ▾", a link-style trigger that opens a menu with the orders to choose from. For the
 * results of a list (catalogs, search); the page decides what each value asks the server for. */
@Component({
  selector: 'app-sort-dropdown',
  standalone: true,
  imports: [NgClass, FaIconComponent, TranslateModule, DropdownPanelComponent],
  templateUrl: './sort-dropdown.component.html',
})
export class SortDropdownComponent {
  @Input({ required: true }) options: SortOption[] = [];
  /** The `value` of the chosen option. */
  @Input() value?: string;
  /** i18n key of the text before the chosen option. */
  @Input() label = 'CATALOGS._sort_by';
  @Output() valueChange = new EventEmitter<string>();

  open = false;
  protected readonly chevron = faChevronDown;

  get selectedLabel(): string {
    return this.options.find(option => option.value === this.value)?.label ?? '';
  }

  toggle(event: Event): void {
    event.stopPropagation();
    this.open = !this.open;
  }

  select(option: SortOption, event: Event): void {
    event.stopPropagation();
    this.open = false;
    if (option.value === this.value) return;
    this.value = option.value;
    this.valueChange.emit(option.value);
  }

  /** A click anywhere else closes the menu. */
  @HostListener('document:click')
  close(): void {
    this.open = false;
  }
}
