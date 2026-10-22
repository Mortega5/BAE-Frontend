import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { TabDirective } from './tab.directive';
import { TabsComponent } from './tabs.component';

@Component({
  standalone: true,
  imports: [TabsComponent, TabDirective],
  template: `
    <app-tabs [(activeTab)]="active">
      <ng-template appTab="First" tabId="first" dataCy="firstTab"><p class="body">first body</p></ng-template>
      <ng-template appTab="Second" tabId="second" [tabHidden]="hideSecond"><p class="body">second body</p></ng-template>
      <ng-template appTab="Third" tabId="third"></ng-template>
      <p class="shared">shared body</p>
    </app-tabs>
  `,
})
class HostComponent {
  active?: string;
  hideSecond = false;
}

describe('TabsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  const tabButtons = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]'));
  const body = (): string | undefined => fixture.nativeElement.querySelector('.body')?.textContent;

  it('defaults to the first visible tab', () => {
    expect(tabButtons().length).toBe(3);
    expect(tabButtons()[0].getAttribute('aria-selected')).toBe('true');
    expect(body()).toBe('first body');
  });

  it('switches tab on click and emits the new id', () => {
    tabButtons()[1].click();
    fixture.detectChanges();

    expect(host.active).toBe('second');
    expect(body()).toBe('second body');
  });

  it('renders the projected body for every tab, even one without its own body', () => {
    tabButtons()[2].click();
    fixture.detectChanges();

    expect(body()).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.shared')?.textContent).toBe('shared body');
  });

  it('hides tabs marked as hidden and falls back when the active one is hidden', () => {
    host.active = 'second';
    fixture.detectChanges();
    host.hideSecond = true;
    fixture.detectChanges();

    expect(tabButtons().length).toBe(2);
    expect(body()).toBe('first body');
  });

  it('sets data-cy on the tab button', () => {
    expect(tabButtons()[0].getAttribute('data-cy')).toBe('firstTab');
  });
});
