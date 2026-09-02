import { Component, Input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconName } from '@fortawesome/fontawesome-svg-core';
import { findButtonIcon } from 'src/app/config/popular-icons';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'link' | 'ghost' | 'neutral';
export type ButtonSize = 'sm' | 'md';
export type ButtonShape = 'default' | 'pill';

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
  @Input() shape: ButtonShape = 'default';
  @Input() outline = false;
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled = false;
  @Input() prefixIcon?: IconName;
  @Input() suffixIcon?: IconName;
  @Input() dataCy?: string;

  protected get resolvedPrefixIcon() {
    return this.prefixIcon ? findButtonIcon(this.prefixIcon) : undefined;
  }

  protected get resolvedSuffixIcon() {
    return this.suffixIcon ? findButtonIcon(this.suffixIcon) : undefined;
  }
}
