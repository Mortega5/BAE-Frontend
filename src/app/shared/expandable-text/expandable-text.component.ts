import { Component, Input, OnChanges } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Shows a text of any length in bounded space: past `maxChars` it is cut at a word boundary with an
 * ellipsis, a "Show more" button reveals the rest, and hovering the cut text shows it whole.
 *
 * Meant for text the app does not write itself, such as JSON Schema descriptions, which have no
 * length limit. Short text renders as it is, with no button.
 */
@Component({
  selector: 'app-expandable-text',
  standalone: true,
  imports: [TranslateModule],
  template: `
    @if (truncated && !expanded) {
    <span [attr.title]="text" data-cy="expandableTextShort">{{ truncated }}</span>
    } @else {
    <span data-cy="expandableTextFull">{{ text }}</span>
    }
    @if (truncated) {
    <button type="button" class="ml-1 font-medium underline hover:no-underline whitespace-nowrap"
      [attr.aria-expanded]="expanded" (click)="toggle($event)" data-cy="expandableTextToggle">
      {{ (expanded ? 'FORMS._show_less' : 'FORMS._show_more') | translate }}
    </button>
    }
  `,
})
export class ExpandableTextComponent implements OnChanges {
  @Input() text: string | null | undefined = '';
  /** Characters shown before the cut. */
  @Input() maxChars = 160;

  /** The cut text with its ellipsis, or `undefined` when the text fits. */
  truncated?: string;
  expanded = false;

  ngOnChanges(): void {
    this.truncated = truncate(this.text ?? '', this.maxChars);
    if (!this.truncated) this.expanded = false;
  }

  toggle(event: Event): void {
    // Hints sit inside labels and forms: the button must not focus a field or submit anything.
    event.preventDefault();
    event.stopPropagation();
    this.expanded = !this.expanded;
  }
}

/**
 * Cuts `text` to at most `maxChars` characters, at the last space when one is reasonably close to
 * the limit, and adds an ellipsis. Returns `undefined` when nothing needs cutting, including when
 * only a few characters would be hidden.
 */
export function truncate(text: string, maxChars: number): string | undefined {
  const trimmed = text.trim();
  // Hiding a handful of characters behind a button is worse than showing them.
  if (trimmed.length <= maxChars + 20) return undefined;
  const slice = trimmed.slice(0, maxChars);
  const space = slice.lastIndexOf(' ');
  const cut = space >= maxChars * 0.6 ? slice.slice(0, space) : slice;
  return `${cut.replace(/[\s.,;:—–-]+$/u, '')}…`;
}
