import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomeBlogServiceService } from "src/app/services/dome-blog-service.service"
import { MarkdownComponent } from "ngx-markdown";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { ConfirmModalComponent } from "src/app/shared/confirm-modal/confirm-modal.component";
import { Meta, Title } from "@angular/platform-browser";
import { DomeBlogContentType } from "src/app/services/dome-blog-service.service";
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { blogEntryFeaturedImage, stripMarkdown, truncateText } from '../blog-entry.util';
@Component({
  selector: 'app-blog-entry-detail',
  standalone: true,
  imports: [CommonModule, MarkdownComponent, ConfirmModalComponent, ButtonComponent, TranslateModule],
  templateUrl: './blog-entry-detail.component.html',
  styleUrl: './blog-entry-detail.component.css'
})
export class BlogEntryDetailComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private domeBlogService: DomeBlogServiceService,
    private localStorage: LocalStorageService,
    private titleService: Title,
    private metaService: Meta,
    private translate: TranslateService
  ) {
  }
  entry:any={};
  blogId:any='';
  partyId:any='';
  checkAdmin:boolean=false;
  contentType: DomeBlogContentType = 'blog';
  routeBase = '/blog';
  deleting:boolean=false;
  showDeleteConfirm = false;
  deleteConfirmTitle = 'BLOG_ENTRY._delete_entry';
  deleteConfirmMessage = '';
  deleteConfirmButtonText = 'BLOG_ENTRY._delete';

  async ngOnInit(): Promise<void> {
    this.applyRouteConfiguration();
    this.initPartyInfo();
    this.blogId = this.route.snapshot.paramMap.get('slugOrId') || this.route.snapshot.paramMap.get('id')!;
    this.entry = await this.getEntryBySlugOrId(this.blogId);
    this.applySeoMetadata();
  }

  goBack(){
    this.router.navigate([this.routeBase]);
  }

  goToUpdate() {
    const entryId = this.entry?._id || (this.isObjectId(this.blogId) ? this.blogId : null);
    if (!entryId) {
      return;
    }

    this.router.navigate(['/blog-entry/', entryId], { queryParams: { type: this.contentType } });
  }

  canManageEntry(): boolean {
    return this.checkAdmin;
  }

  openDeleteDialog() {
    const entryId = this.entry?._id || (this.isObjectId(this.blogId) ? this.blogId : null);
    if (!entryId || this.deleting) {
      return;
    }

    const title = this.entry?.title || this.translate.instant('BLOG_ENTRY._this_post');
    this.deleteConfirmMessage = this.translate.instant('BLOG_ENTRY._confirm_delete', { title });
    this.showDeleteConfirm = true;
  }

  closeDeleteDialog() {
    this.showDeleteConfirm = false;
  }

  async confirmDeleteEntry() {
    const entryId = this.entry?._id || (this.isObjectId(this.blogId) ? this.blogId : null);
    if (!entryId) {
      this.closeDeleteDialog();
      return;
    }

    this.closeDeleteDialog();
    this.deleting = true;
    try {
      await this.domeBlogService.deleteBlogEntry(entryId);
      this.goBack();
    } catch (error) {
      console.error('There was an error while deleting the entry!', error);
    } finally {
      this.deleting = false;
    }
  }

  async getEntryBySlugOrId(slugOrId: string) {
    if (!slugOrId) {
      return {};
    }

    if (this.isObjectId(slugOrId)) {
      try {
        return await this.domeBlogService.getBlogEntryById(slugOrId);
      } catch (error) {
      }
    }

    try {
      const entriesResponse = await this.domeBlogService.getBlogEntries({ contentType: this.contentType });
      const entries = this.extractEntries(entriesResponse);
      const matchedEntry = entries.find((entry: any) => entry.slug === slugOrId);
      if (matchedEntry?._id) {
        try {
          return await this.domeBlogService.getBlogEntryById(matchedEntry._id);
        } catch (error) {
          return matchedEntry;
        }
      }

      if (matchedEntry) {
        return matchedEntry;
      }
    } catch (error) {
    }

    try {
      return await this.domeBlogService.getBlogEntryById(slugOrId);
    } catch (error) {
      return {};
    }
  }

  isObjectId(value: string): boolean {
    return /^[a-f\d]{24}$/i.test(value);
  }

  initPartyInfo(){
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
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

  private applySeoMetadata() {
    const title = (this.entry?.title || '').toString().trim();
    const metaDescription = this.getEntryMetaDescription();

    if (title) {
      this.titleService.setTitle(title);
    }

    if (metaDescription) {
      this.metaService.updateTag({ name: 'description', content: metaDescription });
    }
  }

  private applyRouteConfiguration() {
    const routeContentType = this.route?.snapshot.data?.['contentType'] as DomeBlogContentType | undefined;
    this.contentType = routeContentType || 'blog';
    this.routeBase = this.contentType === 'news' ? '/news' : '/blog';
  }

  private extractEntries(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    const possibleEntries = response?.items || response?.entries || response?.data || response?.results || response?.content;
    return Array.isArray(possibleEntries) ? possibleEntries : [];
  }

  private getEntryMetaDescription(): string {
    const explicitMeta = (this.entry?.metaDescription || '').toString().trim();
    if (explicitMeta) {
      return truncateText(explicitMeta, 160);
    }

    const excerpt = (this.entry?.excerpt || '').toString().trim();
    if (excerpt) {
      return truncateText(excerpt, 160);
    }

    const plainContent = stripMarkdown((this.entry?.content || '').toString());
    return truncateText(plainContent, 160);
  }

  getFeaturedImage(): string | null {
    return blogEntryFeaturedImage(this.entry);
  }

  getEntryTags(): string[] {
    const rawTags = this.entry?.tags;
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
}
