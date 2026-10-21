import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EmptyStateComponent } from './empty-state.component';

@Component({
  standalone: true,
  imports: [EmptyStateComponent],
  template: `
    <app-empty-state heading="LIST._empty" [description]="description">
      @if (withAction) { <button class="cta">Go</button> }
    </app-empty-state>`,
})
class HostComponent {
  description?: string = 'LIST._empty_desc';
  withAction = true;
}

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const el = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement | null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('should render the heading, description and projected actions', () => {
    expect(el('.app-empty-state__title')?.textContent).toContain('LIST._empty');
    expect(el('.app-empty-state__description')?.textContent).toContain('LIST._empty_desc');
    expect(el('.app-empty-state__actions .cta')).not.toBeNull();
  });

  it('should omit the description when none is given', () => {
    fixture.componentInstance.description = undefined;
    fixture.detectChanges();
    expect(el('.app-empty-state__description')).toBeNull();
  });
});
