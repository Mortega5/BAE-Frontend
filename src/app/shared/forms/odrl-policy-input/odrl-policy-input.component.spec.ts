import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Component } from '@angular/core';
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestOdrlPolicyInputComponent, ReactiveFormsModule, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(TestOdrlPolicyInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with the raw textarea shown', () => {
    expect(component).toBeTruthy();
    expect(el('textarea')).not.toBeNull();
    expect(el('odrl-policy-editor')).toBeNull();
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

  it('marks the control as touched on blur and when going back to raw', () => {
    const onTouched = jasmine.createSpy('onTouched');
    component.registerOnTouched(onTouched);

    component.onBlur();
    component.showRaw();

    expect(onTouched).toHaveBeenCalledTimes(2);
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

  describe('visual editor', () => {
    it('loads the bundle, passes the parsed policy and switches to the editor', async () => {
      component.writeValue('{"@type":"odrl:Policy"}');

      await component.showEditor();
      fixture.detectChanges();

      expect(component.loadCalls).toBe(1);
      expect(component.mode).toBe('visual');
      expect(component.editorPolicy).toEqual({ '@type': 'odrl:Policy' });
      const editor = el('odrl-policy-editor')!;
      expect(editor).not.toBeNull();
      expect(el('textarea')).toBeNull();
      // Nothing may go to a PAP backend.
      for (const capability of ['load', 'save', 'validate', 'templates', 'mappings']) {
        expect(editor.getAttribute(capability)).toBe('none');
      }
      expect(editor.hasAttribute('api-base-url')).toBeFalse();
    });

    it('writes edits from the editor back as JSON text', async () => {
      const onChange = jasmine.createSpy('onChange');
      component.registerOnChange(onChange);
      await component.showEditor();
      fixture.detectChanges();

      el('odrl-policy-editor')!.dispatchEvent(new CustomEvent('policy-changed', { detail: { policy: { a: 1 } } }));

      const expected = JSON.stringify({ a: 1 }, null, 2);
      expect(component.value).toBe(expected);
      expect(onChange).toHaveBeenCalledWith(expected);
    });

    it('ignores a policy-changed event without a policy', async () => {
      component.writeValue('{"a":1}');
      await component.showEditor();

      component.onPolicyChanged(new CustomEvent('policy-changed', { detail: {} }));

      expect(component.value).toBe('{"a":1}');
    });

    it('shows the edited JSON again when going back to raw', async () => {
      await component.showEditor();
      fixture.detectChanges();
      el('odrl-policy-editor')!.dispatchEvent(new CustomEvent('policy-changed', { detail: { policy: { a: 1 } } }));

      component.showRaw();
      fixture.detectChanges();

      expect((el('textarea') as HTMLTextAreaElement).value).toBe(JSON.stringify({ a: 1 }, null, 2));
    });

    it('stays on the textarea and reports it when the bundle cannot be loaded', async () => {
      component.failLoad = true;

      await component.showEditor();
      fixture.detectChanges();

      expect(component.mode).toBe('raw');
      expect(component.editorLoadFailed).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain('FORMS.ODRL_POLICY._editor_load_failed');
    });
  });

  describe('readonly', () => {
    it('hides the editor switch and makes the textarea read-only', () => {
      component.readonly = true;
      fixture.detectChanges();

      expect(el('app-button')).toBeNull();
      expect(el('textarea')!.hasAttribute('readonly')).toBeTrue();
    });

    it('does not open the editor when disabled by the form', async () => {
      component.setDisabledState(true);

      await component.showEditor();

      expect(component.mode).toBe('raw');
      expect(component.loadCalls).toBe(0);
    });
  });
});

@Component({
  standalone: true,
  imports: [OdrlPolicyInputComponent, ReactiveFormsModule],
  template: `<app-odrl-policy-input [formControl]="control" />`,
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
