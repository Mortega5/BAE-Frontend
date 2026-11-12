import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DynamicFormComponent } from '../forms/dynamic-form/dynamic-form.component';
import { ExpandableTextComponent, truncate } from './expandable-text.component';

const LONG = 'Longest time, in seconds and up to one hour, that the BPO waits for the resource to be ready where it waits for it: '
  + 'the LXC health check, a RUNNING OneKS cluster, and the addresses of VMs and OneFlow services. For lxc it is one budget '
  + 'for the whole deployment.';

describe('truncate', () => {
  it('leaves text that fits, or nearly fits, alone', () => {
    expect(truncate('Image tag.', 160)).toBeUndefined();
    expect(truncate('x'.repeat(175), 160)).toBeUndefined();
  });

  it('cuts at the last word before the limit and adds an ellipsis', () => {
    const cut = truncate(LONG, 60)!;
    expect(cut).toBe('Longest time, in seconds and up to one hour, that the BPO…');
    expect(cut.length).toBeLessThanOrEqual(61);
  });

  it('cuts mid-word when there is no space near the limit', () => {
    expect(truncate('a'.repeat(300), 100)).toBe(`${'a'.repeat(100)}…`);
  });
});

describe('ExpandableTextComponent', () => {
  let fixture: ComponentFixture<ExpandableTextComponent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const render = (text: string, maxChars = 60) => {
    fixture.componentRef.setInput('text', text);
    fixture.componentRef.setInput('maxChars', maxChars);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ExpandableTextComponent, TranslateModule.forRoot()] });
    fixture = TestBed.createComponent(ExpandableTextComponent);
  });

  it('shows short text whole, with no button', () => {
    render('Image tag.');
    expect(el().textContent!.trim()).toBe('Image tag.');
    expect(el().querySelector('button')).toBeNull();
  });

  it('cuts long text, shows it whole on hover, and expands and collapses it', () => {
    render(LONG);
    const short = el().querySelector<HTMLElement>('[data-cy="expandableTextShort"]')!;
    expect(short.textContent).toContain('…');
    expect(short.title).toBe(LONG);

    const button = el().querySelector<HTMLButtonElement>('[data-cy="expandableTextToggle"]')!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    button.click();
    fixture.detectChanges();
    expect(el().querySelector('[data-cy="expandableTextFull"]')!.textContent).toBe(LONG);
    expect(button.textContent).toContain('FORMS._show_less');

    button.click();
    fixture.detectChanges();
    expect(el().querySelector('[data-cy="expandableTextShort"]')).toBeTruthy();
  });

  it('does not submit the form it sits in', () => {
    render(LONG);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    el().querySelector('button')!.dispatchEvent(event);
    expect(event.defaultPrevented).toBeTrue();
  });
});

describe('DynamicFormComponent hints', () => {
  it('cuts a long hint and keeps a short one whole', () => {
    TestBed.configureTestingModule({ imports: [DynamicFormComponent, TranslateModule.forRoot()] });
    const fixture = TestBed.createComponent(DynamicFormComponent);
    fixture.componentInstance.formGroup = new FormGroup({ a: new FormControl(''), b: new FormControl('') });
    fixture.componentInstance.fields = [
      { type: 'string', name: 'a', label: 'A', hint: LONG },
      { type: 'string', name: 'b', label: 'B', hint: 'Image tag.' },
    ];
    fixture.detectChanges();

    const toggles = (fixture.nativeElement as HTMLElement).querySelectorAll('[data-cy="expandableTextToggle"]');
    expect(toggles.length).toBe(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Image tag.');
  });
});
