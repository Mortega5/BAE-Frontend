import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowRight } from '@fortawesome/pro-regular-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { DomeBlogServiceService } from 'src/app/services/dome-blog-service.service';
import { CarouselComponent } from 'src/app/shared/carousel/carousel.component';
import { TileCardComponent } from 'src/app/shared/tile-card/tile-card.component';
import {
  blogEntryExcerpt, blogEntryFeaturedImage, blogEntryRouteId, extractBlogEntries, matchesBlogContentType
} from '../../dome-blog/blog-entry.util';

export const NEWS_WIDGET_CARD_COUNT = 3;

/** Latest news on the DOME dashboard, one at a time. Hidden when there are none or they fail to load. */
@Component({
  selector: 'app-dashboard-news',
  standalone: true,
  templateUrl: './dashboard-news.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TranslateModule, RouterLink, FontAwesomeModule, CarouselComponent, TileCardComponent]
})
export class DashboardNewsComponent implements OnInit {
  protected readonly faArrowRight = faArrowRight;
  readonly routeBase = '/news';
  entries: any[] = [];

  protected readonly featuredImage = blogEntryFeaturedImage;
  protected readonly excerpt = (entry: any) => blogEntryExcerpt(entry, 160);

  constructor(
    private domeBlogService: DomeBlogServiceService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) { }

  async ngOnInit(): Promise<void> {
    try {
      const response = await this.domeBlogService.getBlogEntries({ contentType: 'news', page: 1, limit: NEWS_WIDGET_CARD_COUNT });
      this.entries = extractBlogEntries(response)
        .filter(entry => matchesBlogContentType(entry, 'news'))
        .sort((a, b) => this.timestamp(b) - this.timestamp(a))
        .slice(0, NEWS_WIDGET_CARD_COUNT);
    } catch (error) {
      console.error('Unable to load the dashboard news', error);
      this.entries = [];
    }
    this.cdr.markForCheck();
  }

  openEntry(entry: any): void {
    this.router.navigate([this.routeBase, blogEntryRouteId(entry)]);
  }

  entryDate(entry: any): Date | null {
    const time = this.timestamp(entry);
    return time ? new Date(time) : null;
  }

  private timestamp(entry: any): number {
    const time = new Date(entry?.date).getTime();
    return Number.isNaN(time) ? 0 : time;
  }
}
