import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef, Component, forwardRef, inject, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent } from '../../button/button.component';

type EditorMode = 'raw' | 'visual';

/** An ODRL policy as raw JSON text, with a switch to the visual `<odrl-policy-editor>` from
 * `@seamware/odrl-policy-editor`. The form value is always the JSON text; the editor runs with every
 * PAP capability off, so nothing is loaded, saved or validated against a backend. The editor
 * bundle (it carries React) is only fetched the first time it is opened. */
@Component({
  selector: 'app-odrl-policy-input',
  standalone: true,
  imports: [TranslateModule, ButtonComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './odrl-policy-input.component.html',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => OdrlPolicyInputComponent), multi: true },
  ],
})
export class OdrlPolicyInputComponent implements ControlValueAccessor {
  @Input() rows = 8;
  @Input() placeholder = '';
  @Input() readonly = false;
  @Input() dataCy?: string;

  value = '';
  isDisabled = false;
  mode: EditorMode = 'raw';
  loadingEditor = false;
  editorLoadFailed = false;
  /** Policy the editor starts from; set when it is opened. Edits come back through `(policy-changed)`. */
  editorPolicy?: Record<string, unknown>;
  editorTheme: 'light' | 'dark' = 'light';

  private readonly cdr = inject(ChangeDetectorRef);
  private onChange: (v: string) => void = () => { };
  private onTouched: () => void = () => { };

  get locked(): boolean {
    return this.readonly || this.isDisabled;
  }

  /** Empty text is fine (the field's own `required` decides); only unparseable text is rejected. */
  get validJson(): boolean {
    return this.parse(this.value) !== undefined || this.value.trim() === '';
  }

  get canOpenEditor(): boolean {
    return !this.locked && this.validJson && !this.loadingEditor;
  }

  writeValue(value: unknown): void {
    this.value = typeof value === 'string' ? value : value != null ? JSON.stringify(value, null, 2) : '';
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.isDisabled = disabled; }

  onInput(text: string): void {
    this.value = text;
    this.onChange(text);
  }

  onBlur(): void {
    this.onTouched();
  }

  async showEditor(): Promise<void> {
    if (!this.canOpenEditor) return;
    this.loadingEditor = true;
    this.editorLoadFailed = false;
    try {
      await this.loadEditor();
      this.editorPolicy = this.parse(this.value);
      this.editorTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      this.mode = 'visual';
    } catch {
      this.editorLoadFailed = true;
    } finally {
      this.loadingEditor = false;
      this.cdr.markForCheck();
    }
  }

  showRaw(): void {
    this.mode = 'raw';
    this.onTouched();
  }

  onPolicyChanged(event: Event): void {
    const policy = (event as CustomEvent<{ policy: unknown }>).detail?.policy;
    if (policy == null) return;
    this.value = JSON.stringify(policy, null, 2);
    this.onChange(this.value);
  }

  /** Registers `<odrl-policy-editor>`; a separate method so tests can skip loading the bundle. */
  protected loadEditor(): Promise<unknown> {
    return import('@seamware/odrl-policy-editor');
  }

  private parse(text: string): Record<string, unknown> | undefined {
    if (text.trim() === '') return undefined;
    try {
      const parsed = JSON.parse(text);
      return parsed !== null && typeof parsed === 'object' ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
}
