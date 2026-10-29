import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef, Component, ElementRef, forwardRef, inject, Input, OnDestroy, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent } from '../../button/button.component';
import { ModalComponent } from '../../modal/modal.component';

/** Theme tokens of the editor (its `themeConfig` keys). Their values come from the `--<token>` custom
 * properties the stylesheet maps onto the marketplace's own tokens. */
const ODRL_THEME_TOKENS = [
  'odrl-primary-color', 'odrl-secondary-color', 'odrl-bg-color', 'odrl-text-color', 'odrl-text-muted',
  'odrl-card-bg', 'odrl-border-color', 'odrl-font-family', 'odrl-border-radius', 'odrl-section-header-bg',
  'odrl-success-color', 'odrl-danger-color', 'odrl-info-color',
] as const;

/** An ODRL policy as raw JSON text, with a button next to the title that opens the visual
 * `<odrl-policy-editor>` from `@seamware/odrl-policy-editor` in a modal. The form value is always the
 * JSON text and the modal edits a draft that only reaches it on Apply. The editor runs with every
 * PAP capability off, so nothing is loaded, saved or validated against a backend. Its bundle (it
 * carries React) is only fetched the first time the modal is opened.
 *
 * Renders its own label row, because the button has to sit on the title's line; dynamic-form skips
 * its generic label for this field type. */
@Component({
  selector: 'app-odrl-policy-input',
  standalone: true,
  imports: [TranslateModule, ButtonComponent, ModalComponent, FaIconComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './odrl-policy-input.component.html',
  styleUrl: './odrl-policy-input.component.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => OdrlPolicyInputComponent), multi: true },
  ],
})
export class OdrlPolicyInputComponent implements ControlValueAccessor, OnDestroy {
  @Input() label = '';
  @Input() required = false;
  @Input() icon?: IconDefinition;
  /** Id of the textarea, so the label's `for` points at it (not bound as `id`: that is the host's own attribute). */
  @Input() inputId?: string;
  @Input() rows = 8;
  @Input() placeholder = '';
  @Input() readonly = false;
  @Input() dataCy?: string;

  value = '';
  isDisabled = false;
  editorOpen = false;
  loadingEditor = false;
  editorLoadFailed = false;
  /** Policy the editor starts from, taken from the text when the modal opens. */
  editorPolicy?: Record<string, unknown>;
  editorTheme: 'light' | 'dark' = 'light';
  /** The marketplace's theme as the editor's tokens, read when it opens. Tokens left empty keep the editor's own. */
  editorThemeConfig: Record<string, string> = {};
  /** Last policy the editor reported; committed to the control on Apply, dropped on Cancel. */
  private draft: string | null = null;
  private portalElement?: HTMLElement;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private onChange: (v: string) => void = () => { };
  private onTouched: () => void = () => { };

  /** The modal's markup is moved to <body> once rendered: an ancestor with `overflow`, `transform`
   * or `filter` would otherwise clip or re-anchor its `fixed` backdrop. */
  @ViewChild('portal') set portal(ref: ElementRef<HTMLElement> | undefined) {
    this.portalElement = ref?.nativeElement;
    if (this.portalElement && this.portalElement.parentElement !== document.body) {
      document.body.appendChild(this.portalElement);
    }
  }

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

  async openEditor(): Promise<void> {
    if (!this.canOpenEditor) return;
    this.loadingEditor = true;
    this.editorLoadFailed = false;
    try {
      await this.loadEditor();
      this.editorPolicy = this.parse(this.value);
      this.editorTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      this.editorThemeConfig = this.readThemeConfig();
      this.draft = null;
      this.editorOpen = true;
    } catch {
      this.editorLoadFailed = true;
    } finally {
      this.loadingEditor = false;
      this.cdr.markForCheck();
    }
  }

  applyEditor(): void {
    if (this.draft !== null) {
      this.value = this.draft;
      this.onChange(this.value);
    }
    this.closeEditor();
  }

  cancelEditor(): void {
    this.closeEditor();
  }

  onPolicyChanged(event: Event): void {
    const policy = (event as CustomEvent<{ policy: unknown }>).detail?.policy;
    if (policy == null) return;
    this.draft = JSON.stringify(policy, null, 2);
  }

  ngOnDestroy(): void {
    this.portalElement?.remove();
  }

  /** Registers `<odrl-policy-editor>`; a separate method so tests can skip loading the bundle. */
  protected loadEditor(): Promise<unknown> {
    return import('@seamware/odrl-policy-editor');
  }

  private readThemeConfig(): Record<string, string> {
    const style = getComputedStyle(this.host.nativeElement);
    const config: Record<string, string> = {};
    for (const token of ODRL_THEME_TOKENS) {
      const value = style.getPropertyValue(`--${token}`).trim();
      if (value) config[token] = value;
    }
    return config;
  }

  private closeEditor(): void {
    this.editorOpen = false;
    this.draft = null;
    this.onTouched();
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
