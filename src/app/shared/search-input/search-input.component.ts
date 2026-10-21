import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass, faSparkles, faSpinnerThird, faXmark } from '@fortawesome/pro-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';

/** Shared search box: text input, a clear button shown while there's text, and a
 * submit button. The caller owns the `FormControl` and reacts to it — `search` fires
 * on submit (Enter or the magnifier), and clearing just resets the control, so the
 * caller's own `valueChanges` subscription decides what an emptied search means. */
@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [ReactiveFormsModule, FontAwesomeModule, TranslateModule],
  templateUrl: './search-input.component.html',
  styleUrl: './search-input.component.scss',
})
export class SearchInputComponent {
  @Input({ required: true }) control!: FormControl;
  @Input() placeholder = '';
  /** AI search mode: purple border plus a sparkles icon in front of the text. */
  @Input() ai = false;
  /** Swaps the magnifier for a spinner while a search is running. */
  @Input() loading = false;
  @Output() search = new EventEmitter<void>();

  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly faSparkles = faSparkles;
  protected readonly faSpinnerThird = faSpinnerThird;
  protected readonly faXmark = faXmark;

  /** Plain (submit) instead of (ngSubmit): that needs FormsModule's NgForm, and without it
   * the browser would do a native, page-reloading submit. */
  onSubmit(event: Event): void {
    event.preventDefault();
    this.search.emit();
  }

  clear(): void {
    this.control.reset();
  }
}
