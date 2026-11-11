import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DomeBlogServiceService } from 'src/app/services/dome-blog-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MarkdownComponent } from 'ngx-markdown';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown, faCircleQuestion } from '@fortawesome/pro-solid-svg-icons';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [TranslateModule, MarkdownComponent, FaIconComponent, ButtonComponent, ConfirmModalComponent,
    ContentCardComponent, EmptyStateComponent],
  templateUrl: './faq.component.html'
})
export class FaqComponent implements OnInit {
  protected readonly faChevronDown = faChevronDown;
  protected readonly faCircleQuestion = faCircleQuestion;
  faqs: any[] = [];
  openFaqId = '';
  checkAdmin = false;
  deletingEntryId: string | null = null;
  showDeleteConfirm = false;
  pendingDeleteEntry: any = null;
  deleteConfirmTitle = 'FAQ._delete_faq';
  deleteConfirmMessage = '';
  deleteConfirmButtonText = 'BLOG_ENTRY._delete';

  constructor(
    private router: Router,
    private domeBlogService: DomeBlogServiceService,
    private localStorage: LocalStorageService,
    private translate: TranslateService
  ) {}

  async ngOnInit(): Promise<void> {
    this.initPartyInfo();
    await this.loadFaqs();
  }

  async loadFaqs() {
    try {
      const response = await this.domeBlogService.getBlogEntries({ contentType: 'faq' });
      this.faqs = this.extractEntries(response).filter((entry) => this.isFaqEntry(entry));
    } catch (error) {
      this.faqs = [];
    }
  }

  toggleFaq(id: string) {
    this.openFaqId = this.openFaqId === id ? '' : id;
  }

  isOpen(id: string): boolean {
    return this.openFaqId === id;
  }

  getEntryId(entry: any): string {
    return entry?._id || entry?.id || entry?.slug || entry?.title;
  }

  goToCreate() {
    this.router.navigate(['/blog-entry'], { queryParams: { type: 'faq' } });
  }

  goToUpdate(entry: any) {
    const id = entry?._id || entry?.id;
    if (!id) {
      return;
    }

    this.router.navigate(['/blog-entry/', id], { queryParams: { type: 'faq' } });
  }

  canManageEntry(): boolean {
    return this.checkAdmin;
  }

  isDeletingEntry(entry: any): boolean {
    return this.deletingEntryId === (entry?._id || entry?.id);
  }

  openDeleteDialog(entry: any) {
    const id = entry?._id || entry?.id;
    if (!id || this.isDeletingEntry(entry)) {
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
    const id = this.pendingDeleteEntry?._id || this.pendingDeleteEntry?.id;
    if (!id) {
      this.closeDeleteDialog();
      return;
    }

    this.deletingEntryId = id;
    this.closeDeleteDialog();
    try {
      await this.domeBlogService.deleteBlogEntry(id);
      await this.loadFaqs();
    } catch (error) {
      console.error('There was an error while deleting the FAQ entry!', error);
    } finally {
      this.deletingEntryId = null;
    }
  }

  private initPartyInfo(){
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      this.checkAdmin=aux.roles.some(role =>
        role.name === 'admin'
      );
    }
  }

  private extractEntries(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    const possibleEntries = response?.items || response?.entries || response?.data || response?.results || response?.content;
    return Array.isArray(possibleEntries) ? possibleEntries : [];
  }

  private isFaqEntry(entry: any): boolean {
    const contentType = (entry?.contentType || entry?.type || '').toString().trim().toLowerCase();
    return contentType === 'faq';
  }

}
