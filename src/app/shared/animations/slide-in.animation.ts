import { animate, style, transition, trigger } from '@angular/animations';

/** For a view that takes the place of another when the user switches between them: it fades in while sliding from the
 * side the choice came from. Bind it as `[@slideIn]="{ value: <the view>, params: { from: '16px' } }"` (a negative
 * `from` slides from the left) on an element that is `display: block`, and list it in the component's `animations`.
 * The view that goes away does not animate, so the content never jumps. Disable it with `[@.disabled]` where it should
 * not run (the first render, or for who prefers reduced motion). */
export const slideIn = trigger('slideIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX({{ from }})' }),
    animate('250ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
  ], { params: { from: '16px' } }),
]);
