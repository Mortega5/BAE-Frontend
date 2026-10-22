import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';

import { StepperStepDirective } from './stepper-step.directive';
import { StepperComponent } from './stepper.component';

@Component({
  standalone: true,
  imports: [StepperComponent, StepperStepDirective],
  template: `
    <app-stepper [canAdvance]="true" [startAt]="startAt" [beforeNext]="beforeNext">
      <ng-template stepperStep="One" stepId="one"><p class="body">one</p></ng-template>
      <ng-template stepperStep="Two" stepId="two"><p class="body">two</p></ng-template>
      <ng-template stepperStep="Three" stepId="three"><p class="body">three</p></ng-template>
    </app-stepper>
  `,
})
class HostComponent {
  startAt = 0;
  beforeNext?: (stepId: string | undefined) => boolean | Promise<boolean>;
}

describe('StepperComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  const stepper = () => fixture.debugElement.query(By.directive(StepperComponent)).componentInstance as StepperComponent;

  it('advances freely without a beforeNext hook', async () => {
    fixture.detectChanges();

    await stepper().goNext();

    expect(stepper().currentStep).toBe(1);
  });

  it('opens on the startAt step with the earlier ones visited', () => {
    host.startAt = 2;
    fixture.detectChanges();

    expect(stepper().currentStep).toBe(2);
    expect(stepper().canNavigate(0)).toBeTrue();
  });

  it('stays on the step when beforeNext refuses, and advances when it accepts', async () => {
    const results = [false, true];
    host.beforeNext = jasmine.createSpy('beforeNext').and.callFake(() => Promise.resolve(results.shift()!));
    fixture.detectChanges();

    await stepper().goNext();
    expect(stepper().currentStep).toBe(0);

    await stepper().goNext();
    expect(stepper().currentStep).toBe(1);
    expect(host.beforeNext).toHaveBeenCalledWith('one');
  });

  it('only lets a step click move forward one step through beforeNext', async () => {
    host.beforeNext = jasmine.createSpy('beforeNext').and.returnValue(true);
    fixture.detectChanges();

    stepper().handleStepClick(2);
    expect(stepper().currentStep).toBe(0);
    expect(host.beforeNext).not.toHaveBeenCalled();
  });
});
