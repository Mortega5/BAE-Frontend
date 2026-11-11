import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SearchInputComponent } from './search-input.component';

describe('SearchInputComponent', () => {
  let fixture: ComponentFixture<SearchInputComponent>;
  let component: SearchInputComponent;
  let control: FormControl;

  const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement | null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchInputComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchInputComponent);
    component = fixture.componentInstance;
    control = new FormControl('');
    component.control = control;
    fixture.detectChanges();
  });

  it('should only show the clear button while there is text', () => {
    expect(el('.app-search-input__clear')).toBeNull();

    control.setValue('cloud');
    fixture.detectChanges();
    expect(el('.app-search-input__clear')).not.toBeNull();
  });

  it('should reset the control when clearing', () => {
    control.setValue('cloud');
    fixture.detectChanges();

    el('.app-search-input__clear')!.click();
    fixture.detectChanges();

    expect(control.value).toBeNull();
    expect(el('.app-search-input__clear')).toBeNull();
  });

  it('should emit search on submit', () => {
    spyOn(component.search, 'emit');
    el('.app-search-input__submit')!.click();
    expect(component.search.emit).toHaveBeenCalled();
  });
});
