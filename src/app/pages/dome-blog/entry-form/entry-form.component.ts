import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {MarkdownTextareaComponent} from "src/app/shared/forms/markdown-textarea/markdown-textarea.component";
import { DomeBlogServiceService } from "src/app/services/dome-blog-service.service"
import { AttachmentServiceService } from "src/app/services/attachment-service.service";
import {LocalStorageService} from "src/app/services/local-storage.service";
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import moment from 'moment';
import { ConfirmModalComponent } from "src/app/shared/confirm-modal/confirm-modal.component";
import { environment } from "src/environments/environment";
import { DomeBlogContentType } from "src/app/services/dome-blog-service.service";
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { NotificationService } from 'src/app/services/notification.service';

@Component({
  selector: 'app-entry-form',
  standalone: true,
  imports: [MarkdownTextareaComponent, ReactiveFormsModule, ConfirmModalComponent,
    LoadingSpinnerComponent, ButtonComponent
  ],
  templateUrl: './entry-form.component.html',
  styleUrl: './entry-form.component.css'
})
export class EntryFormComponent implements OnInit {
  private readonly slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  private readonly filenameRegex = /^[A-Za-z0-9_.-]+$/;
  readonly maxFileSize: number = environment.MAX_FILE_SIZE;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private localStorage: LocalStorageService,
    private domeBlogService: DomeBlogServiceService,
    private attachmentService: AttachmentServiceService,
    private notificationService: NotificationService
  ) {
  }

  entryForm = new FormGroup({
    contentType: new FormControl<DomeBlogContentType>('blog', [Validators.required]),
    title: new FormControl('', [Validators.required]),
    slug: new FormControl('', [Validators.required, Validators.pattern(this.slugRegex)]),
    featuredImage: new FormControl(''),
    metaDescription: new FormControl('', [Validators.maxLength(160)]),
    excerpt: new FormControl('', [Validators.maxLength(300)]),
    tags: new FormControl(''),
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
  deleteConfirmTitle = 'Delete entry';
  deleteConfirmMessage = '';
  deleteConfirmButtonText = 'Delete';
  uploadingFeaturedImage = false;
  contentTypes: { value: DomeBlogContentType; label: string }[] = [
    { value: 'blog', label: 'Blog' },
    { value: 'news', label: 'News / Event' },
    { value: 'faq', label: 'FAQ' }
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
      this.entryForm.controls['featuredImage'].setValue(this.extractFeaturedImageUrl(blogInfo.featuredImage));
      this.entryForm.controls['metaDescription'].setValue(blogInfo.metaDescription || '');
      this.entryForm.controls['excerpt'].setValue(blogInfo.excerpt || '');
      this.entryForm.controls['tags'].setValue(this.formatTagsForInput(blogInfo.tags));
      this.entryForm.controls['author'].setValue((blogInfo.author || '').toString().trim());
      this.entryForm.controls['date'].setValue(this.formatDateForInput(blogInfo.date));
      this.slugManuallyEdited = slugValue.length > 0 && slugValue !== this.slugify(blogInfo.title || '');
      this.entryForm.controls['content'].setValue(blogInfo.content);
    } else {
      this.entryForm.controls['slug'].setValue(this.slugify(this.entryForm.value.title || ''), { emitEvent: false });
    }
    this.initPartyInfo();
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

    this.deleteConfirmMessage = `Are you sure you want to delete "${this.entryForm.controls['title'].value || 'this post'}"? This action cannot be undone.`;
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
    const slug = this.slugify(this.entryForm.controls['slug'].value || '');
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
    return !this.loading && !this.uploadingFeaturedImage && this.entryForm.valid && !this.isSlugTaken();
  }

  onFeaturedImageSelected(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.showTemporaryError('BLOG_ENTRY._invalid_image_format');
      inputElement.value = '';
      return;
    }

    if (file.size > this.maxFileSize) {
      this.showTemporaryError('BLOG_ENTRY._image_too_large');
      inputElement.value = '';
      return;
    }

    const sanitizedFileName = file.name.replace(/[^A-Za-z0-9_.-]/g, '_');
    const uploadFileName = `blogcover_${Date.now()}_${sanitizedFileName}`;
    if (!this.filenameRegex.test(uploadFileName)) {
      this.showTemporaryError('BLOG_ENTRY._invalid_filename');
      inputElement.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const rawResult = e.target?.result;
      if (typeof rawResult !== 'string' || !rawResult.includes(',')) {
        this.showTemporaryError('BLOG_ENTRY._image_process_error');
        inputElement.value = '';
        return;
      }

      const base64String = rawResult.split(',')[1];
      const fileBody = {
        content: {
          name: uploadFileName,
          data: base64String
        },
        contentType: file.type,
        isPublic: true
      };

      this.uploadingFeaturedImage = true;
      this.attachmentService.uploadFile(fileBody).subscribe({
        next: (data) => {
          const uploadedUrl = (data?.content || '').toString();
          if (!uploadedUrl) {
            this.showTemporaryError('BLOG_ENTRY._image_upload_error');
            return;
          }

          this.entryForm.controls['featuredImage'].setValue(uploadedUrl);
        },
        error: (error) => {
          console.error('There was an error while uploading featured image!', error);
          if (error.status === 413) {
            this.showTemporaryError('BLOG_ENTRY._image_too_large');
            return;
          }
          this.showTemporaryError('BLOG_ENTRY._image_upload_error', error?.error?.error || error?.message || undefined);
        },
        complete: () => {
          this.uploadingFeaturedImage = false;
          inputElement.value = '';
        }
      });
    };

    reader.onerror = () => {
      this.showTemporaryError('BLOG_ENTRY._image_read_error');
      inputElement.value = '';
    };

    reader.readAsDataURL(file);
  }

  removeFeaturedImage() {
    this.entryForm.controls['featuredImage'].setValue('');
  }

  isFaqEntry(): boolean {
    return this.getSelectedContentType() === 'faq';
  }

  getTitleLabel(): string {
    return this.isFaqEntry() ? 'Question' : 'Title';
  }

  getContentLabel(): string {
    return this.isFaqEntry() ? 'Answer' : 'Content';
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
    const rawValue = (this.entryForm.controls['tags'].value || '').toString();
    if (!rawValue.trim()) {
      return [];
    }

    const dedupedTags = new Map<string, string>();
    rawValue.split(',').forEach((tag) => {
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

  private formatTagsForInput(tags: any): string {
    if (Array.isArray(tags)) {
      return tags
        .map((tag) => (tag ?? '').toString().trim())
        .filter((tag) => tag.length > 0)
        .join(', ');
    }

    if (typeof tags === 'string') {
      return tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .join(', ');
    }

    return '';
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
      this.entryForm.controls['featuredImage'].setValue('', { emitEvent: false });
    } else {
      this.entryForm.controls['slug'].setValidators([Validators.required, Validators.pattern(this.slugRegex)]);
    }

    this.entryForm.controls['slug'].updateValueAndValidity({ emitEvent: false });
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

  private showTemporaryError(key: string, details?: string) {
    this.uploadingFeaturedImage = false;
    this.notificationService.showError(key, details ? { details } : undefined);
  }

}
