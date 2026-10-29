import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { DomeBlogServiceService } from "src/app/services/dome-blog-service.service"
import {LocalStorageService} from "src/app/services/local-storage.service";
import { ActivatedRoute, Router } from '@angular/router';
import moment from 'moment';
import { ConfirmModalComponent } from "src/app/shared/confirm-modal/confirm-modal.component";
import { DomeBlogContentType } from "src/app/services/dome-blog-service.service";
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';
import { UnsavedChangesModalComponent } from 'src/app/shared/unsaved-changes-modal/unsaved-changes-modal.component';
import { UploadedAttachment } from 'src/app/shared/forms/attachment-upload/attachment-upload.component';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { LeaveConfirmable } from 'src/app/guard/unsaved-changes.guard';
import { NotificationService } from 'src/app/services/notification.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-entry-form',
  standalone: true,
  imports: [ConfirmModalComponent, LoadingSpinnerComponent, ButtonComponent, TranslateModule,
    ContentCardComponent, DynamicFormComponent, UnsavedChangesModalComponent
  ],
  templateUrl: './entry-form.component.html',
  styleUrl: './entry-form.component.css'
})
export class EntryFormComponent implements OnInit, LeaveConfirmable {
  private readonly slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private localStorage: LocalStorageService,
    private domeBlogService: DomeBlogServiceService,
    private notificationService: NotificationService,
    private translate: TranslateService
  ) {
  }

  /** Slugs are unique per content type, so the check depends on the form's own content type too. */
  private readonly slugTakenValidator: ValidatorFn = control =>
    this.isSlugValueTaken(control.value) ? { slugTaken: true } : null;

  entryForm = new FormGroup({
    contentType: new FormControl<DomeBlogContentType>('blog', [Validators.required]),
    title: new FormControl('', [Validators.required]),
    slug: new FormControl('', [Validators.required, Validators.pattern(this.slugRegex), this.slugTakenValidator]),
    featuredImage: new FormControl<UploadedAttachment | string | null>(null),
    metaDescription: new FormControl('', [Validators.maxLength(160)]),
    excerpt: new FormControl('', [Validators.maxLength(300)]),
    tags: new FormControl<string[]>([]),
    author: new FormControl(''),
    date: new FormControl(''),
    content: new FormControl('', [Validators.required]),
  });

  loading:boolean=false;
  partyId:any='';
  name:any='';
  blogId:any=undefined;
  existingEntries: any[] = [];
  slugManuallyEdited = false;
  showDeleteConfirm = false;
  deleteConfirmTitle = 'BLOG_ENTRY._delete_entry';
  deleteConfirmMessage = '';
  deleteConfirmButtonText = 'BLOG_ENTRY._delete';
  /** Set once the entry is saved or deleted, so the navigation back to the list isn't asked about. */
  private leaveAllowed = false;
  @ViewChild(UnsavedChangesModalComponent) private unsavedChangesModal?: UnsavedChangesModalComponent;
  fields: FormField[] = [];
  contentTypes: { value: DomeBlogContentType; label: string }[] = [
    { value: 'blog', label: 'BLOG_ENTRY._content_type_blog' },
    { value: 'news', label: 'BLOG_ENTRY._content_type_news' },
    { value: 'faq', label: 'BLOG_ENTRY._content_type_faq' }
  ];

  async ngOnInit(): Promise<void> {
    this.applyInitialContentType();
    this.setupSlugHandlers();
    this.setupContentTypeHandlers();
    this.blogId = this.route.snapshot.paramMap.get('id')!;
    await this.loadExistingEntries();
    if(this.blogId){
      let blogInfo = await this.domeBlogService.getBlogEntryById(this.blogId);
      this.entryForm.controls['contentType'].setValue(this.normalizeContentType(blogInfo.contentType || this.entryForm.controls['contentType'].value), { emitEvent: false });
      this.applyContentTypeRules();
      this.entryForm.controls['title'].setValue(blogInfo.title);
      const slugValue = this.slugify(blogInfo.slug || blogInfo.title || '');
      this.entryForm.controls['slug'].setValue(slugValue, { emitEvent: false });
      this.entryForm.controls['featuredImage'].setValue(this.toAttachment(this.extractFeaturedImageUrl(blogInfo.featuredImage)));
      this.entryForm.controls['metaDescription'].setValue(blogInfo.metaDescription || '');
      this.entryForm.controls['excerpt'].setValue(blogInfo.excerpt || '');
      this.entryForm.controls['tags'].setValue(this.tagsToList(blogInfo.tags));
      this.entryForm.controls['author'].setValue((blogInfo.author || '').toString().trim());
      this.entryForm.controls['date'].setValue(this.formatDateForInput(blogInfo.date));
      this.slugManuallyEdited = slugValue.length > 0 && slugValue !== this.slugify(blogInfo.title || '');
      this.entryForm.controls['content'].setValue(blogInfo.content);
    } else {
      this.entryForm.controls['slug'].setValue(this.slugify(this.entryForm.value.title || ''), { emitEvent: false });
    }
    this.initPartyInfo();
  }

  get leaveNeedsConfirmation(): boolean {
    return !this.leaveAllowed && this.entryForm.dirty;
  }

  confirmLeave(): boolean | Promise<boolean> {
    if (!this.leaveNeedsConfirmation) return true;
    return this.unsavedChangesModal?.confirm(() => this.blogId ? this.update() : this.create()) ?? true;
  }

  goBack(){
    this.router.navigate([this.getLandingRoute()]);
  }

  async create(){
    if (this.entryForm.invalid || this.isSlugTaken()) {
      this.entryForm.markAllAsTouched();
      return;
    }

    const authorFromForm = this.normalizeOptionalText(this.entryForm.controls['author'].value);
    const dateFromForm = this.normalizeOptionalText(this.entryForm.controls['date'].value);
    let body:any=this.buildEntryBody({
      partyId: this.partyId,
      author: authorFromForm || this.name
    });
    if (dateFromForm) {
      body.date = dateFromForm;
    }
    this.domeBlogService.createBlogEntry(body).subscribe({
      next: data => {
        this.loading=false;
        this.leaveAllowed = true;
        this.notificationService.showSuccess('BLOG_ENTRY._create_success');
        this.goBack();
      },
      error: error => {
        console.error('There was an error while creating!', error);
        this.loading=false;
        const details = error?.error?.error || error?.message || undefined;
        this.notificationService.showError('BLOG_ENTRY._create_error', { details });
      }
    });
  }

  async update(){
    if (this.entryForm.invalid || this.isSlugTaken()) {
      this.entryForm.markAllAsTouched();
      return;
    }

    const authorFromForm = this.normalizeOptionalText(this.entryForm.controls['author'].value);
    const dateFromForm = this.normalizeOptionalText(this.entryForm.controls['date'].value);
    let body:any=this.buildEntryBody();
    if (authorFromForm) {
      body.author = authorFromForm;
    }
    if (dateFromForm) {
      body.date = dateFromForm;
    }
    try {
      await this.domeBlogService.updateBlogEntry(body,this.blogId)
      this.loading=false;
      this.leaveAllowed = true;
      this.notificationService.showSuccess('BLOG_ENTRY._update_success');
      this.goBack();
    } catch (error: any) {
      const details = error?.error?.error || error?.message || undefined;
      this.notificationService.showError('BLOG_ENTRY._update_error', { details });
    }
  }

  openDeleteDialog() {
    if (!this.blogId || this.loading) {
      return;
    }

    const title = this.entryForm.controls['title'].value || this.translate.instant('BLOG_ENTRY._this_post');
    this.deleteConfirmMessage = this.translate.instant('BLOG_ENTRY._confirm_delete', { title });
    this.showDeleteConfirm = true;
  }

  closeDeleteDialog() {
    this.showDeleteConfirm = false;
  }

  async confirmDelete(){
    if (!this.blogId) {
      this.closeDeleteDialog();
      return;
    }

    this.closeDeleteDialog();
    this.loading = true;
    try {
      await this.domeBlogService.deleteBlogEntry(this.blogId);
      this.loading=false;
      this.leaveAllowed = true;
      this.notificationService.showSuccess('BLOG_ENTRY._delete_success');
      this.goBack();
    } catch (error: any) {
      this.loading=false;
      const details = error?.error?.error || error?.message || undefined;
      this.notificationService.showError('BLOG_ENTRY._delete_error', { details });
    }
  }

  initPartyInfo(){
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
        this.name = aux.user;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId;
        this.name = loggedOrg.name;
      }
    }
  }

  async loadExistingEntries() {
    try {
      const entries = await this.domeBlogService.getBlogEntries();
      this.existingEntries = Array.isArray(entries) ? entries : [];
    } catch (error) {
      this.existingEntries = [];
    }
    this.entryForm.controls['slug'].updateValueAndValidity({ emitEvent: false });
  }

  setupSlugHandlers() {
    this.entryForm.controls['title'].valueChanges.subscribe((value) => {
      if (this.slugManuallyEdited) {
        return;
      }

      this.entryForm.controls['slug'].setValue(this.slugify(value || ''), { emitEvent: false });
    });

    this.entryForm.controls['slug'].valueChanges.subscribe((value) => {
      const normalized = this.slugify(value || '');
      if (value !== normalized) {
        this.entryForm.controls['slug'].setValue(normalized, { emitEvent: false });
      }

      const generatedFromTitle = this.slugify(this.entryForm.controls['title'].value || '');
      this.slugManuallyEdited = normalized.length > 0 && normalized !== generatedFromTitle;
    });
  }

  setupContentTypeHandlers() {
    this.entryForm.controls['contentType'].valueChanges.subscribe(() => {
      this.applyContentTypeRules();
    });
    this.applyContentTypeRules();
  }

  slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  isSlugTaken(): boolean {
    return this.isSlugValueTaken(this.entryForm.controls['slug'].value);
  }

  private isSlugValueTaken(value: string | null): boolean {
    const slug = this.slugify(value || '');
    if (!slug) {
      return false;
    }

    const currentContentType = this.getSelectedContentType();
    return this.existingEntries.some((entry) => {
      const existingSlug = this.slugify((entry.slug || entry.title || '') as string);
      return existingSlug === slug && entry._id !== this.blogId && this.normalizeContentType(entry.contentType) === currentContentType;
    });
  }

  canSubmit(): boolean {
    return !this.loading && this.entryForm.valid && !this.isSlugTaken();
  }

  isFaqEntry(): boolean {
    return this.getSelectedContentType() === 'faq';
  }

  getTitleLabel(): string {
    return this.isFaqEntry() ? 'BLOG_ENTRY._question' : 'BLOG_ENTRY._title';
  }

  getContentLabel(): string {
    return this.isFaqEntry() ? 'BLOG_ENTRY._answer' : 'BLOG_ENTRY._content';
  }

  getUrlPreviewBase(): string {
    const contentType = this.getSelectedContentType();
    if (contentType === 'news') {
      return '/news';
    }

    if (contentType === 'faq') {
      return '/faq';
    }

    return '/blog';
  }

  getFeaturedImageUrl(): string {
    return this.extractFeaturedImageUrl(this.entryForm.controls['featuredImage'].value);
  }

  parseTagsFromForm(): string[] {
    const dedupedTags = new Map<string, string>();
    (this.entryForm.controls['tags'].value ?? []).forEach((tag) => {
      const normalizedTag = tag.trim().replace(/\s+/g, ' ');
      if (!normalizedTag) {
        return;
      }

      const dedupeKey = normalizedTag.toLowerCase();
      if (!dedupedTags.has(dedupeKey)) {
        dedupedTags.set(dedupeKey, normalizedTag);
      }
    });

    return Array.from(dedupedTags.values());
  }

  private tagsToList(tags: any): string[] {
    const list = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',') : [];
    return list
      .map((tag) => (tag ?? '').toString().trim())
      .filter((tag) => tag.length > 0);
  }

  private toAttachment(url: string): UploadedAttachment | null {
    return url ? { name: url.split('/').pop() || url, url, attachmentType: 'image/*' } : null;
  }

  private extractFeaturedImageUrl(featuredImage: any): string {
    if (!featuredImage) {
      return '';
    }

    if (typeof featuredImage === 'string') {
      return featuredImage.trim();
    }

    if (typeof featuredImage?.url === 'string') {
      return featuredImage.url.trim();
    }

    return '';
  }

  private normalizeOptionalText(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    return value.toString().trim();
  }

  private applyInitialContentType() {
    const requestedType = this.route.snapshot.queryParamMap?.get('type');
    this.entryForm.controls['contentType'].setValue(this.normalizeContentType(requestedType), { emitEvent: false });
  }

  private applyContentTypeRules() {
    if (this.isFaqEntry()) {
      this.entryForm.controls['slug'].clearValidators();
      this.entryForm.controls['slug'].setValue(this.slugify(this.entryForm.controls['title'].value || ''), { emitEvent: false });
      this.entryForm.controls['featuredImage'].setValue(null, { emitEvent: false });
    } else {
      this.entryForm.controls['slug'].setValidators([Validators.required, Validators.pattern(this.slugRegex), this.slugTakenValidator]);
    }

    this.entryForm.controls['slug'].updateValueAndValidity({ emitEvent: false });
    this.fields = this.buildFields();
  }

  private buildFields(): FormField[] {
    const faq = this.isFaqEntry();
    const contentType: FormField = {
      type: 'select', name: 'contentType', label: 'BLOG_ENTRY._content_type', required: true, colSpan: 2,
      options: this.contentTypes, dataCy: 'blogEntryContentType'
    };
    const title: FormField = {
      type: 'string', name: 'title', label: this.getTitleLabel(), required: true, colSpan: 2, dataCy: 'blogEntryTitle'
    };
    const content: FormField = {
      type: 'markdownTextarea', name: 'content', label: this.getContentLabel(), required: true, colSpan: 2,
      dataCy: 'blogEntryContent'
    };
    if (faq) {
      return [contentType, title, content];
    }

    return [
      contentType,
      title,
      {
        type: 'string', name: 'slug', label: 'BLOG_ENTRY._url_slug', required: true, colSpan: 2,
        placeholder: 'my-blog-entry', hint: 'BLOG_ENTRY._slug_help', dataCy: 'blogEntrySlug',
        errorMessages: { pattern: 'BLOG_ENTRY._slug_hint', slugTaken: 'BLOG_ENTRY._slug_taken' }
      },
      {
        type: 'textarea', name: 'metaDescription', label: 'BLOG_ENTRY._meta_description', rows: 3, maxLength: 160,
        colSpan: 2, placeholder: 'BLOG_ENTRY._meta_description_placeholder', dataCy: 'blogEntryMetaDescription'
      },
      {
        type: 'textarea', name: 'excerpt', label: 'BLOG_ENTRY._excerpt', rows: 4, maxLength: 300, colSpan: 2,
        placeholder: 'BLOG_ENTRY._excerpt_placeholder', dataCy: 'blogEntryExcerpt'
      },
      {
        type: 'multiValueString', name: 'tags', label: 'BLOG_ENTRY._tags', colSpan: 2,
        hint: 'BLOG_ENTRY._tags_hint', dataCy: 'blogEntryTags'
      },
      {
        type: 'string', name: 'author', label: 'BLOG_ENTRY._author', placeholder: 'BLOG_ENTRY._author_placeholder',
        dataCy: 'blogEntryAuthor'
      },
      {
        type: 'date', inputType: 'datetime-local', name: 'date', label: 'BLOG_ENTRY._date', hint: 'BLOG_ENTRY._date_hint',
        dataCy: 'blogEntryDate'
      },
      {
        type: 'attachment', name: 'featuredImage', label: 'BLOG_ENTRY._featured_image', accept: 'image/*', colSpan: 2,
        hint: 'BLOG_ENTRY._upload_hint', dataCy: 'blogEntryFeaturedImage'
      },
      content
    ];
  }

  private buildEntryBody(extraFields: any = {}): any {
    const contentType = this.getSelectedContentType();
    const body: any = {
      title: this.entryForm.value.title,
      slug: this.slugify(this.entryForm.value.slug || this.entryForm.value.title || ''),
      contentType,
      content: this.entryForm.value.content,
      ...extraFields
    };

    if (contentType !== 'faq') {
      body.featuredImage = this.getFeaturedImageUrl();
      body.metaDescription = this.entryForm.value.metaDescription;
      body.excerpt = this.entryForm.value.excerpt;
      body.tags = this.parseTagsFromForm();
    }

    return body;
  }

  private getLandingRoute(): string {
    const contentType = this.getSelectedContentType();
    if (contentType === 'news') {
      return '/news';
    }

    if (contentType === 'faq') {
      return '/faq';
    }

    return '/blog';
  }

  private getSelectedContentType(): DomeBlogContentType {
    return this.normalizeContentType(this.entryForm.controls['contentType'].value);
  }

  private normalizeContentType(value: any): DomeBlogContentType {
    const normalized = (value || '').toString().trim().toLowerCase();
    if (normalized === 'news' || normalized === 'news/event' || normalized === 'event') {
      return 'news';
    }

    if (normalized === 'faq') {
      return 'faq';
    }

    return 'blog';
  }

  private formatDateForInput(value: any): string {
    const rawDate = this.normalizeOptionalText(value);
    if (!rawDate) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawDate)) {
      return rawDate;
    }

    const parsedDate = moment(rawDate);
    if (!parsedDate.isValid()) {
      return '';
    }

    return parsedDate.format('YYYY-MM-DDTHH:mm');
  }

}
