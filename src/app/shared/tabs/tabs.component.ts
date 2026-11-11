import { NgClass, NgTemplateOutlet } from '@angular/common';
import { AfterViewChecked, Component, ContentChildren, ElementRef, EventEmitter, Input, NgZone, OnDestroy, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { findButtonIcon } from 'src/app/config/popular-icons';
import { TabDirective } from './tab.directive';

/** Shared underlined tab strip, consolidating the hand-rolled "As customer / As provider"
 * tabs duplicated across product-orders and quotes. Tabs are declared as
 * `<ng-template appTab>` children; the active one's template is rendered below the strip,
 * followed by anything projected directly (a body shared by every tab). */
@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, FaIconComponent, TranslateModule],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss',
})
export class TabsComponent implements AfterViewChecked, OnDestroy {
  /** tabId of the active tab. Falls back to the first visible tab when unset or hidden. */
  @Input() activeTab?: string;
  @Output() activeTabChange = new EventEmitter<string>();
  /** Stretches the tabs to share the full width of the strip. */
  @Input() fullWidth = false;

  @ContentChildren(TabDirective) tabs!: QueryList<TabDirective>;
  @ViewChild('strip') private strip?: ElementRef<HTMLElement>;
  @ViewChild('indicator') private indicator?: ElementRef<HTMLElement>;
  @ViewChildren('tabButton') private buttons?: QueryList<ElementRef<HTMLElement>>;

  private resizeObserver?: ResizeObserver;
  private observing = false;
  private lastPlacement = '';

  constructor(private zone: NgZone) {}

  ngAfterViewChecked(): void {
    this.placeIndicator();
    if (!this.observing && this.strip && typeof ResizeObserver !== 'undefined') {
      // The strip changes size with the window or its container, which moves the tabs
      this.observing = true;
      this.zone.runOutsideAngular(() => {
        this.resizeObserver = new ResizeObserver(() => this.placeIndicator());
        this.resizeObserver.observe(this.strip!.nativeElement);
      });
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  /** Puts the indicator under the active tab. Written straight to the element: it is a presentation detail, and
   * binding it would change a value after the view was checked. */
  private placeIndicator(): void {
    const indicator = this.indicator?.nativeElement;
    const index = this.visibleTabs.findIndex(tab => tab === this.currentTab);
    const button = this.buttons?.get(index)?.nativeElement;
    if (!indicator || !button) return;
    // The button's box inside the strip, whatever row it wrapped to; the strip is the positioned parent
    const x = button.parentElement!.offsetLeft;
    const y = button.parentElement!.offsetTop + button.offsetHeight - indicator.offsetHeight;
    const width = button.offsetWidth;
    const placement = `${x}|${y}|${width}`;
    if (placement === this.lastPlacement) return;
    const first = this.lastPlacement === '';
    this.lastPlacement = placement;
    indicator.style.width = `${width}px`;
    indicator.style.transform = `translate(${x}px, ${y}px)`;
    // The first position is set without a transition, then it is turned on
    if (first) requestAnimationFrame(() => indicator.classList.add('is-placed'));
  }

  get visibleTabs(): TabDirective[] {
    return this.tabs?.filter(tab => !tab.tabHidden) ?? [];
  }

  get currentTab(): TabDirective | undefined {
    const visible = this.visibleTabs;
    return visible.find(tab => tab.tabId === this.activeTab) ?? visible[0];
  }

  select(tab: TabDirective) {
    if (tab.tabId === this.currentTab?.tabId) return;
    this.activeTab = tab.tabId;
    this.activeTabChange.emit(tab.tabId);
  }

  iconFor(tab: TabDirective) {
    return tab.tabIcon ? findButtonIcon(tab.tabIcon) : undefined;
  }
}
