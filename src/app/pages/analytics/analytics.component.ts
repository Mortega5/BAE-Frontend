import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';

/** Card around the routed page. The menu lives in the dashboard shell, which mounts these routes. */
@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule, ContentCardComponent],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css'
})
export class AnalyticsComponent {}
