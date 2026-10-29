import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { OdrlPolicyInputComponent } from './odrl-policy-input.component';

/** Stubs the bundle load: the real one pulls in React and is not what is under test. */
class TestOdrlPolicyInputComponent extends OdrlPolicyInputComponent {
  loadCalls = 0;
  failLoad = false;
  protected override loadEditor(): Promise<unknown> {
    this.loadCalls++;
    return this.failLoad ? Promise.reject(new Error('offline')) : Promise.resolve();
  }
}

describe('OdrlPolicyInputComponent', () => {
  let component: TestOdrlPolicyInputComponent;
  let fixture: ComponentFixture<TestOdrlPolicyInputComponent>;
  const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement | null;
  /** The modal is moved to <body>, so it is not inside the fixture. */
  const inBody = (selector: string) => document.body.querySelector(selector) as HTMLElement | null;
  const editorChanged = (policy: unknown) =>
    inBody('odrl-policy-editor')!.dispatchEvent(new CustomEvent('policy-changed', { detail: { policy } }));

  async function open(text = '{"@type":"odrl:Policy"}'): Promise<void> {
    component.writeValue(text);
    await component.openEditor();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestOdrlPolicyInputComponent, ReactiveFormsModule, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(TestOdrlPolicyInputComponent);
    component = fixture.componentInstance;
    component.label = 'My policy';
    component.inputId = 'policy';
    fixture.detectChanges();
  });

  it('should create with the textarea shown and no modal', () => {
    expect(component).toBeTruthy();
    expect(el('textarea')).not.toBeNull();
    expect(inBody('odrl-policy-editor')).toBeNull();
  });

  describe('label row', () => {
    it('puts the open-editor button on the same row as the title', () => {
      const row = el('label')!.parentElement!;

      expect(row.contains(el('app-button'))).toBeTrue();
      expect(row.classList).toContain('items-center');
      expect(row.classList).toContain('justify-between');
    });

    it('points the label at the textarea and marks a required field', () => {
      component.required = true;
      fixture.detectChanges();

      expect(el('label')!.getAttribute('for')).toBe('policy');
      expect(el('textarea')!.id).toBe('policy');
      expect(el('label')!.textContent).toContain('*');
    });
  });

  it('writeValue shows the text, and stringifies an object', () => {
    component.writeValue('{"a":1}');
    expect(component.value).toBe('{"a":1}');

    component.writeValue({ a: 1 });
    expect(component.value).toBe(JSON.stringify({ a: 1 }, null, 2));

    component.writeValue(null);
    expect(component.value).toBe('');
  });

  it('emits the typed text to the form control', () => {
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);

    component.onInput('{"b":2}');

    expect(onChange).toHaveBeenCalledWith('{"b":2}');
  });

  describe('JSON validity', () => {
    it('treats empty text as valid and lets the editor open', () => {
      component.writeValue('');
      expect(component.validJson).toBeTrue();
      expect(component.canOpenEditor).toBeTrue();
    });

    it('rejects unparseable text, shows the message and blocks the editor', () => {
      component.writeValue('{not json');
      fixture.detectChanges();

      expect(component.validJson).toBeFalse();
      expect(component.canOpenEditor).toBeFalse();
      expect(fixture.nativeElement.textContent).toContain('FORMS.ODRL_POLICY._invalid_json');
    });

    it('rejects JSON that is not an object', () => {
      component.writeValue('42');
      expect(component.canOpenEditor).toBeFalse();
    });
  });

  describe('visual editor modal', () => {
    it('loads the bundle and opens the modal on <body> with the parsed policy', async () => {
      await open();

      expect(component.loadCalls).toBe(1);
      expect(component.editorOpen).toBeTrue();
      expect(component.editorPolicy).toEqual({ '@type': 'odrl:Policy' });
      const editor = inBody('odrl-policy-editor')!;
      expect(editor).not.toBeNull();
      // Moved out of the form so no ancestor's overflow/transform can clip it.
      expect(fixture.nativeElement.contains(editor)).toBeFalse();
      expect(document.body.contains(editor)).toBeTrue();
      // The textarea stays in the form behind the modal.
      expect(el('textarea')).not.toBeNull();
    });

    it('runs the editor with every PAP capability off', async () => {
      await open();

      const editor = inBody('odrl-policy-editor')!;
      for (const capability of ['load', 'save', 'validate', 'templates', 'mappings']) {
        expect(editor.getAttribute(capability)).toBe('none');
      }
      expect(editor.hasAttribute('api-base-url')).toBeFalse();
    });

    it('hands the editor the marketplace theme mapped on the host', async () => {
      fixture.nativeElement.style.setProperty('--odrl-primary-color', 'rgb(1 2 3)');
      fixture.nativeElement.style.setProperty('--odrl-card-bg', 'rgb(4 5 6)');

      await open();

      const config = (inBody('odrl-policy-editor') as any).themeConfig;
      expect(config['odrl-primary-color']).toBe('rgb(1 2 3)');
      expect(config['odrl-card-bg']).toBe('rgb(4 5 6)');
      // Not overridden here: comes from the stylesheet's mapping onto the marketplace token.
      expect(config['odrl-text-color']).toBe(
        getComputedStyle(document.body).getPropertyValue('--theme-default-text').trim());
    });

    it('leaves Cancel to the modal footer and puts the summary in a tab', async () => {
      await open();

      const editor = inBody('odrl-policy-editor')!;
      expect(editor.hasAttribute('hide-cancel-button')).toBeTrue();
      expect(editor.getAttribute('summary')).toBe('tab');
    });

    it('scrolls the editor in its own area instead of growing the modal', async () => {
      await open();

      const area = inBody('odrl-policy-editor')!.parentElement!;
      expect(area.classList).toContain('overflow-y-auto');
      expect(Array.from(area.classList).some(c => c.startsWith('max-h-'))).toBeTrue();
    });

    it('keeps edits in a draft and only writes them on Apply', async () => {
      const onChange = jasmine.createSpy('onChange');
      component.registerOnChange(onChange);
      await open('{"a":0}');

      editorChanged({ a: 1 });
      expect(component.value).toBe('{"a":0}');
      expect(onChange).not.toHaveBeenCalled();

      component.applyEditor();
      fixture.detectChanges();

      const expected = JSON.stringify({ a: 1 }, null, 2);
      expect(component.value).toBe(expected);
      expect(onChange).toHaveBeenCalledWith(expected);
      expect(component.editorOpen).toBeFalse();
      expect(inBody('odrl-policy-editor')).toBeNull();
      expect((el('textarea') as HTMLTextAreaElement).value).toBe(expected);
    });

    it('discards the draft on Cancel', async () => {
      const onChange = jasmine.createSpy('onChange');
      component.registerOnChange(onChange);
      await open('{"a":0}');
      editorChanged({ a: 1 });

      component.cancelEditor();
      fixture.detectChanges();

      expect(component.value).toBe('{"a":0}');
      expect(onChange).not.toHaveBeenCalled();
      expect(inBody('odrl-policy-editor')).toBeNull();
    });

    it('closes on Apply without touching the value when nothing was edited', async () => {
      const onChange = jasmine.createSpy('onChange');
      component.registerOnChange(onChange);
      await open('{"a":0}');

      component.applyEditor();

      expect(component.value).toBe('{"a":0}');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('marks the control as touched when the modal closes', async () => {
      const onTouched = jasmine.createSpy('onTouched');
      component.registerOnTouched(onTouched);
      await open();

      component.cancelEditor();

      expect(onTouched).toHaveBeenCalled();
    });

    it('ignores a policy-changed event without a policy', async () => {
      await open('{"a":0}');

      component.onPolicyChanged(new CustomEvent('policy-changed', { detail: {} }));
      component.applyEditor();

      expect(component.value).toBe('{"a":0}');
    });

    it('stays closed and reports it when the bundle cannot be loaded', async () => {
      component.failLoad = true;

      await component.openEditor();
      fixture.detectChanges();

      expect(component.editorOpen).toBeFalse();
      expect(component.editorLoadFailed).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain('FORMS.ODRL_POLICY._editor_load_failed');
    });

    it('removes the modal from <body> when the component is destroyed while open', async () => {
      await open();
      expect(inBody('odrl-policy-editor')).not.toBeNull();

      fixture.destroy();

      expect(inBody('odrl-policy-editor')).toBeNull();
    });
  });

  describe('readonly', () => {
    it('hides the open button and makes the textarea read-only', () => {
      component.readonly = true;
      fixture.detectChanges();

      expect(el('app-button')).toBeNull();
      expect(el('textarea')!.hasAttribute('readonly')).toBeTrue();
    });

    it('does not open the editor when disabled by the form', async () => {
      component.setDisabledState(true);

      await component.openEditor();

      expect(component.editorOpen).toBeFalse();
      expect(component.loadCalls).toBe(0);
    });
  });
});

@Component({
  standalone: true,
  imports: [OdrlPolicyInputComponent, ReactiveFormsModule],
  template: `<app-odrl-policy-input [formControl]="control" label="Policy" />`,
})
class HostComponent {
  control = new FormControl('{"x":1}');
}

describe('OdrlPolicyInputComponent as a form control', () => {
  it('reads and writes through the FormControl', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent, TranslateModule.forRoot()] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;

    expect(textarea.value).toBe('{"x":1}');

    textarea.value = '{"y":2}';
    textarea.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.control.value).toBe('{"y":2}');
    expect(fixture.componentInstance.control.dirty).toBeTrue();
  });
});
