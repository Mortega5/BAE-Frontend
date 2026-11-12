import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { SegmentedToggleComponent, SegmentedToggleOption } from './segmented-toggle.component';

@Component({
  standalone: true,
  imports: [SegmentedToggleComponent],
  template: `<app-segmented-toggle [options]="options" [value]="value" label="NS._group" (valueChange)="changed($event)" />`,
})
class HostComponent {
  options: SegmentedToggleOption[] = [
    { value: 'a', label: 'NS._a', dataCy: 'optionA' },
    { value: 'b', label: 'NS._b', dataCy: 'optionB' },
  ];
  value = 'a';
  changed = jasmine.createSpy('changed');
}

describe('SegmentedToggleComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const button = (cy: string) => fixture.nativeElement.querySelector(`[data-cy="${cy}"]`) as HTMLButtonElement;
  const thumb = () => fixture.nativeElement.querySelector('[data-cy="segmentedToggleThumb"]') as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent, TranslateModule.forRoot()] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('marks the chosen option as pressed', () => {
    expect(button('optionA').getAttribute('aria-pressed')).toBe('true');
    expect(button('optionB').getAttribute('aria-pressed')).toBe('false');
  });

  it('puts the raised piece under the chosen option', () => {
    expect(thumb().style.transform).toBe('translateX(0%)');
    fixture.componentInstance.value = 'b';
    fixture.detectChanges();
    expect(thumb().style.transform).toBe('translateX(100%)');
  });

  it('emits the value of the option that is clicked, and nothing for the chosen one', () => {
    button('optionA').click();
    expect(fixture.componentInstance.changed).not.toHaveBeenCalled();
    button('optionB').click();
    expect(fixture.componentInstance.changed).toHaveBeenCalledOnceWith('b');
  });

  it('names the group for assistive technology', () => {
    expect(fixture.nativeElement.querySelector('[role="group"]').getAttribute('aria-label')).toBe('NS._group');
  });
});
