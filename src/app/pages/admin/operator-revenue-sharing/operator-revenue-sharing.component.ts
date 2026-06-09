import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'operator-revenue-sharing',
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule, CommonModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './operator-revenue-sharing.component.html',
  styleUrl: './operator-revenue-sharing.component.css'
})
export class OperatorRevenueSharingComponent {
  loading: boolean = false;
  items: any[]=[{
    title: 'Total Subcription Revenue',
    description: '€45.000 (Q2 2025)'
  }];
}
