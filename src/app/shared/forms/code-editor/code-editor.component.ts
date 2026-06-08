import { AfterViewInit, Component, ElementRef, forwardRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { javascript } from '@codemirror/lang-javascript';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { lintGutter, linter } from '@codemirror/lint';
import { Compartment, EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup, EditorView } from 'codemirror';
import { CodeLanguage, CodeTheme } from 'src/app/models/formFields/form-field.model';

const LANG_EXTENSIONS: Record<CodeLanguage, () => any> = {
  json: () => json(),
  yaml: () => yaml(),
  typescript: () => javascript({ typescript: true }),
  javascript: () => javascript(),
};

const LANG_LINTERS: Partial<Record<CodeLanguage, () => any>> = {
  json: () => [linter(jsonParseLinter()), lintGutter()],
};

const HIDE_LINE_NUMBERS = EditorView.theme({
  '.cm-gutters': { display: 'none' },
  '.cm-content': { paddingLeft: '0.75rem' },
});

// Neutralizes CodeMirror's own background/border so the Tailwind wrapper takes over.
const INPUT_THEME = EditorView.theme({
  '&': { background: 'transparent !important', border: 'none', outline: 'none' },
  '&.cm-focused': { outline: 'none !important' },
  '.cm-scroller': {
    padding: '0.5rem 0.75rem',
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
  templateUrl: './code-editor.component.html',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CodeEditorComponent), multi: true },
  ],
})
export class CodeEditorComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {
  @Input() language: CodeLanguage = 'json';
  @Input() minHeight = '120px';
  @Input() readonly = false;
  @Input() lineNumbers = true;
  @Input() theme: CodeTheme = 'auto';

  @ViewChild('container') private container!: ElementRef<HTMLElement>;

  isDisabled = false;

  private view?: EditorView;
  private themeCompartment = new Compartment();
  private readonlyCompartment = new Compartment();
  private lineNumbersCompartment = new Compartment();
  private pendingValue = '';
  private skipNextEmit = false;
  private observer?: MutationObserver;

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
    const str = value ?? '';
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
