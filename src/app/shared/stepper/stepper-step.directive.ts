import { Directive, TemplateRef } from '@angular/core';

@Directive({
  selector: '[stepperStep]',
  standalone: true,
})
export class StepperStepDirective {
  constructor(public templateRef: TemplateRef<void>) {}
}
