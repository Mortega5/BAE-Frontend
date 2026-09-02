import { Component, Input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'link' | 'ghost';
export type ButtonSize = 'sm' | 'md';
export type ButtonIconPosition = 'prefix' | 'suffix';

/** Shared button used to consolidate the many near-duplicate Tailwind button styles
 * scattered across the app. Adopt incrementally when touching a file, not as a
 * one-shot sweep. Styling lives in button.component.css, keyed off [data-variant]/
 * [data-size] attributes rather than computed Tailwind class strings. */
@Component({
  selector: 'app-button',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled = false;
  @Input() icon?: IconDefinition;
  @Input() iconPosition: ButtonIconPosition = 'prefix';
  @Input() dataCy?: string;
}
