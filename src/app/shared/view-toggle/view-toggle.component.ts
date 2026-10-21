import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faGrid2, faListUl } from '@fortawesome/pro-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';

export type ViewMode = 'grid' | 'list';

/** Grid / list switch for result listings. Two-way bindable: `[(mode)]="viewMode"`. */
@Component({
  selector: 'app-view-toggle',
  standalone: true,
  imports: [FontAwesomeModule, TranslateModule],
  templateUrl: './view-toggle.component.html',
  styleUrl: './view-toggle.component.scss',
})
export class ViewToggleComponent {
  @Input() mode: ViewMode = 'grid';
  @Output() modeChange = new EventEmitter<ViewMode>();

  protected readonly options = [
    { value: 'grid' as ViewMode, icon: faGrid2, label: 'DASHBOARD._grid_view' },
    { value: 'list' as ViewMode, icon: faListUl, label: 'DASHBOARD._list_view' },
  ];

  select(mode: ViewMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.modeChange.emit(mode);
  }
}
