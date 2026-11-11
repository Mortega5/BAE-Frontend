import { AfterViewInit, Component, ElementRef, forwardRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CompletionSource } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { Diagnostic, lintGutter, linter } from '@codemirror/lint';
import { Compartment, EditorState, Text } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { placeholder as placeholderExtension } from '@codemirror/view';
import { basicSetup, EditorView } from 'codemirror';
import * as yamlParser from 'js-yaml';
import { CodeLanguage, CodeTheme } from 'src/app/models/formFields/form-field.model';

function yamlParseLinter() {
  return (view: EditorView): Diagnostic[] => {
    const doc = view.state.doc.toString();
    if (!doc.trim()) return [];
    try {
      yamlParser.load(doc);
      return [];
    } catch (error: any) {
      const mark = error?.mark;
      const pos = mark?.position != null ? Math.min(mark.position, doc.length) : 0;
      return [{
        from: pos,
        to: pos,
        severity: 'error',
        message: error?.reason ?? error?.message ?? 'Invalid YAML',
      }];
    }
  };
}

const LANG_EXTENSIONS: Record<CodeLanguage, () => any> = {
  json: () => json(),
  yaml: () => yaml(),
  typescript: () => javascript({ typescript: true }),
  javascript: () => javascript(),
};

const LANG_LINTERS: Partial<Record<CodeLanguage, () => any>> = {
  json: () => [linter(jsonParseLinter()), lintGutter()],
  yaml: () => [linter(yamlParseLinter()), lintGutter()],
};

/** Pretty-prints JSON, or returns null when the text isn't valid JSON. */
function formatJson(text: string): string | null {
  if (!text.trim()) return null;
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return null;
  }
}

const HIDE_LINE_NUMBERS = EditorView.theme({
  '.cm-gutters': { display: 'none' },
  '.cm-content': { paddingLeft: '0.25rem' },
});

// Neutralizes CodeMirror's own background/border so the Tailwind wrapper takes over.
const INPUT_THEME = EditorView.theme({
  '&': { background: 'transparent !important', border: 'none', outline: 'none', maxHeight: 'inherit', minHeight: 'inherit' },
  '&.cm-focused': { outline: 'none !important' },
  '.cm-scroller': {
    overflow: 'auto',
    flexGrow: 1,
    padding: '0.125rem 0.25rem',
    fontSize: '0.875rem',
    lineHeight: '1.5rem',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  '.cm-content': { whiteSpace: 'pre !important', caretColor: 'currentColor' },
  '.cm-gutters': { background: 'transparent !important', border: 'none' },
});

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [ButtonComponent, TranslateModule],
  templateUrl: './code-editor.component.html',
  styleUrl: './code-editor.component.scss',
  host: { class: 'block min-w-0 max-w-full' },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CodeEditorComponent), multi: true },
  ],
})
export class CodeEditorComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {
  @Input() language: CodeLanguage = 'json';
  @Input() minHeight = '120px';
  /** Past this height the editor scrolls inside its box instead of growing with the content. */
  @Input() maxHeight = '400px';
  @Input() readonly = false;
  @Input() lineNumbers = true;
  @Input() theme: CodeTheme = 'auto';
  @Input() placeholder = '';
  /** JSON only: reformat on paste when the resulting document is valid JSON; invalid pastes go through as-is. */
  @Input() formatOnPaste = false;
  /** JSON only: show a Format button, enabled while the content is well-formed JSON. */
  @Input() formatButton = false;
  /** Extra completion source, merged with whatever the language already provides rather than
   * replacing it, so YAML keeps its own completions. */
  @Input() completions?: CompletionSource;

  @ViewChild('container') private container!: ElementRef<HTMLElement>;

  isDisabled = false;

  private view?: EditorView;
  private themeCompartment = new Compartment();
  private readonlyCompartment = new Compartment();
  private lineNumbersCompartment = new Compartment();
  private pendingValue = '';
  private skipNextEmit = false;
  private observer?: MutationObserver;
  private formatCheckedDoc?: Text;
  private formatCheckResult = false;

  private onChange: (v: string) => void = () => { };
  private onTouched: () => void = () => { };

  ngAfterViewInit(): void {
    this.view = new EditorView({
      state: EditorState.create({
        doc: this.pendingValue,
        extensions: [
          basicSetup,
          LANG_EXTENSIONS[this.language]?.() ?? [],
          LANG_LINTERS[this.language]?.() ?? [],
          this.themeCompartment.of(this.resolveTheme()),
          this.readonlyCompartment.of(EditorState.readOnly.of(this.readonly || this.isDisabled)),
          this.lineNumbersCompartment.of(this.lineNumbers ? [] : HIDE_LINE_NUMBERS),
          INPUT_THEME,
          EditorView.domEventHandlers({ paste: (event, view) => this.onPaste(event, view) }),
          this.placeholder ? placeholderExtension(this.placeholder) : [],
          this.completions ? EditorState.languageData.of(() => [{ autocomplete: this.completions }]) : [],
          EditorView.updateListener.of(update => {
            if (!update.docChanged || this.skipNextEmit) {
              this.skipNextEmit = false;
              return;
            }
            this.onChange(update.state.doc.toString());
            this.onTouched();
          }),
        ],
      }),
      parent: this.container.nativeElement,
    });

    if (this.theme === 'auto') {
      this.observer = new MutationObserver(() => {
        this.view?.dispatch({ effects: this.themeCompartment.reconfigure(this.resolveTheme()) });
      });
      this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /** Derived from the editor state and cached per document, so it stays in sync with writeValue
   * and typing without being re-parsed on every change detection. */
  get canFormat(): boolean {
    if (!this.view || this.readonly || this.isDisabled) return false;
    const doc = this.view.state.doc;
    if (doc !== this.formatCheckedDoc) {
      this.formatCheckedDoc = doc;
      this.formatCheckResult = formatJson(doc.toString()) !== null;
    }
    return this.formatCheckResult;
  }

  format(): void {
    if (!this.view || !this.canFormat) return;
    const formatted = formatJson(this.view.state.doc.toString());
    if (formatted === null) return;
    this.view.dispatch({ changes: { from: 0, to: this.view.state.doc.length, insert: formatted } });
  }

  private onPaste(event: ClipboardEvent, view: EditorView): boolean {
    if (!this.formatOnPaste || this.language !== 'json' || this.readonly || this.isDisabled) return false;
    const text = event.clipboardData?.getData('text/plain');
    const selection = view.state.selection;
    if (!text || selection.ranges.length !== 1) return false;
    const { from, to } = selection.main;
    const doc = view.state.doc;
    const formatted = formatJson(doc.sliceString(0, from) + text + doc.sliceString(to));
    if (formatted === null) return false; // let the browser paste it untouched
    event.preventDefault();
    view.dispatch({
      changes: { from: 0, to: doc.length, insert: formatted },
      selection: { anchor: formatted.length },
      scrollIntoView: true,
      userEvent: 'input.paste',
    });
    return true;
  }

  private resolveTheme(): any {
    if (this.theme === 'oneDark') return oneDark;
    if (this.theme === 'auto') return document.documentElement.classList.contains('dark') ? oneDark : [];
    return [];
  }

  ngOnDestroy(): void {
    this.view?.destroy();
    this.observer?.disconnect();
  }

  writeValue(value: string): void {
    const str = typeof value === 'string' ? value : value != null ? JSON.stringify(value, null, 2) : '';
    if (!this.view) { this.pendingValue = str; return; }
    if (this.view.state.doc.toString() === str) return;
    this.skipNextEmit = true;
    this.view.dispatch({ changes: { from: 0, to: this.view.state.doc.length, insert: str } });
  }

  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  setDisabledState(disabled: boolean): void {
    this.isDisabled = disabled;
    this.view?.dispatch({
      effects: this.readonlyCompartment.reconfigure(EditorState.readOnly.of(disabled || this.readonly)),
    });
  }
}
