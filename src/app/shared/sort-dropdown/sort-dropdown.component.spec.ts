import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { SortDropdownComponent, SortOption } from './sort-dropdown.component';

@Component({
  standalone: true,
  imports: [SortDropdownComponent],
  template: `<app-sort-dropdown [options]="options" [value]="value" label="NS._sort_by" (valueChange)="changed($event)" />`,
})
class HostComponent {
  options: SortOption[] = [
    { value: 'recent', label: 'NS._recent' },
    { value: 'name_asc', label: 'NS._name_asc' },
  ];
  value = 'recent';
  changed = jasmine.createSpy('changed');
}

describe('SortDropdownComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const toggle = () => fixture.nativeElement.querySelector('[data-cy="sortToggle"]') as HTMLButtonElement;
  const option = (value: string) => fixture.nativeElement.querySelector(`[data-cy="sort-${value}"]`) as HTMLButtonElement | null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent, TranslateModule.forRoot()] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('shows the label and the chosen option, with the menu closed', () => {
    expect(fixture.nativeElement.textContent).toContain('NS._sort_by');
    expect(toggle().textContent).toContain('NS._recent');
    expect(option('recent')).toBeNull();
  });

  it('opens a menu with every option and marks the chosen one', () => {
    toggle().click();
    fixture.detectChanges();

    expect(option('recent')!.getAttribute('aria-selected')).toBe('true');
    expect(option('name_asc')!.getAttribute('aria-selected')).toBe('false');
  });

  it('emits the option that is clicked and closes the menu', () => {
    toggle().click();
    fixture.detectChanges();
    option('name_asc')!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.changed).toHaveBeenCalledOnceWith('name_asc');
    expect(option('name_asc')).toBeNull();
  });

  it('emits nothing for the option that is already chosen', () => {
    toggle().click();
    fixture.detectChanges();
    option('recent')!.click();

    expect(fixture.componentInstance.changed).not.toHaveBeenCalled();
  });

  it('closes with a click anywhere else', () => {
    toggle().click();
    fixture.detectChanges();
    document.body.click();
    fixture.detectChanges();

    expect(option('recent')).toBeNull();
  });
});
