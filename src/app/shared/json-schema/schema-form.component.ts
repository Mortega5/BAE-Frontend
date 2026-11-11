import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ButtonComponent } from '../button/button.component';
import { humanize } from './schema-fields';
import { createSchemaForm, SchemaFormGroup } from './schema-form-group';
import { SchemaIssuePipe } from './schema-issue.pipe';
import { SchemaObjectComponent } from './schema-object.component';
import { SchemaRegistryService, SchemaValidationError } from './schema-registry.service';
import { SchemaUiOverlay } from './ui-overlay';

/**
 * A form generated from a published JSON Schema. It fetches the schema, builds a
 * {@link SchemaFormGroup} seeded with `initialValue`, and emits it through `formReady`. The group is
 * invalid while its `schemaValue()` does not validate against the full schema, so callers can gate
 * saving on `form.valid` as with any other form.
 *
 * There is deliberately no hand-written fallback: if the schema cannot be loaded the form says so
 * and offers a retry.
 */
interface SchemaIssue extends SchemaValidationError {
  label: string;
  /** The rest of the path when the error is inside a value edited as a whole. */
  suffix: string;
  /** Pointer of the field or section the label stands for, `''` when there is none to go to. */
  target: string;
}

@Component({
  selector: 'app-schema-form',
  standalone: true,
  imports: [CommonModule, TranslateModule, ButtonComponent, SchemaObjectComponent, SchemaIssuePipe],
  template: `
    @if (loadError) {
    <div class="flex items-center justify-between gap-3 p-3 text-sm text-danger bg-danger-soft rounded-lg" role="alert" data-cy="schemaLoadError">
      <span>{{ 'SCHEMA_FORM._load_error' | translate }} <span class="font-mono break-all">{{ schemaUrl }}</span></span>
      <app-button type="button" variant="ghost" size="sm" prefixIcon="rotate" (click)="load()">{{ 'SCHEMA_FORM._retry' | translate }}</app-button>
    </div>
    } @else if (form) {
    <app-schema-object [group]="form" [columns]="columns"></app-schema-object>
    @if (form.dirty && schemaErrors.length > 0) {
    <ul class="mt-4 p-3 text-sm text-danger bg-danger-soft rounded-lg list-disc list-inside" role="alert" data-cy="schemaErrors">
      @for (issue of issues; track issue.path + issue.message) {
      <li>
        @if (issue.target) {<button type="button" class="font-semibold underline hover:no-underline" (click)="goTo(issue.target)">{{ issue.label | translate }}</button>{{ issue.suffix }}: }
        @else if (issue.label) {<span class="font-semibold">{{ issue.label | translate }}</span>{{ issue.suffix }}: }
        {{ issue | schemaIssue }}
      </li>
      }
    </ul>
    }
    } @else {
    <p class="text-sm text-content-muted">{{ 'SCHEMA_FORM._loading' | translate }}</p>
    }
  `,
})
export class SchemaFormComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) schemaUrl!: string;
  @Input() overlay?: SchemaUiOverlay;
  @Input() initialValue?: Record<string, unknown>;
  @Input() columns = 4;
  @Output() formReady = new EventEmitter<SchemaFormGroup>();

  form?: SchemaFormGroup;
  loadError = false;
  private subscription?: Subscription;

  constructor(private registry: SchemaRegistryService, private host: ElementRef<HTMLElement>) {}

  get schemaErrors(): SchemaValidationError[] {
    return (this.form?.errors?.['schema'] as SchemaValidationError[] | undefined) ?? [];
  }

  /** The schema errors, each tied to the label of the field it is about. */
  get issues(): SchemaIssue[] {
    return this.schemaErrors.map(error => ({ ...error, ...this.describe(error.path) }));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schemaUrl']) this.load();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  load(): void {
    this.subscription?.unsubscribe();
    this.loadError = false;
    this.form = undefined;
    this.subscription = this.registry.get(this.schemaUrl).subscribe({
      next: loaded => {
        this.form = createSchemaForm(loaded, this.initialValue, this.overlay);
        this.formReady.emit(this.form);
      },
      error: error => {
        console.error(`Could not load the schema ${this.schemaUrl}`, error);
        this.loadError = true;
      },
    });
  }

  /** Scrolls to the field or section at `pointer` and focuses it. */
  goTo(pointer: string): void {
    const names = pointer.split('/').slice(1);
    const section = this.host.nativeElement.querySelector(`[data-schema-pointer="${CSS.escape(pointer)}"]`);
    // Field ids repeat across sections (`version` at the root and inside `properties`), so look
    // inside the field's own section; its own fields come before the nested ones.
    const parent = names.length > 1 ? `/${names.slice(0, -1).join('/')}` : '';
    const scope = parent ? this.host.nativeElement.querySelector(`[data-schema-pointer="${CSS.escape(parent)}"]`) : this.host.nativeElement;
    const name = (names[names.length - 1] ?? '').replace(/~1/g, '/').replace(/~0/g, '~');
    const target = section ?? scope?.querySelector<HTMLElement>(`[id="${CSS.escape(name)}"]`);
    if (!target) return;
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    (target as HTMLElement).focus?.({ preventScroll: true });
  }

  /**
   * The label of the field at `path` (the one the user sees), where to go when it is clicked, and the
   * rest of the path when the error is inside a value edited as a whole, e.g. a key in a YAML editor.
   */
  private describe(path: string): { label: string; suffix: string; target: string } {
    const names = path.split('/').slice(1);
    const unescaped = names.map(name => name.replace(/~1/g, '/').replace(/~0/g, '~'));
    let group = this.form;
    for (let i = 0; group && i < unescaped.length; i++) {
      const field = group.fields.find(f => f.name === unescaped[i]);
      if (field) {
        const rest = unescaped.slice(i + 1);
        return { label: field.label, suffix: rest.length > 0 ? ` › ${rest.join(' › ')}` : '', target: `/${names.slice(0, i + 1).join('/')}` };
      }
      const child = group.get(unescaped[i]);
      if (!(child instanceof SchemaFormGroup)) break;
      if (i === unescaped.length - 1) return { label: humanize(unescaped[i]), suffix: '', target: path };
      group = child;
    }
    return { label: unescaped.length > 0 ? humanize(unescaped[unescaped.length - 1]) : '', suffix: '', target: '' };
  }
}
