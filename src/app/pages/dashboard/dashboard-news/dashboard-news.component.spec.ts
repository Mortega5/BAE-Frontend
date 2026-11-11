import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { DomeBlogServiceService } from 'src/app/services/dome-blog-service.service';
import { DashboardNewsComponent, NEWS_WIDGET_CARD_COUNT } from './dashboard-news.component';

describe('DashboardNewsComponent', () => {
  const build = (getBlogEntries: jasmine.Spy) => {
    const blog = { getBlogEntries } as unknown as DomeBlogServiceService;
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const cdr = { markForCheck: jasmine.createSpy('markForCheck') } as unknown as ChangeDetectorRef;
    return { component: new DashboardNewsComponent(blog, router, cdr), router };
  };

  it('should request the latest news and keep only news entries, newest first', async () => {
    const getBlogEntries = jasmine.createSpy('getBlogEntries').and.resolveTo({
      items: [
        { _id: 'old', contentType: 'news', date: '2026-01-01' },
        { _id: 'post', contentType: 'blog', date: '2026-06-01' },
        { _id: 'new', contentType: 'news', date: '2026-05-01' },
      ],
    });
    const { component } = build(getBlogEntries);

    await component.ngOnInit();

    expect(getBlogEntries).toHaveBeenCalledWith({ contentType: 'news', page: 1, limit: NEWS_WIDGET_CARD_COUNT });
    expect(component.entries.map(e => e._id)).toEqual(['new', 'old']);
  });

  it('should stay hidden when the news fail to load', async () => {
    const { component } = build(jasmine.createSpy('getBlogEntries').and.rejectWith(new Error('down')));

    await component.ngOnInit();

    expect(component.entries).toEqual([]);
  });

  it('should open an entry by its slug, falling back to its id', () => {
    const { component, router } = build(jasmine.createSpy('getBlogEntries'));

    component.openEntry({ _id: 'n1', slug: ' my-news ' });
    component.openEntry({ _id: 'n2' });

    expect(router.navigate).toHaveBeenCalledWith(['/news', 'my-news']);
    expect(router.navigate).toHaveBeenCalledWith(['/news', 'n2']);
  });
});
