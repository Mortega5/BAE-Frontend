import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-status-field',
  templateUrl: './status-field.component.html',
  imports: [NgClass, TranslateModule],
  standalone: true,
})
export class StatusFieldComponent {
  @Input() label: string = '';
  @Input() value: string = '';
  @Input() activeClass: string = '';
  @Input() isActive: boolean = false;
  @Input() isLast: boolean = false;
  @Input() dataCy?: string;
  @Output() selected = new EventEmitter<string>();

  @HostBinding('class')
  get hostClasses(): string {
    const base = 'cursor-pointer flex items-center';
    const connector = this.isLast
      ? ''
      : 'w-fit md:w-full after:w-full after:h-1 after:border-b after:border-gray-700 dark:after:border-gray-400 after:border-1 after:mx-2 md:after:mx-6 xl:after:mx-10';
    const color = this.isActive ? this.activeClass : '';
    return [base, connector, color].filter(Boolean).join(' ');
  }
}
