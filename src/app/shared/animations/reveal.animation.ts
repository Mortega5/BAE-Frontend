import { animate, style, transition, trigger } from '@angular/animations';

/** For a block that appears or disappears when the user changes something (a field that only applies to one choice):
 * it grows and fades in, and collapses and fades out, instead of popping. Bind it as `[@reveal]` on an element that
 * is `display: block` (a custom element needs `class="block"`) and list it in the component's `animations`. */
export const reveal = trigger('reveal', [
  transition(':enter', [
    style({ height: 0, opacity: 0, overflow: 'hidden' }),
    animate('200ms ease-out', style({ height: '*', opacity: 1 })),
  ]),
  transition(':leave', [
    style({ overflow: 'hidden' }),
    animate('150ms ease-in', style({ height: 0, opacity: 0 })),
  ]),
]);
