import { Component, EventEmitter, Input, Output, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { NgClass } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, FormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { DynamicFormComponent } from '../forms/dynamic-form/dynamic-form.component';
import { UploadedAttachment } from '../forms/attachment-upload/attachment-upload.component';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { NotificationService } from 'src/app/services/notification.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ProviderService, Provider } from 'src/app/services/provider.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { Tender, TenderAttachment } from 'src/app/models/tender.model';
import { Category, LoginInfo } from 'src/app/models/interfaces';
import { API_ROLES } from 'src/app/models/roles.constants';
import {
  ProviderCountryOption,
  SearchOrganizationsFilters,
  TENDER_COMPLIANCE_LEVELS,
  buildTenderProviderSearchFilters,
  hasTenderProviderSearchFilters,
  resolveTenderCatalogueFacetOptions,
  resolveTenderCategoryLeafNames,
  shouldUseUnfilteredProviderFallback,
} from 'src/app/models/search-organizations-filters.model';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent, ButtonVariant } from '../button/button.component';
import { ContentCardComponent } from '../content-card/content-card.component';
import { DropdownPanelComponent } from '../dropdown-panel/dropdown-panel.component';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { StepChangedEvent, StepperComponent } from '../stepper/stepper.component';
import { StepperStepDirective } from '../stepper/stepper-step.directive';
import {
  TenderProviderCandidate,
  buildStableProviderCandidates,
} from './tender-provider-selection.model';

@Component({
  selector: 'app-create-tender-modal',
  standalone: true,
  imports: [NgClass, FormsModule, TranslateModule, ConfirmModalComponent, DynamicFormComponent, ButtonComponent,
    ContentCardComponent, DropdownPanelComponent, LoadingSpinnerComponent, StepperComponent, StepperStepDirective],
  templateUrl: './create-tender-modal.component.html',
  styleUrl: './create-tender-modal.component.scss',
})
export class CreateTenderModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() customerId: string = '';
  @Input() tenderToEdit: Tender | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() tenderCreated = new EventEmitter<Tender>();
  @Output() tenderUpdated = new EventEmitter<void>();

  private quoteService = inject(QuoteService);
  private notificationService = inject(NotificationService);
  private localStorage = inject(LocalStorageService);
  private providerService = inject(ProviderService);
  private api = inject(ApiServiceService);
  private accountService = inject(AccountServiceService);
  private router = inject(Router);

  // Properties for tender creation modal
  tenderProviders: Provider[] = [];
  selectedProviders: Set<string> = new Set();
  invitedProviders: Array<{ provider: Provider; quoteId: string }> = [];
  tenderLoading = false;
  providerSearchLoading = false;
  providerInviteSaving = false;
  tenderError: string | null = null;
  providerSearchWarning: string | null = null;

  // Generic Confirmation Dialog
  showGenericConfirm = false;
  genericConfirmTitle = '';
  genericConfirmMessage = '';
  genericConfirmButtonText = 'CONFIRM_MODAL._confirm';
  genericConfirmVariant: ButtonVariant = 'primary';
  genericConfirmCallback: (() => void) | null = null;
  currentUserId: string | null = null;

  // Tender Provider Search filters
  countryOptions: ProviderCountryOption[] = [];
  serviceCategoryOptions: Category[] = [];
  addressableSectorOptions: Category[] = [];
  integrationFrameworkOptions: Category[] = [];
  countryOptionsLoading = false;
  catalogueOptionsLoading = false;
  readonly complianceLevelOptions = TENDER_COMPLIANCE_LEVELS;

  showServiceCategoryDropdown = false;
  showComplianceDropdown = false;
  showSectorDropdown = false;
  showCountryDropdown = false;
  showFrameworkDropdown = false;

  selectedServiceCategory: Category | null = null;
  selectedServiceCategoryLeafNames: string[] = [];
  selectedComplianceLevels: string[] = [];
  selectedCountryCodes: string[] = [];
  selectedSectorIds: string[] = [];
  selectedSectorLeafNames: string[] = [];
  selectedFrameworkIds: string[] = [];
  selectedFrameworkLeafNames: string[] = [];

  private leafNameCache = new Map<string, string[]>();
  private providerLoadSequence = 0;
  private serviceCategoryResolutionSequence = 0;
  private sectorResolutionSequence = 0;
  private frameworkResolutionSequence = 0;
  _safeInvitedList: Provider[] = [];

  // Default organization search filters
  orgFilters: SearchOrganizationsFilters = {
    categories: [],
    countries: [],
    complianceLevels: []
  };
  // Available providers list
  availableProviders: TenderProviderCandidate[] = [];

  // Tender form fields - Step 1: Title only
  tenderTitle: string = '';

  // Step 2: Date fields and PDF upload
  expectedCompletionDate: string = '';
  requestedCompletionDate: string = '';
  expectedDateSet: boolean = false;
  requestedDateSet: boolean = false;
  selectedPdfFile: File | null = null;
  pdfAttachmentSet: boolean = false;

  // Edit mode
  editingTenderId: string | null = null;
  existingAttachment: TenderAttachment | null = null;
  createdQuoteId: string | null = null;

  // Step 1 and 2 inputs, rendered by app-dynamic-form. Their values are mirrored into
  // tenderTitle / requestedCompletionDate / expectedCompletionDate, which the save logic reads.
  readonly titleForm = new FormGroup({
    title: new FormControl('', [Validators.required, noWhitespaceValidator]),
  });

  readonly datesForm = new FormGroup({
    start: new FormControl('', [Validators.required, this.yearRangeValidator()]),
    end: new FormControl('', [Validators.required, this.yearRangeValidator(), this.endAfterStartValidator()]),
    // UploadedAttachment: a picked file (with .file) or the tender's current PDF (no .file)
    pdf: new FormControl<UploadedAttachment | null>(null, [Validators.required]),
  });

  private readonly titleFieldsEditable: FormField[] = [this.titleField(false)];
  private readonly titleFieldsReadonly: FormField[] = [this.titleField(true)];

  /** Read-only once the tender exists: going back to step 1 never renames or recreates it. */
  get titleFields(): FormField[] {
    return this.createdQuoteId ? this.titleFieldsReadonly : this.titleFieldsEditable;
  }

  readonly dateFields: FormField[] = [
    {
      name: 'start', type: 'date', label: 'TENDERS.CREATE._start_date', required: true, min: this.minDate,
      dataCy: 'tenderStartDate', errorMessages: { yearRange: 'TENDERS.CREATE._err_year_range' },
    },
    {
      name: 'end', type: 'date', label: 'TENDERS.CREATE._end_date', required: true, min: this.minDate,
      dataCy: 'tenderEndDate',
      errorMessages: { yearRange: 'TENDERS.CREATE._err_year_range', endBeforeStart: 'TENDERS.CREATE._err_end_before_start' },
    },
    {
      // Kept local: the step's save sends it with addAttachmentToQuote
      name: 'pdf', type: 'attachment', label: 'TENDERS.CREATE._pdf', required: true, colSpan: 2,
      accept: '.pdf,application/pdf', maxFileSize: 10 * 1024 * 1024, deferUpload: true,
      hint: 'TENDERS.CREATE._pdf_help', dataCy: 'tenderPdf',
    },
  ];

  // Track tender creation steps
  tenderCreationStep: number = 1; // 1 = Title, 2 = Dates, 3 = Providers

  // Expose constant to template

  get minDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.titleForm.controls.title.valueChanges.subscribe(value => this.tenderTitle = value ?? '');
    this.datesForm.controls.start.valueChanges.subscribe(value => {
      this.requestedCompletionDate = value ?? '';
      // The end date is only valid relative to the start date
      this.datesForm.controls.end.updateValueAndValidity({ emitEvent: false });
    });
    this.datesForm.controls.end.valueChanges.subscribe(value => this.expectedCompletionDate = value ?? '');
    this.datesForm.controls.pdf.valueChanges.subscribe(value => {
      if (value?.file) {
        this.selectedPdfFile = value.file;
      } else if (!value) {
        // Removed: a new PDF is required again
        this.selectedPdfFile = null;
        this.existingAttachment = null;
        this.pdfAttachmentSet = false;
      }
    });

    // Use customerId if provided from parent, otherwise get from localStorage
    if (this.customerId) {
      this.currentUserId = this.customerId;
    } else {
      const loginInfo = this.localStorage.getObject('login_items') as LoginInfo;
      if (loginInfo && loginInfo.logged_as == loginInfo.id) {
        this.currentUserId = loginInfo.partyId;
      } else if (loginInfo && loginInfo.logged_as) {
        const loggedOrg = loginInfo.organizations.find((element: { id: any; }) => element.id == loginInfo.logged_as);
        this.currentUserId = loggedOrg?.partyId;
      }
    }

    // Filter options (categories, countries, compliance levels) and the provider list
    // are loaded lazily in proceedToProviderSelection() when the user enters step 3.
  }

  ngOnChanges(changes: SimpleChanges) {
    // Check if tenderToEdit has changed and is not null
    if (changes['tenderToEdit'] && this.tenderToEdit) {
      this.loadTenderForEdit(this.tenderToEdit);
    }
    // Also check if modal was just opened and we have a tender to edit
    if (changes['isOpen'] && this.isOpen && this.tenderToEdit) {
      this.loadTenderForEdit(this.tenderToEdit);
    }
  }

  loadTenderForEdit(tender: Tender) {
    // Set basic fields
    this.editingTenderId = tender.id || null;
    this.createdQuoteId = tender.id || null;
    this.tenderTitle = tender.tenderNote || '';

    // Set dates if they exist
    if (tender.expectedFulfillmentStartDate) {
      this.requestedCompletionDate = this.formatDateForInput(tender.expectedFulfillmentStartDate);
      this.requestedDateSet = true;
    }

    if (tender.effectiveQuoteCompletionDate) {
      this.expectedCompletionDate = this.formatDateForInput(tender.effectiveQuoteCompletionDate);
      this.expectedDateSet = true;
    }

    // Set attachment if exists
    if (tender.attachment) {
      this.existingAttachment = tender.attachment;
      this.pdfAttachmentSet = true;
    }

    // Always start at step 2 when clicking EDIT to ensure proper initialization and API calls
    this.tenderCreationStep = 2;
    this.syncFormsFromModel();
  }

  private formatDateForInput(isoDate: string): string {
    try {
      const date = new Date(isoDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }

  closeTenderModal() {
    this.isOpen = false;
    this.tenderCreationStep = 1;
    this.selectedProviders.clear();
    this.invitedProviders = [];
    this.tenderProviders = [];
    this.tenderError = null;
    this.providerSearchLoading = false;
    this.providerInviteSaving = false;
    this.editingTenderId = null;
    this.resetTenderForm();
    this.closeModal.emit();
  }

  /**
   * Show generic confirmation dialog
   */
  showConfirmation(
    title: string,
    message: string,
    callback: () => void,
    buttonText: string = 'CONFIRM_MODAL._confirm',
    variant: ButtonVariant = 'primary'
  ) {
    this.genericConfirmTitle = title;
    this.genericConfirmMessage = message;
    this.genericConfirmButtonText = buttonText;
    this.genericConfirmVariant = variant;
    this.genericConfirmCallback = () => {
      callback();
      this.showGenericConfirm = false;
    };
    this.showGenericConfirm = true;
  }

  resetTenderForm() {
    this.tenderTitle = '';
    this.expectedCompletionDate = '';
    this.requestedCompletionDate = '';
    this.expectedDateSet = false;
    this.requestedDateSet = false;
    this.existingAttachment = null;
    this.createdQuoteId = null;
    this.selectedPdfFile = null;
    this.pdfAttachmentSet = false;
    this.invitedProviders = [];
    this.providerSearchLoading = false;
    this.providerInviteSaving = false;
    this.syncFormsFromModel();
  }

  /**
   * Step 1: Save initial tender with just title
   * Calls createCoordinatorQuote API
   */
  saveInitialTender(): Promise<boolean> {
    // Already created (came back to this step): moving on must not create a second tender
    if (this.createdQuoteId) {
      return Promise.resolve(true);
    }

    if (!this.tenderTitle.trim()) {
      this.notificationService.showError('TENDERS.CREATE._title_required');
      return Promise.resolve(false);
    }

    if (!this.currentUserId) {
      this.notificationService.showError('TENDERS.CREATE._not_logged');
      return Promise.resolve(false);
    }

    this.tenderLoading = true;

    return new Promise(resolve => this.quoteService.createCoordinatorQuote(this.currentUserId!, this.tenderTitle.trim()).subscribe({
      next: (createdTender) => {
        this.createdQuoteId = createdTender.id || null;
        this.editingTenderId = createdTender.id || null;
        this.notificationService.showSuccess('TENDERS.CREATE._created_next');
        this.tenderLoading = false;

        // Move to Step 2: Date fields
        this.tenderCreationStep = 2;
        // Notify the parent dashboard so the new tender appears in the list immediately
        this.tenderUpdated.emit();
        resolve(true);
      },
      error: (error) => {
        console.error('Error creating tender:', error);
        this.notificationService.showError('TENDERS.CREATE._create_error', { details: error?.message });
        this.tenderLoading = false;
        resolve(false);
      }
    }));
  }

  /**
   * Convert date from YYYY-MM-DD to DD-MM-YYYY format
   */
  formatDateForAPI(dateString: string): string {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  }

  /**
   * Step 2: Set expected completion date
   */
  setExpectedDate() {
    if (!this.expectedCompletionDate || !this.createdQuoteId) {
      this.notificationService.showError('TENDERS.CREATE._date_required');
      return;
    }

    this.tenderLoading = true;
    const formattedDate = this.formatDateForAPI(this.expectedCompletionDate);

    this.quoteService.updateQuoteDate(this.createdQuoteId, formattedDate, 'effective').subscribe({
      next: (updatedTender: any) => {
        this.expectedDateSet = true;
        this.notificationService.showSuccess('TENDERS.CREATE._end_date_saved');
        this.tenderLoading = false;
        // Emit update event so parent can refresh the tender list
        this.tenderUpdated.emit();
      },
      error: (error: any) => {
        console.error('Error setting effective date:', error);
        this.notificationService.showError('TENDERS.CREATE._date_error', { details: error?.message });
        this.tenderLoading = false;
      }
    });
  }

  /**
   * Step 2: Set requested completion date
   */
  setRequestedDate() {
    if (!this.requestedCompletionDate || !this.createdQuoteId) {
      this.notificationService.showError('TENDERS.CREATE._date_required');
      return;
    }

    this.tenderLoading = true;
    const formattedDate = this.formatDateForAPI(this.requestedCompletionDate);

    this.quoteService.updateQuoteDate(this.createdQuoteId, formattedDate, 'expectedFulfillment').subscribe({
      next: (updatedTender: any) => {
        this.requestedDateSet = true;
        this.notificationService.showSuccess('TENDERS.CREATE._start_date_saved');
        this.tenderLoading = false;
        // Emit update event so parent can refresh the tender list
        this.tenderUpdated.emit();
      },
      error: (error: any) => {
        console.error('Error setting expected fulfillment date:', error);
        this.notificationService.showError('TENDERS.CREATE._date_error', { details: error?.message });
        this.tenderLoading = false;
      }
    });
  }

  /**
   * Step 2: Handle PDF file selection
   */
  /**
   * Step 2: Upload PDF attachment
   */
  setPdfAttachment() {
    if (!this.selectedPdfFile || !this.createdQuoteId) {
      this.notificationService.showError('TENDERS.CREATE._pdf_required');
      return;
    }

    this.tenderLoading = true;

    this.quoteService.addAttachmentToQuote(this.createdQuoteId, this.selectedPdfFile, '').subscribe({
      next: (updatedQuote: any) => {
        this.setAttachmentFromQuoteOrFile(updatedQuote, this.selectedPdfFile);

        // Reset the file input to show the updated state
        this.selectedPdfFile = null;
        const fileInput = document.getElementById('pdfFile') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }

        this.notificationService.showSuccess('TENDERS.CREATE._pdf_uploaded');
        this.tenderLoading = false;
      },
      error: (error: any) => {
        console.error('Error uploading PDF:', error);
        this.notificationService.showError('TENDERS.CREATE._pdf_error', { details: error?.message });
        this.tenderLoading = false;
      }
    });
  }

  private setAttachmentFromQuoteOrFile(updatedQuote: any, fallbackFile: File | null): void {
    const attachment = updatedQuote?.quoteItem
      ?.flatMap((item: any) => item?.attachment ?? [])
      ?.find((item: any) => item);

    if (attachment) {
      this.existingAttachment = {
        name: attachment.name || fallbackFile?.name || 'attachment.pdf',
        mimeType: attachment.mimeType || fallbackFile?.type || 'application/pdf',
        content: attachment.content,
        url: attachment.url,
        href: attachment.href,
        path: attachment.path,
        size: attachment.size?.amount ?? fallbackFile?.size
      };
    } else if (fallbackFile) {
      this.existingAttachment = {
        name: fallbackFile.name,
        mimeType: fallbackFile.type || 'application/pdf',
        size: fallbackFile.size
      };
    }

    this.pdfAttachmentSet = Boolean(this.existingAttachment);
  }

  /** Copies the model fields back into the forms after code sets them (edit load, reset). */
  private syncFormsFromModel() {
    this.titleForm.setValue({ title: this.tenderTitle }, { emitEvent: false });
    this.datesForm.setValue({
      start: this.requestedCompletionDate,
      end: this.expectedCompletionDate,
      pdf: this.existingAttachment
        ? { name: this.existingAttachment.name, url: this.existingAttachment.url || this.existingAttachment.href || '', attachmentType: this.existingAttachment.mimeType }
        : null,
    }, { emitEvent: false });
    this.datesForm.controls.end.updateValueAndValidity({ emitEvent: false });
  }

  private titleField(readonly: boolean): FormField {
    return {
      name: 'title', type: 'string', label: 'TENDERS.CREATE._tender_title', required: true, readonly,
      placeholder: 'TENDERS.CREATE._tender_title_placeholder', dataCy: 'tenderTitleInput',
    };
  }

  private yearRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const { min, max } = this.step2YearRange;
      const year = new Date(control.value).getFullYear();
      return year < min || year > max ? { yearRange: true } : null;
    };
  }

  private endAfterStartValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const start = control.parent?.get('start')?.value;
      if (!control.value || !start) return null;
      return new Date(control.value) <= new Date(start) ? { endBeforeStart: true } : null;
    };
  }

  /** Dates must fall within this year and the next ten (passed to the year error messages). */
  get step2YearRange(): { min: number; max: number } {
    const min = new Date().getFullYear();
    return { min, max: min + 10 };
  }

  /** i18n key (TENDERS.CREATE._err_*) of the first step 2 problem, '' when the step is complete. */
  get step2ValidationError(): string {
    const { min, max } = this.step2YearRange;
    const outOfRange = (date: string) => {
      const year = new Date(date).getFullYear();
      return year < min || year > max;
    };

    if (this.requestedCompletionDate && outOfRange(this.requestedCompletionDate)) {
      return 'TENDERS.CREATE._err_year_range';
    }
    if (this.expectedCompletionDate && outOfRange(this.expectedCompletionDate)) {
      return 'TENDERS.CREATE._err_year_range';
    }
    if (this.requestedCompletionDate && this.expectedCompletionDate
      && new Date(this.expectedCompletionDate) <= new Date(this.requestedCompletionDate)) {
      return 'TENDERS.CREATE._err_end_before_start';
    }
    if (!this.requestedCompletionDate || !this.expectedCompletionDate) {
      return 'TENDERS.CREATE._err_dates_required';
    }
    if (!this.selectedPdfFile && !this.existingAttachment) {
      return 'TENDERS.CREATE._err_pdf_required';
    }
    return '';
  }

  isStep2Complete(): boolean {
    return this.step2ValidationError === '';
  }

  /**
   * Proceed from Step 2 to Step 3: saves all data sequentially then moves to provider selection
   */
  proceedToProviderSelection(): Promise<boolean> {
    if (!this.isStep2Complete() || !this.createdQuoteId) return Promise.resolve(false);

    this.tenderLoading = true;
    const pendingPdfFile = this.selectedPdfFile;

    const formattedRequested = this.formatDateForAPI(this.requestedCompletionDate);
    const formattedExpected = this.formatDateForAPI(this.expectedCompletionDate);

    // 1. Set tender start date
    return new Promise(resolve => this.quoteService.updateQuoteDate(this.createdQuoteId!, formattedRequested, 'expectedFulfillment').pipe(
      // 2. Set tender end date
      switchMap(() => this.quoteService.updateQuoteDate(this.createdQuoteId!, formattedExpected, 'effective')),
      // 3. Upload PDF only if a new file was selected (skip if keeping existing)
      switchMap(() => {
        if (pendingPdfFile) {
          return this.quoteService.addAttachmentToQuote(this.createdQuoteId!, pendingPdfFile, '');
        }
        return of(null);
      })
    ).subscribe({
      next: (updatedQuote: any) => {
        if (pendingPdfFile) {
          this.setAttachmentFromQuoteOrFile(updatedQuote, pendingPdfFile);
          this.selectedPdfFile = null;
          this.syncFormsFromModel();
        }

        this.tenderLoading = false;
        this.notificationService.showSuccess('TENDERS.CREATE._details_saved');
        this.tenderCreationStep = 3;

        // Notify parent so the list reflects the saved dates and PDF immediately
        this.tenderUpdated.emit();

        this.resetTenderFilters();
        this.loadFilterOptions();
        this.loadTenderProviders();
        resolve(true);
      },
      error: (error: any) => {
        this.tenderLoading = false;
        this.notificationService.showError('TENDERS.CREATE._details_error');
        console.error('Error saving tender step 2:', error);
        resolve(false);
      }
    }));
  }

  /** app-stepper's beforeNext: the title and dates steps save to the server before moving on. */
  saveStep = (stepId: string | undefined): Promise<boolean> => {
    if (stepId === 'title') return this.saveInitialTender();
    if (stepId === 'dates') return this.proceedToProviderSelection();
    return Promise.resolve(true);
  };

  get canAdvanceStep(): boolean {
    if (this.tenderCreationStep === 1) return this.titleForm.valid;
    if (this.tenderCreationStep === 2) return this.isStep2Complete();
    return true;
  }

  onStepChanged(event: StepChangedEvent) {
    this.tenderCreationStep = event.step + 1;
  }

  /**
   * Load providers from the search API.
   * An empty result set is valid (no providers match the active filters).
   * Only falls back to the full party-organisation list when the search
   * endpoint returns an actual HTTP error.
   */
  loadTenderProviders() {
    const loadSequence = ++this.providerLoadSequence;
    this.providerSearchLoading = true;
    this.tenderError = null;
    this.providerSearchWarning = null;

    this.providerService.getProvidersForTenderNew(this.orgFilters).subscribe({
      next: (providers) => {
        if (!this.isCurrentProviderLoad(loadSequence)) return;

        this.tenderProviders = providers ?? [];
        this.updateAvailableProviders();

        if (this.tenderCreationStep === 3) {
          this.loadInvitedProviders();
        } else {
          this.providerSearchLoading = false;
        }
      },
      error: (err) => {
        if (!this.isCurrentProviderLoad(loadSequence)) return;

        if (!shouldUseUnfilteredProviderFallback(this.orgFilters)) {
          console.warn('Filtered search endpoint returned an error:', err);
          this.providerSearchWarning = 'TENDERS.CREATE._filters_warning';
          this.tenderProviders = [];
          this.providerSearchLoading = false;
          this.updateAvailableProviders();
          return;
        }

        // HTTP error from the search endpoint — fall back to the full organisation list
        console.warn('Search endpoint returned an error, falling back to full provider list:', err);
        this.providerService.getProvidersForTender().subscribe({
          next: (fallbackProviders) => {
            if (!this.isCurrentProviderLoad(loadSequence)) return;

            this.tenderProviders = fallbackProviders;
            this.updateAvailableProviders();

            if (this.tenderCreationStep === 3) {
              this.loadInvitedProviders();
            } else {
              this.providerSearchLoading = false;
            }
          },
          error: (fallbackErr) => {
            if (!this.isCurrentProviderLoad(loadSequence)) return;

            this.tenderError = 'TENDERS.CREATE._providers_load_error';
            this.providerSearchLoading = false;
            console.error('Fallback endpoint also failed:', fallbackErr);
          }
        });
      }
    });
  }

  private isCurrentProviderLoad(sequence: number): boolean {
    return sequence === this.providerLoadSequence;
  }

  /**
   * Emit filter changes and reload providers
   */
  emitFilters(): void {
    this.orgFilters = buildTenderProviderSearchFilters({
      serviceCategoryLeafNames: this.selectedServiceCategoryLeafNames,
      addressableSectorLeafNames: this.selectedSectorLeafNames,
      integrationFrameworkLeafNames: this.selectedFrameworkLeafNames,
      countryCodes: this.selectedCountryCodes,
      complianceLevels: this.selectedComplianceLevels,
    });
    this.loadTenderProviders();
  }

  /**
   * Are any filters currently active?
   */
  hasActiveFilters(): boolean {
    return hasTenderProviderSearchFilters(this.orgFilters);
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.resetTenderFilters();
    this.emitFilters();
  }

  private resetTenderFilters(): void {
    this.serviceCategoryResolutionSequence++;
    this.sectorResolutionSequence++;
    this.frameworkResolutionSequence++;
    this.orgFilters = { categories: [], countries: [], complianceLevels: [] };
    this.selectedServiceCategory = null;
    this.selectedServiceCategoryLeafNames = [];
    this.selectedComplianceLevels = [];
    this.selectedCountryCodes = [];
    this.selectedSectorIds = [];
    this.selectedSectorLeafNames = [];
    this.selectedFrameworkIds = [];
    this.selectedFrameworkLeafNames = [];
    this.closeTenderFilterDropdowns();
  }

  async selectServiceCategory(category: Category | null, event?: Event): Promise<void> {
    event?.stopPropagation();
    const resolutionSequence = ++this.serviceCategoryResolutionSequence;
    this.selectedServiceCategory = category;
    const leafNames = category ? await this.resolveLeafNames(category) : [];

    if (resolutionSequence !== this.serviceCategoryResolutionSequence) return;

    this.selectedServiceCategoryLeafNames = leafNames;
    this.showServiceCategoryDropdown = false;
    this.emitFilters();
  }

  toggleComplianceLevel(code: string, event: Event): void {
    event.stopPropagation();
    this.selectedComplianceLevels = this.toggleValue(this.selectedComplianceLevels, code);
    this.emitFilters();
  }

  toggleCountry(code: string, event: Event): void {
    event.stopPropagation();
    this.selectedCountryCodes = this.toggleValue(this.selectedCountryCodes, code);
    this.emitFilters();
  }

  async toggleAddressableSector(option: Category, event: Event): Promise<void> {
    event.stopPropagation();
    const resolutionSequence = ++this.sectorResolutionSequence;
    const id = option.id ?? option.name;
    this.selectedSectorIds = this.toggleValue(this.selectedSectorIds, id);
    const leafNames = await this.resolveSelectedLeafNames(
      this.addressableSectorOptions,
      this.selectedSectorIds
    );

    if (resolutionSequence !== this.sectorResolutionSequence) return;

    this.selectedSectorLeafNames = leafNames;
    this.emitFilters();
  }

  async toggleIntegrationFramework(option: Category, event: Event): Promise<void> {
    event.stopPropagation();
    const resolutionSequence = ++this.frameworkResolutionSequence;
    const id = option.id ?? option.name;
    this.selectedFrameworkIds = this.toggleValue(this.selectedFrameworkIds, id);
    const leafNames = await this.resolveSelectedLeafNames(
      this.integrationFrameworkOptions,
      this.selectedFrameworkIds
    );

    if (resolutionSequence !== this.frameworkResolutionSequence) return;

    this.selectedFrameworkLeafNames = leafNames;
    this.emitFilters();
  }

  isComplianceSelected(code: string): boolean {
    return this.selectedComplianceLevels.includes(code);
  }

  isCountrySelected(code: string): boolean {
    return this.selectedCountryCodes.includes(code);
  }

  isSectorSelected(option: Category): boolean {
    return this.selectedSectorIds.includes(option.id ?? option.name);
  }

  isFrameworkSelected(option: Category): boolean {
    return this.selectedFrameworkIds.includes(option.id ?? option.name);
  }

  toggleTenderFilterDropdown(
    name: 'serviceCategory' | 'compliance' | 'sector' | 'country' | 'framework',
    event: Event
  ): void {
    event.stopPropagation();
    this.showServiceCategoryDropdown = name === 'serviceCategory' ? !this.showServiceCategoryDropdown : false;
    this.showComplianceDropdown = name === 'compliance' ? !this.showComplianceDropdown : false;
    this.showSectorDropdown = name === 'sector' ? !this.showSectorDropdown : false;
    this.showCountryDropdown = name === 'country' ? !this.showCountryDropdown : false;
    this.showFrameworkDropdown = name === 'framework' ? !this.showFrameworkDropdown : false;
  }

  closeTenderFilterDropdowns(): void {
    this.showServiceCategoryDropdown = false;
    this.showComplianceDropdown = false;
    this.showSectorDropdown = false;
    this.showCountryDropdown = false;
    this.showFrameworkDropdown = false;
  }

  private toggleValue(values: string[], value: string): string[] {
    return values.includes(value)
      ? values.filter(current => current !== value)
      : [...values, value];
  }

  private async resolveSelectedLeafNames(options: Category[], selectedIds: string[]): Promise<string[]> {
    const selected = options.filter(option => selectedIds.includes(option.id ?? option.name));
    const nested = await Promise.all(selected.map(option => this.resolveLeafNames(option)));
    return Array.from(new Set(nested.flat()));
  }

  private async resolveLeafNames(category: Category): Promise<string[]> {
    const cacheKey = category.id ?? category.name;
    const cached = this.leafNameCache.get(cacheKey);
    if (cached) return cached;

    const leafNames = await resolveTenderCategoryLeafNames(category, async (id) => {
      const children = await this.api.getCategoriesByParentId(id).catch(() => []);
      return Array.isArray(children) ? children : [];
    });

    this.leafNameCache.set(cacheKey, leafNames);
    return leafNames;
  }

  toggleProviderSelection(providerId: string) {
    // find in local safe list (which stores { provider, quoteId })
    const idx = this._safeInvitedList.findIndex(x => x?.id === providerId);

    if (idx >= 0) {
      // UNCHECK → remove from local safe list
      this._safeInvitedList.splice(idx, 1);
    } else {
      // CHECK → add to local safe list
      const p = this.tenderProviders.find(tp => tp.id === providerId);
      if (p) {
        this._safeInvitedList.push(p);
      }
    }

    // Re-derive selectedProviders + available list in one place
    this.rebuildSelectionAndAvailable();
  }

  private rebuildSelectionAndAvailable(): TenderProviderCandidate[] {
    // 1) selectedProviders = IDs from local safe list
    this.selectedProviders = new Set(
      this._safeInvitedList
        .map(x => x?.id)
        .filter((id): id is string => !!id)
    );

    const invitedProviderIds = new Set(
      this.invitedProviders
        .map(ip => ip?.provider?.id)
        .filter((id): id is string => !!id)
    );

    this.availableProviders = buildStableProviderCandidates({
      tenderProviders: this.tenderProviders,
      invitedProviderIds,
      selectedProviderIds: this.selectedProviders,
    });

    return this.availableProviders;
  }

  /**
   * Load already invited providers by fetching tendering quotes with the coordinator quote's externalId.
   *
   * Name resolution priority:
   *  1. Match the provider's org URN (tender.selectedProviders[0]) against the already-loaded
   *     tenderProviders list — this covers the common case with no extra API calls.
   *  2. Fall back to AccountServiceService.getOrgInfo() for providers not in the cached list
   *     (e.g. when reopening the modal without navigating to the provider-search step first).
   */
  loadInvitedProviders() {
    if (!this.createdQuoteId || !this.currentUserId) {
      this.providerSearchLoading = false;
      return;
    }


    this.providerSearchLoading = true;

    this.quoteService.getTenderingQuotesByUser(this.currentUserId, API_ROLES.BUYER).subscribe({
      next: async (tenders) => {

        // Filter tenders that match our coordinator quote as their parent
        const matchingTenders = tenders.filter(t => t.external_id === this.createdQuoteId && !!t.id);

        // Resolve provider display names, then populate invitedProviders
        const entries = await Promise.all(
          matchingTenders.map(async (tender) => {
            // The org URN lives in selectedProviders[0] (mapped from relatedParty[Seller].id)
            const providerOrgUrn = tender.selectedProviders?.[0];

            // 1. Try the already-loaded provider list first (no extra network call)
            const knownProvider = providerOrgUrn
              ? this.tenderProviders.find(p => p.id === providerOrgUrn)
              : undefined;

            if (knownProvider) {
              return { provider: knownProvider, quoteId: tender.id! };
            }

            // 2. Fall back to account service to get the trading name by org URN
            let tradingName = providerOrgUrn || 'Unknown Provider';
            if (providerOrgUrn) {
              try {
                const org = await this.accountService.getOrgInfo(providerOrgUrn);
                tradingName = org?.tradingName || org?.name || providerOrgUrn;
              } catch {
                // Network error — keep the URN as a recognisable fallback
              }
            }

            const provider: Provider = { id: providerOrgUrn, tradingName };
            return { provider, quoteId: tender.id! };
          })
        );

        this.invitedProviders = entries;
        this.rebuildSelectionAndAvailable();
        this.providerSearchLoading = false;
      },
      error: (error) => {
        console.error('Error loading invited providers:', error);
        this.providerSearchLoading = false;
      }
    });
  }

  /**
   * Go back from Step 3 to Step 2
   */
  backToStep2() {
    this.tenderCreationStep = 2;
  }

  /**
   * Format date from YYYY-MM-DD to DD/MM/YYYY for display
   */
  formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateString;
  }

  /**
   * Update available providers list
   */
  updateAvailableProviders(): void {
    this.availableProviders = this.getAvailableProviders();
  }

  /**
   * Get available providers (excluding already invited ones)
   */
  getAvailableProviders(): TenderProviderCandidate[] {
    return this.rebuildSelectionAndAvailable();
  }

  /**
   * Step 3: Save providers list by creating tendering quotes for selected providers
   */
  saveProvidersList() {
    if (this.selectedProviders.size === 0) {
      this.notificationService.showError('TENDERS.CREATE._select_one');
      return;
    }

    if (!this.createdQuoteId || !this.currentUserId) {
      this.notificationService.showError('TENDERS.CREATE._coordinator_missing');
      return;
    }

    this.providerInviteSaving = true;
    const providerIds = Array.from(this.selectedProviders);
    const customerMessage = this.tenderTitle;


    // Create tendering quotes one by one to capture individual quote IDs
    const requests = providerIds.map(providerId => {
      const provider = this._safeInvitedList.find(p => p.id === providerId);

      return this.quoteService.createTenderingQuote(
        this.currentUserId!,
        providerId,
        this.createdQuoteId!,
        customerMessage
      ).toPromise().then(tender => {
        if (!tender || !tender.id || !provider) {
          throw new Error('Failed to create quote for provider');
        }
        return {
          provider: provider,
          quoteId: tender.id
        };
      });
    });

    Promise.all(requests)
      .then(results => {

        // Add to invited providers list
        this.invitedProviders.push(...results);

        // Clear selection and safe list
        this.selectedProviders.clear();
        this._safeInvitedList = [];
        this.rebuildSelectionAndAvailable();

        this.notificationService.showSuccess('TENDERS.CREATE._providers_saved');
        this.tenderUpdated.emit();
        this.providerInviteSaving = false;
      })
      .catch(error => {
        console.error('Error creating tendering quotes:', error);
        this.notificationService.showError('TENDERS.CREATE._invite_error', { details: error?.message });
        this.providerInviteSaving = false;
      });
  }

  /**
   * Remove an invited provider by deleting their tendering quote
   */
  removeInvitedProvider(quoteId: string, providerId: string | undefined) {
    if (!quoteId) return;

    this.showConfirmation(
      'TENDERS.CREATE._confirm_remove_title',
      'TENDERS.CREATE._confirm_remove_msg',
      () => {
        this.providerInviteSaving = true;

        this.quoteService.deleteQuote(quoteId).subscribe({
          next: () => {

            this.completeInvitedProviderRemoval(quoteId, providerId);

            this.notificationService.showSuccess('TENDERS.CREATE._invite_removed');
            this.providerInviteSaving = false;
          },
          error: (error) => {
            // TEMPORARY WORKAROUND — sandbox environment issue:
            // The TMForum/BAE backend can delete the quote and then return an error when a
            // downstream notification hop times out or is unreachable. In that case, the
            // frontend receives the error after the useful delete side effect already happened.
            //
            // Treat known false-positive delete errors as success so the UI stays consistent with
            // the backend state and does not show a failure for a removed invitation.
            //
            // TODO: Remove this workaround once the sandbox downstream service is reachable
            // and the BAE no longer returns errors on successful quote deletion.
            const isKnownFalsePositive = this.isKnownDeleteQuoteFalsePositive(error);

            if (isKnownFalsePositive) {
              console.warn(
                '[WORKAROUND] deleteQuote returned a false-positive error for quoteId:', quoteId,
                '— removing from UI anyway.'
              );
              this.completeInvitedProviderRemoval(quoteId, providerId);
              this.notificationService.showSuccess('TENDERS.CREATE._invite_removed');
            } else {
              console.error('Error deleting quote:', error);
              this.notificationService.showError('TENDERS.CREATE._remove_error', { details: error?.message });
            }
            this.providerInviteSaving = false;
          }
        });
      },
      'TENDERS.CREATE._remove',
      'danger'
    );
  }

  private completeInvitedProviderRemoval(quoteId: string, providerId?: string): void {
    const resolvedProviderId = providerId ?? this.invitedProviders.find(ip => ip.quoteId === quoteId)?.provider?.id;

    this.invitedProviders = this.invitedProviders.filter(ip => ip.quoteId !== quoteId);

    if (resolvedProviderId) {
      this.selectedProviders.delete(resolvedProviderId);
      this._safeInvitedList = this._safeInvitedList.filter(provider => provider.id !== resolvedProviderId);
    }

    this.rebuildSelectionAndAvailable();
  }

  private isKnownDeleteQuoteFalsePositive(error: any): boolean {
    return error?.status === 404 ||
      error?.status === 504 ||
      (error?.status === 500 && error?.error?.error === 'Service unreachable');
  }

  /**
   * Step 3: Finalize and complete tender creation
   */
  finalizeTender() {
    if (this.invitedProviders.length === 0) {
      this.notificationService.showError('TENDERS.CREATE._invite_one_first');
      return;
    }

    if (!this.createdQuoteId) {
      this.notificationService.showError('TENDERS.CREATE._coordinator_missing');
      return;
    }

    this.showConfirmation(
      'TENDERS.CREATE._confirm_finalize_title',
      'TENDERS.CREATE._confirm_finalize_msg',
      () => this.executeFinalizeTender(),
      'TENDERS.CREATE._submit',
      'primary'
    );
  }

  private executeFinalizeTender() {
    this.tenderLoading = true;

    // Get the coordinator quote to extract the dates
    this.quoteService.getQuoteById(this.createdQuoteId!).pipe(
      switchMap(coordinatorQuote => {

        const formattedEffectiveDate = this.formatDateForAPI(this.expectedCompletionDate);
        const formattedExpectedFulfillmentDate = this.formatDateForAPI(this.requestedCompletionDate);


        // Create array of date update observables for all invited provider quotes
        const dateUpdateObservables = this.invitedProviders.flatMap(invitedProvider => {
          const quoteId = invitedProvider.quoteId;

          return [
            this.quoteService.updateQuoteDate(quoteId, formattedEffectiveDate, 'expected'),
            this.quoteService.updateQuoteDate(quoteId, formattedExpectedFulfillmentDate, 'requested')
          ];
        });

        if (dateUpdateObservables.length === 0) {
          return of([]);
        }

        return forkJoin(dateUpdateObservables);
      }),
      switchMap(dateUpdateResults => {

        // Update coordinator quote status to "inProgress"
        return this.quoteService.updateQuoteStatus(this.createdQuoteId!, 'inProgress');
      })
    ).subscribe({
      next: (updatedQuote: any) => {

        this.notificationService.showSuccess('TENDERS.CREATE._finalized');

        this.tenderLoading = false;
        this.closeTenderModal();

        // Emit success - parent component will refresh the list
        this.tenderCreated.emit(updatedQuote);
      },
      error: (error: any) => {
        console.error('Error finalizing tender:', error);
        this.notificationService.showError('TENDERS.CREATE._finalize_error', { details: error?.message });
        this.tenderLoading = false;
      }
    });
  }

  /**
   * Load filter options for Tender Provider Search.
   * Only fetches the option lists — does NOT reset selected filter values
   * or trigger a provider reload.
   */
  private loadFilterOptions(): void {
    this.countryOptionsLoading = true;
    this.providerService.getProviderCountryOptions().subscribe({
      next: (options) => {
        this.countryOptions = options;
        this.countryOptionsLoading = false;
      },
      error: (err) => {
        console.warn('Failed to load provider countries', err);
        this.countryOptions = [];
        this.countryOptionsLoading = false;
      }
    });

    this.loadCatalogueFacetOptions();
  }

  private async loadCatalogueFacetOptions(): Promise<void> {
    this.catalogueOptionsLoading = true;
    try {
      const roots = await this.api.getDefaultCategories();
      const options = await resolveTenderCatalogueFacetOptions(
        Array.isArray(roots) ? roots : [],
        (id) => this.api.getCategoriesByParentId(id)
      );

      this.serviceCategoryOptions = options.serviceCategories;
      this.addressableSectorOptions = options.addressableSectors;
      this.integrationFrameworkOptions = options.integrationFrameworks;
    } catch (error) {
      console.warn('Tender catalogue filters failed:', error);
      this.serviceCategoryOptions = [];
      this.addressableSectorOptions = [];
      this.integrationFrameworkOptions = [];
    } finally {
      this.catalogueOptionsLoading = false;
    }
  }
}

