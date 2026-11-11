import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {EventMessageService} from "src/app/services/event-message.service";
import {LocalStorageService} from "src/app/services/local-storage.service";
import { DomeBlogContentType, DomeBlogServiceService } from "src/app/services/dome-blog-service.service"
import { Subject } from 'rxjs';
import { ConfirmModalComponent } from "src/app/shared/confirm-modal/confirm-modal.component";
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { blogEntryExcerpt, blogEntryFeaturedImage, blogEntryRouteId, extractBlogEntries, matchesBlogContentType } from './blog-entry.util';
@Component({
  selector: 'app-dome-blog',
  standalone: true,
  imports: [CommonModule, ConfirmModalComponent, ButtonComponent, TranslateModule],
  templateUrl: './dome-blog.component.html',
  styleUrl: './dome-blog.component.css'
})
export class DomeBlogComponent implements OnInit, OnDestroy {
  private readonly pageLimit = 9;

  constructor(
    private router: Router,
    private eventMessage: EventMessageService,
    private localStorage: LocalStorageService,
    private domeBlogService: DomeBlogServiceService,
    private translate: TranslateService,
    private route?: ActivatedRoute,
  ) {
    this.eventMessage.messages$.subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initPartyInfo();
      }
    })
  }

  partyId:any='';
  checkAdmin:boolean=false;
  private destroy$ = new Subject<void>();
  deletingEntryId: string | null = null;
  showDeleteConfirm = false;
  pendingDeleteEntry: any = null;
  deleteConfirmTitle = 'BLOG_ENTRY._delete_entry';
  deleteConfirmMessage = '';
  deleteConfirmButtonText = 'BLOG_ENTRY._delete';

  entries:any[]=[ ]
  contentType: DomeBlogContentType = 'blog';
  pageTitle = 'BLOG_ENTRY._page_title_blog';
  createButtonLabel = 'BLOG_ENTRY._add_new_entry';
  routeBase = '/blog';
  isNewsLayout = false;
  currentPage = 1;
  hasMoreEntries = false;
  loadingMore = false;

  async ngOnInit(): Promise<void> {
    this.applyRouteConfiguration();
    this.initPartyInfo();
    await this.loadEntries();
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  initPartyInfo(){
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      console.log('user info ---')
      console.log(aux)
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId;
      }
      this.checkAdmin=aux.roles.some(role =>
        role.name === 'admin'
      );
    }
  }


  goToDetails(entry:any) {
    this.router.navigate([`${this.routeBase}/`, this.getEntryRouteId(entry)]);
  }

  goToCreate(){
    this.router.navigate(['/blog-entry'], { queryParams: { type: this.contentType } });
  }

  goToUpdate(id:any){
    this.router.navigate(['/blog-entry/', id]);
  }

  canManageEntry(entry: any): boolean {
    return this.checkAdmin;
  }

  isDeletingEntry(entry: any): boolean {
    return this.deletingEntryId === entry?._id;
  }

  openDeleteDialog(entry: any) {
    if (!entry?._id || this.isDeletingEntry(entry)) {
      return;
    }

    this.pendingDeleteEntry = entry;
    this.deleteConfirmMessage = this.translate.instant('BLOG_ENTRY._confirm_delete', { title: entry.title });
    this.showDeleteConfirm = true;
  }

  closeDeleteDialog() {
    this.showDeleteConfirm = false;
    this.pendingDeleteEntry = null;
  }

  async confirmDeleteEntry() {
    if (!this.pendingDeleteEntry?._id) {
      this.closeDeleteDialog();
      return;
    }

    this.deletingEntryId = this.pendingDeleteEntry._id;
    this.closeDeleteDialog();
    try {
      await this.domeBlogService.deleteBlogEntry(this.deletingEntryId);
      await this.loadEntries();
    } catch (error) {
      console.error('There was an error while deleting the entry!', error);
    } finally {
      this.deletingEntryId = null;
    }
  }

  async loadEntries() {
    try {
      this.currentPage = 1;
      const response = await this.domeBlogService.getBlogEntries({
        contentType: this.contentType,
        page: this.currentPage,
        limit: this.pageLimit
      });
      const { entries, hasMore } = this.normalizeEntryResponse(response, this.currentPage);
      this.entries = entries;
      this.hasMoreEntries = hasMore;
    } catch (error) {
      this.entries = [];
      this.hasMoreEntries = false;
    }
  }

  async loadMoreEntries() {
    if (this.loadingMore || !this.hasMoreEntries) {
      return;
    }

    this.loadingMore = true;
    try {
      const nextPage = this.currentPage + 1;
      const response = await this.domeBlogService.getBlogEntries({
        contentType: this.contentType,
        page: nextPage,
        limit: this.pageLimit
      });
      const { entries, hasMore } = this.normalizeEntryResponse(response, nextPage);
      this.entries = [...this.entries, ...entries];
      this.currentPage = nextPage;
      this.hasMoreEntries = hasMore;
    } catch (error) {
      this.hasMoreEntries = false;
    } finally {
      this.loadingMore = false;
    }
  }

  getEntryRouteId(entry: any): string {
    return blogEntryRouteId(entry);
  }

  getFeaturedImage(entry: any): string | null {
    return blogEntryFeaturedImage(entry);
  }

  getEntryTags(entry: any): string[] {
    const rawTags = entry?.tags;
    if (Array.isArray(rawTags)) {
      return rawTags
        .map((tag) => (tag ?? '').toString().trim())
        .filter((tag) => tag.length > 0);
    }

    if (typeof rawTags === 'string') {
      return rawTags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    }

    return [];
  }

  getEntryExcerpt(entry: any): string {
    return blogEntryExcerpt(entry, 260);
  }

  getCardTitleClass(): string {
    return this.isNewsLayout
      ? 'text-[28px] leading-tight md:text-[30px]'
      : 'text-2xl';
  }

  getImageClass(): string {
    return this.isNewsLayout
      ? 'h-72 w-full rounded-lg border border-line-input object-cover md:h-64 md:w-[432px] md:min-w-[432px]'
      : 'h-52 w-full rounded-lg border border-line-input object-contain p-2 md:h-44 md:w-72 md:min-w-72';
  }

  private applyRouteConfiguration() {
    const routeContentType = this.route?.snapshot.data?.['contentType'] as DomeBlogContentType | undefined;
    this.contentType = routeContentType || 'blog';
    this.isNewsLayout = this.contentType === 'news';
    this.routeBase = this.isNewsLayout ? '/news' : '/blog';
    this.pageTitle = this.isNewsLayout ? 'BLOG_ENTRY._page_title_news' : 'BLOG_ENTRY._page_title_blog';
    this.createButtonLabel = this.isNewsLayout ? 'BLOG_ENTRY._add_news_event' : 'BLOG_ENTRY._add_new_entry';
  }

  private normalizeEntryResponse(response: any, page: number): { entries: any[]; hasMore: boolean } {
    const rawEntries = extractBlogEntries(response);
    const entries = rawEntries.filter((entry) => matchesBlogContentType(entry, this.contentType));
    const total = Number(response?.total ?? response?.count ?? response?.pagination?.total ?? 0);
    const hasExplicitNext = Boolean(response?.next || response?.hasMore || response?.pagination?.hasNext);
    const hasMore = hasExplicitNext || (total > 0 && page * this.pageLimit < total);

    return { entries, hasMore };
  }
}
