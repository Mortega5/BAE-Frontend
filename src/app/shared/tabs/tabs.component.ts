import { NgClass, NgTemplateOutlet } from '@angular/common';
import { Component, ContentChildren, EventEmitter, Input, Output, QueryList } from '@angular/core';
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
})
export class TabsComponent {
  /** tabId of the active tab. Falls back to the first visible tab when unset or hidden. */
  @Input() activeTab?: string;
  @Output() activeTabChange = new EventEmitter<string>();

  @ContentChildren(TabDirective) tabs!: QueryList<TabDirective>;

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
