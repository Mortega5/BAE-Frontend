import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ViewToggleComponent } from './view-toggle.component';

describe('ViewToggleComponent', () => {
  let fixture: ComponentFixture<ViewToggleComponent>;
  let component: ViewToggleComponent;

  const buttons = () => fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewToggleComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should mark the current mode as pressed', () => {
    const [grid, list] = Array.from(buttons());
    expect(grid.getAttribute('aria-pressed')).toBe('true');
    expect(list.getAttribute('aria-pressed')).toBe('false');
  });

  it('should emit the new mode when switching', () => {
    spyOn(component.modeChange, 'emit');

    buttons()[1].click();
    fixture.detectChanges();

    expect(component.modeChange.emit).toHaveBeenCalledWith('list');
    expect(buttons()[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('should not emit when clicking the current mode', () => {
    spyOn(component.modeChange, 'emit');
    buttons()[0].click();
    expect(component.modeChange.emit).not.toHaveBeenCalled();
  });
});
