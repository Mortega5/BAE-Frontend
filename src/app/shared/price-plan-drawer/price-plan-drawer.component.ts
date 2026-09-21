import {Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ChangeDetectorRef, SimpleChanges} from '@angular/core';
import {CharacteristicComponent} from "../characteristic/characteristic.component";
import {MarkdownComponent} from "ngx-markdown";
import {components} from "../../models/product-catalog";
import {CurrencyPipe, NgClass} from "@angular/common";
import {PriceServiceService} from "../../services/price-service.service";
import {AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators} from "@angular/forms";
import { ShoppingCartServiceService } from 'src/app/services/shopping-cart-service.service';
import {EventMessageService} from "../../services/event-message.service";
import { cartProduct } from 'src/app/models/interfaces';
import { v4 as uuidv4 } from 'uuid';
import { certifications } from 'src/app/models/certification-standards.const';
import { PricePlanMetricsService } from 'src/app/services/price-plan-metrics.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleInfo } from '@fortawesome/pro-solid-svg-icons';
import { applyCharacteristicConstraints, CharacteristicConstraintValueUse } from '../price-plan-constraint.utils';
type Product = components["schemas"]["ProductOffering"];
type ProductSpecification = components["schemas"]["ProductSpecification"];
type ProductOfferingTerm = components["schemas"]["ProductOfferingTerm"];
type ProductSpecificationCharacteristic = components["schemas"]["ProductSpecificationCharacteristic"];
type AttachmentRefOrValue = components["schemas"]["AttachmentRefOrValue"];
import { FormsModule } from '@angular/forms';
import { lastValueFrom, Subscription } from 'rxjs';
import { LoadingSpinnerComponent } from "../loading-spinner/loading-spinner.component";
import { ButtonComponent } from "../button/button.component";
import { ContentCardComponent } from "../content-card/content-card.component";
import { ItemCardComponent } from "../item-card/item-card.component";
import { DrawerComponent } from "../drawer/drawer.component";
import { TranslateModule } from "@ngx-translate/core";


@Component({
  selector: 'app-price-plan-drawer',
  standalone: true,
  imports: [
    CharacteristicComponent,
    MarkdownComponent,
    NgClass,
    CurrencyPipe,
    ReactiveFormsModule,
    FormsModule,
    LoadingSpinnerComponent,
    ButtonComponent,
    ContentCardComponent,
    ItemCardComponent,
    DrawerComponent,
    TranslateModule,
    FaIconComponent
],
  templateUrl: './price-plan-drawer.component.html',
  styleUrl: './price-plan-drawer.component.css'
})
export class PricePlanDrawerComponent implements OnInit, OnDestroy {

  protected readonly faCircleInfo = faCircleInfo;

  @Input() drawerId: string = 'drawer-default'; // ID
  @Input() productOff: Product | undefined;
  @Input() prodSpec:ProductSpecification = {};
  @Input() isOpen: boolean = false; // drawer status
  @Input() width: string = 'w-80'; // manages width
  @Input() mode: 'cart' | 'modify' = 'cart';
  @Input() inventoryProductId: string | null = null;
  @Input() existingCharacteristics: any[] = [];
  @Output() closeDrawer = new EventEmitter<void>(); // Event to notify the closing of the drawer
  @Output() modifySubmit = new EventEmitter<any>();

  form: FormGroup;

  selectedPricePlan:any = null;
  isLoading = false; // Loading prices or not
  price: any[] = []; // Object with multiple types of prices (MOCK)
  tsAndCs: ProductOfferingTerm;
  /** Uploaded T&C files (offer's `terms-file` productOfferingTerm entries) — reviewing
   * and accepting either this or the license text (tsAndCs) is required to check out. */
  termsFileAttachments: { id: string; name: string; url: string }[] = [];
  hasProfile: boolean = false;
  isCustom: boolean = false;
  isFree: boolean = false;
  images: AttachmentRefOrValue[]  = [];
  toastVisibility: boolean = false;
  orderChars:any[]=[];
  selectedPriceComponents:any[]=[];
  selectedMetric:any;
  selectedUsageSpecId: string | null = null;
  selectedUnitOfMeasure: string | null = null;
  metrics:any[]=[];
  groupedMetrics: { [usageSpecId: string]: { usageSpecId: string; name: string; unitOfMeasure: string }[] } = {};

  characteristics: ProductSpecificationCharacteristic[] = []; // Características dinámicas
  /** Fixed characteristics coming from the selected price plan's profile
   * (prodSpecCharValueUse), if any — shown read-only, separate from the
   * configurable ones the customer can still pick. */
  profileCharacteristics: ProductSpecificationCharacteristic[] = [];
  /** Characteristics/values the selected price plan forbids — either set directly
   * on the plan, or resolved from a linked "constraint"-type ProductOfferingPrice. */
  constraintValueUses: CharacteristicConstraintValueUse[] = [];
  filteredCharacteristics: ProductSpecificationCharacteristic[] = [];
  booleanCharacteristics: ProductSpecificationCharacteristic[] = [];
  choiceCharacteristics: ProductSpecificationCharacteristic[] = [];
  rangeCharacteristics: ProductSpecificationCharacteristic[] = [];
  disabledCharacteristics: any[] = [];
  canBeDisabledChars: any[]=[];
  private readonly boundHandleEscape = (event: KeyboardEvent) => this.handleEscape(event);

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isOpen) {
      this.onClose();
    }
  }


  constructor(
    private fb: FormBuilder,
    private priceService: PriceServiceService,
    private cartService: ShoppingCartServiceService,
    private eventMessage: EventMessageService,
    private cdr: ChangeDetectorRef,
    private pricePlanMetricsService: PricePlanMetricsService) {
    // Crear el formulario padre
    this.form = this.fb.group({
      selectedPricePlan: [null, Validators.required], // Plan de precios seleccionado
      characteristics: this.fb.group({}), // Características seleccionadas
      tsAccepted: [false, Validators.requiredTrue] // Checkbox de aceptación de Ts&Cs
    });
  }


  ngOnInit(): void {
    // Escuchar eventos de teclado (por si necesitas otros)
    document.addEventListener('keydown', this.boundHandleEscape);
    this.toggleBodyScroll(this.isOpen);
    // Configurar los términos y condiciones
    console.log('---- producto')
    console.log(this.productOff)
    this.setTermsAcceptance();

    this.isFree = this.productOff?.productOfferingPrice?.length === 0;

    if (this.isFree) {
      this.form.get('selectedPricePlan')?.setValue({});
    }
    this.applyCharacteristicsSource();

    let profile = this.productOff?.attachment?.filter(item => item.name === 'Profile Picture') ?? [];
    console.log('profile...')
    console.log(profile)
    if(profile.length==0){
      this.images = this.productOff?.attachment?.filter(item => item.attachmentType === 'Picture') ?? [];
    } else {
      this.images = profile;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      this.toggleBodyScroll(!!changes['isOpen'].currentValue);
    }

    if (changes['prodSpec']) {
      this.applyCharacteristicsSource();
      this.updateOrderChars();
    }
    if (changes['isOpen']?.currentValue === true) {
      this.setTermsAcceptance();
    }
    if (changes['productOff'] && changes['productOff'].currentValue) {
      console.log('Changes...')
      console.log(this.productOff)

      this.isFree = this.productOff?.productOfferingPrice?.length === 0;

      if (this.isFree) {
        this.form.get('selectedPricePlan')?.setValue({});
      }
      this.applyCharacteristicsSource();

      let profile = this.productOff?.attachment?.filter(item => item.name === 'Profile Picture') ?? [];
      if(profile.length==0){
        this.images = this.productOff?.attachment?.filter(item => item.attachmentType === 'Picture') ?? [];
      } else {
        this.images = profile;
      }
    }
  }

  ngOnDestroy(): void {
    // Eliminar eventos de teclado al destruir el componente
    document.removeEventListener('keydown', this.boundHandleEscape);
    this.toggleBodyScroll(false);
  }

  // Método para cerrar el drawer
  onClose(): void {
    this.isOpen = false;
    this.toggleBodyScroll(false);
    this.closeDrawer.emit();
  }

  private toggleBodyScroll(lockScroll: boolean): void {
    document.body.style.overflow = lockScroll ? 'hidden' : '';
    document.documentElement.style.overflow = lockScroll ? 'hidden' : '';
  }

  /** Resolves the license text and any uploaded T&C files for this offer, and
   * auto-accepts tsAccepted only when there's genuinely nothing to review. */
  private setTermsAcceptance(): void {
    const licenseTerm = this.productOff?.productOfferingTerm?.find(
      (element: any) => element.name === 'License'
    );
    this.tsAndCs = licenseTerm ? { description: licenseTerm.description } : { description: '' };
    this.termsFileAttachments = this.extractTermsFileAttachments(this.productOff?.productOfferingTerm);

    const hasTermsToReview = this.tsAndCs.description !== '' || this.termsFileAttachments.length > 0;
    this.form.controls['tsAccepted'].setValue(!hasTermsToReview);
    this.cdr.detectChanges();
  }

  private extractTermsFileAttachments(terms: any[] | undefined): { id: string; name: string; url: string }[] {
    return (terms || [])
      .filter((term: any) => String(term?.name || '').toLowerCase() === 'terms-file' && term?.description)
      .map((term: any, index: number) => ({
        id: term.id || `terms-file-${index}`,
        name: this.fileNameFromUrl(term.description),
        url: term.description
      }));
  }

  private fileNameFromUrl(value: string): string {
    const last = value.split('/').pop() || value;
    let decoded = last;
    try { decoded = decodeURIComponent(last); } catch { }
    const underscore = decoded.indexOf('_');
    return underscore > -1 ? decoded.slice(underscore + 1) : decoded;
  }

  disableChars(){

  }

  /** Merges the base product spec's characteristics with the selected plan's
   * profile (if any) — profile entries win on name clashes, since they're the
   * plan-specific fixed values — and rebuilds the characteristics form from it. */
  private applyCharacteristicsSource(): void {
    const base = this.prodSpec.productSpecCharacteristic || [];
    const profileNames = new Set(this.profileCharacteristics.map(c => c.name));
    const merged = [
      ...this.profileCharacteristics,
      ...base.filter(c => !profileNames.has(c.name)),
    ];
    this.characteristics = applyCharacteristicConstraints(merged, this.constraintValueUses);
    this.filterCharacteristics();
  }

  filterCharacteristics() {
    this.filteredCharacteristics = [];
    this.booleanCharacteristics = [];
    this.choiceCharacteristics = [];
    this.rangeCharacteristics = [];
    this.disabledCharacteristics = [];
    this.canBeDisabledChars = [];

    // Set disabled prefixes
    const disabledPrefixes = this.characteristics
      .filter(c => c.name?.endsWith(' - enabled'))
      .filter(c => {
        const val = c.productSpecCharacteristicValue?.[0]?.value;
        const valueStr = String(val).toLowerCase();
        return valueStr === 'false';
      })
      .map(c => c.name?.replace(/ - enabled$/, '').trim());

    // Filter out certifications, self-att, and disabled prefixes
    this.filteredCharacteristics = this.characteristics.filter(char => {
      const isCertification = certifications.some(cert => cert.name === char.name);
      const iscredentialConfig = char.valueType === 'credentialsConfiguration';
      const isAuthPolicy = char.valueType === 'authorizationPolicy';
      //const isSelfAtt = char.name === 'Compliance:SelfAtt';
      const isCompliance = char?.name?.startsWith('Compliance:')
      /*const isDisabledByPrefix = disabledPrefixes.some(prefix =>
        char.name === prefix || char.name === `${prefix} - enabled`
      );*/

      return !isCertification && !isCompliance && !iscredentialConfig && !isAuthPolicy;
    });

    const characteristicsGroup = this.fb.group({});
    this.filteredCharacteristics.forEach(characteristic => {
      if (characteristic.id != null) {
        let defaultValue =
          characteristic.productSpecCharacteristicValue?.find(val => val.isDefault)?.value ??
          characteristic.productSpecCharacteristicValue?.find(val => val.isDefault)?.valueFrom;

        if (defaultValue === undefined && this.hasNoChoice(characteristic)) {
          // A single predefined value: there's nothing to pick between, so it's just the value.
          const onlyValue = characteristic.productSpecCharacteristicValue![0];
          defaultValue = onlyValue.value ?? onlyValue.valueFrom;
        }

        // "- enabled" companions aren't picked from a UI of their own — their value is
        // only ever set by the toggle checkbox (onToggleChange), so they can't be
        // required upfront or the form would stay invalid until the buyer touches a
        // toggle that already defaults to "enabled" and may never need touching.
        const requiresValue = characteristic.configurable !== false && !this.isEnabledCharacteristic(characteristic);
        let validator: ValidatorFn = Validators.required;
        if (this.isFreeRangeCharacteristic(characteristic)) {
          validator = this.rangeValueValidator;
        } else if (this.isFreeNumberCharacteristic(characteristic)) {
          validator = this.numberValueValidator;
        }
        const validators: ValidatorFn[] = requiresValue ? [validator] : [];

        characteristicsGroup.addControl(
          characteristic.id,
          this.fb.control(defaultValue ?? null, validators)
        );
        if(!characteristic.name?.endsWith('- enabled') && this.filteredCharacteristics.some((char => char.name === characteristic.name+' - enabled'))){
          this.canBeDisabledChars.push(characteristic.id)

          const enabledChar = this.filteredCharacteristics.find(char => char.name === characteristic.name+' - enabled');
          const defaultEnabledValue = enabledChar?.productSpecCharacteristicValue?.find(val => val.isDefault);

          if (!defaultEnabledValue) {
            this.disabledCharacteristics.push(characteristic.id);
          } else {
            const valueStr = String(defaultEnabledValue.value).toLowerCase();
            if (valueStr === 'false') {
              this.disabledCharacteristics.push(characteristic.id);
            }
          }
          // If the default value is true, start enabled
        }
      }
    });

    this.form.setControl('characteristics', characteristicsGroup);
    this.groupCharacteristics();
  }

  isBooleanCharacteristic(characteristic: ProductSpecificationCharacteristic): boolean {
    const values = characteristic.productSpecCharacteristicValue;
    if (!values || values.length === 0) {
      return false;
    }
    return values.every((val: any) => typeof val?.value === 'boolean');
  }

  isRangeCharacteristic(characteristic: ProductSpecificationCharacteristic): boolean {
    return characteristic.productSpecCharacteristicValue?.some(
      (val: any) => val?.valueFrom !== undefined && val?.valueTo !== undefined
    ) ?? false;
  }

  /** A "choice"-type characteristic (not boolean, not range) with exactly one
   * predefined value: there's nothing to pick between, so it shouldn't render
   * its own selectable card at all — its value is applied directly instead. */
  hasNoChoice(characteristic: ProductSpecificationCharacteristic): boolean {
    return !this.isBooleanCharacteristic(characteristic) &&
      !this.isRangeCharacteristic(characteristic) &&
      (characteristic.productSpecCharacteristicValue?.length ?? 0) === 1;
  }

  /** A 'range' characteristic with no predefined bounds — app-characteristic renders it
   * as free valueFrom/valueTo/unitOfMeasure inputs, so its control holds an object, not
   * a scalar. */
  isFreeRangeCharacteristic(characteristic: ProductSpecificationCharacteristic): boolean {
    return characteristic.valueType === 'range' && (characteristic.productSpecCharacteristicValue?.length ?? 0) === 0;
  }

  /** A 'number' characteristic with no predefined values — app-characteristic renders it
   * as free value/unitOfMeasure inputs, so its control holds an object, not a scalar. */
  isFreeNumberCharacteristic(characteristic: ProductSpecificationCharacteristic): boolean {
    return characteristic.valueType === 'number' && (characteristic.productSpecCharacteristicValue?.length ?? 0) === 0;
  }

  /** Validators.required treats any non-null object as "present", so a half-filled
   * {valueFrom, valueTo, unitOfMeasure} (or the initial all-null shape) would pass it —
   * this checks both bounds and the unit are actually set. */
  rangeValueValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value && typeof value === 'object') {
      return value.valueFrom != null && value.valueTo != null && !!value.unitOfMeasure ? null : { required: true };
    }
    return value == null ? { required: true } : null;
  };

  /** Same reasoning as rangeValueValidator, for the {value, unitOfMeasure} shape a free
   * number input commits. */
  numberValueValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value && typeof value === 'object') {
      return value.value != null && !!value.unitOfMeasure ? null : { required: true };
    }
    return value == null ? { required: true } : null;
  };

  private isEnabledCharacteristic(characteristic: ProductSpecificationCharacteristic): boolean {
    return characteristic.name?.endsWith('- enabled') ?? false;
  }

  private groupCharacteristics(): void {
    const profileNames = new Set(this.profileCharacteristics.map(c => c.name));
    const selectableCharacteristics = this.filteredCharacteristics.filter(
      (characteristic) =>
        !this.isEnabledCharacteristic(characteristic) &&
        characteristic.configurable !== false &&
        !profileNames.has(characteristic.name)
    );

    this.booleanCharacteristics = selectableCharacteristics.filter((characteristic) =>
      this.isBooleanCharacteristic(characteristic)
    );
    this.rangeCharacteristics = selectableCharacteristics.filter(
      (characteristic) =>
        !this.isBooleanCharacteristic(characteristic) &&
        this.isRangeCharacteristic(characteristic)
    );
    this.choiceCharacteristics = selectableCharacteristics.filter(
      (characteristic) =>
        !this.isBooleanCharacteristic(characteristic) &&
        !this.isRangeCharacteristic(characteristic) &&
        !this.hasNoChoice(characteristic)
    );
  }

  async onToggleChange(event: Event, charName: any): Promise<void> {
    const inputElement = event.target as HTMLInputElement;
    const isChecked = inputElement.checked;
    let char = this.filteredCharacteristics.find(char => char.name == charName+' - enabled')
    const characteristicsGroup = this.form.get('characteristics') as FormGroup;
    if(char && char.id)
    characteristicsGroup.get(char.id)?.setValue(isChecked)

    const cleanName = char?.name?.replace(/- enabled$/, '').trim();
    const disabledChar = this.filteredCharacteristics.find(
      item => item.name === cleanName
    );
    //const isSelected = event.selectedValue === true || event.selectedValue === 'true';
    if (disabledChar) {
      if (!isChecked) {
        // Add it if it's not already in the array
        if (!this.disabledCharacteristics.includes(disabledChar.id)) {
          this.disabledCharacteristics.push(disabledChar.id);
        }
      } else {
        // Remove it if it exists
        this.disabledCharacteristics = this.disabledCharacteristics.filter(
          id => id !== disabledChar.id
        );
      }
    }
    await this.refreshAppliedMetrics();
    await this.calculatePrice();
  }

  // Handle price plan selection
  async onPricePlanSelected(pricePlan: any) {
    this.metrics=[];
    console.log('precio')
    console.log(pricePlan)
    this.form.get('selectedPricePlan')?.setValue(pricePlan);

    // Set chars based on selected price plan
    this.isCustom = pricePlan.priceType === 'custom';
    const hadProfile = this.hasProfile;
    this.profileCharacteristics = pricePlan.prodSpecCharValueUse ?? [];
    this.hasProfile = this.profileCharacteristics.length > 0;

    const previousConstraints = this.constraintValueUses;
    this.constraintValueUses = await this.loadConstraintValueUses(pricePlan);
    const constraintsChanged = JSON.stringify(previousConstraints) !== JSON.stringify(this.constraintValueUses);

    // Only rebuild the characteristics form (and lose whatever the customer already
    // picked) when the profile or the plan's characteristic constraints actually
    // change — switching between two plans that are otherwise identical keeps using
    // the same base characteristics untouched.
    if (hadProfile || this.hasProfile || constraintsChanged) {
      this.applyCharacteristicsSource();
    }

    this.selectedPricePlan = pricePlan;
    await this.refreshAppliedMetrics();
    console.log(this.selectedPricePlan);
    await this.calculatePrice();
  }

  /** Resolves which characteristics/values the plan forbids — either set directly
   * on it (`forbiddenCharacteristic`), or via a linked "constraint"-type
   * ProductOfferingPrice referenced through `popRelationship`. */
  private async loadConstraintValueUses(pricePlan: any): Promise<CharacteristicConstraintValueUse[]> {
    const localForbiddenCharacteristics = Array.isArray(pricePlan?.forbiddenCharacteristic)
      ? pricePlan.forbiddenCharacteristic
      : [];
    if (localForbiddenCharacteristics.length > 0) {
      return localForbiddenCharacteristics;
    }

    const constraintRefs = (Array.isArray(pricePlan?.popRelationship) ? pricePlan.popRelationship : [])
      .filter((relationship: any) =>
        relationship?.id && String(relationship.relationshipType || '').toLowerCase() === 'constraint'
      );

    for (const constraintRef of constraintRefs) {
      const constraintPrice = await this.priceService.getProductPrice(constraintRef.id);
      if (String(constraintPrice?.priceType || '').toLowerCase() !== 'constraint') continue;
      const characteristicUses = Array.isArray(constraintPrice?.prodSpecCharValueUse)
        ? constraintPrice.prodSpecCharValueUse
        : [];
      return characteristicUses;
    }

    return [];
  }

  onUsageSpecChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedUsageSpecId = target.value;
    this.selectedUnitOfMeasure = null;
  }

  onMetricChange(event: Event, metric: any) {
    const input = event.target as HTMLInputElement;
    metric.value = input.valueAsNumber; // update the metric's value with the new input
    console.log('Metric changed:', metric.unitOfMeasure, 'Value:', metric.value);
    console.log(this.metrics)
    this.calculatePrice();
  }

  get usageSpecIds(): string[] {
    return Object.keys(this.groupedMetrics);
  }


  // Handle characteristic value changes
  async onValueChange(event: { characteristicId: string; selectedValue: any }): Promise<void> {
    const characteristicsGroup = this.form.get('characteristics') as FormGroup;
    characteristicsGroup.get(event.characteristicId)?.setValue(event.selectedValue);

    /*let char = this.filteredCharacteristics.find(item => item.id === event.characteristicId);
    if (char?.name?.endsWith('- enabled')) {
      const cleanName = char.name.replace(/- enabled$/, '').trim();
      const disabledChar = this.filteredCharacteristics.find(
        item => item.name === cleanName
      );
      const isSelected = event.selectedValue === true || event.selectedValue === 'true';
      if (disabledChar) {
        if (!isSelected) {
          // Add it if it's not already in the array
          if (!this.disabledCharacteristics.includes(disabledChar.id)) {
            this.disabledCharacteristics.push(disabledChar.id);
          }
        } else {
          // Remove it if it exists
          this.disabledCharacteristics = this.disabledCharacteristics.filter(
            id => id !== disabledChar.id
          );
          console.log(this.disabledCharacteristics)
        }
      }
    }
    console.log(char)*/
    await this.refreshAppliedMetrics();
    await this.calculatePrice();
  }

  private metricKey(metric: any): string {
    if (!metric?.usageSpecId || !metric?.unitOfMeasure) {
      return '';
    }
    return `${metric.usageSpecId}:${metric.unitOfMeasure}`;
  }

  private getSelectedCharacteristicsForMetrics(): { id: string; value: any }[] {
    const selectedCharacteristics = this.form.get('characteristics')?.value || {};
    const selectedCharacteristicValues: { id: string; value: any }[] = [];

    for (const characteristicId of this.getKeys(selectedCharacteristics)) {
      if (this.disabledCharacteristics.includes(characteristicId)) {
        continue;
      }
      selectedCharacteristicValues.push({
        id: characteristicId,
        value: selectedCharacteristics[characteristicId],
      });
    }

    return selectedCharacteristicValues;
  }

  private async refreshAppliedMetrics(): Promise<void> {
    if (!this.selectedPricePlan) {
      this.metrics = [];
      return;
    }

    const selectedCharacteristicValues = this.getSelectedCharacteristicsForMetrics();
    const previousMetricValues = new Map<string, number>();
    for (const metric of this.metrics) {
      const metricKey = this.metricKey(metric);
      if (metricKey) {
        previousMetricValues.set(metricKey, metric.value ?? 0);
      }
    }

    try {
      const appliedMetrics = await this.pricePlanMetricsService.getAppliedMetrics(
        this.selectedPricePlan,
        selectedCharacteristicValues
      );
      this.metrics = (Array.isArray(appliedMetrics) ? appliedMetrics : []).map((metric: any) => {
        const metricKey = this.metricKey(metric);
        if (!metricKey) {
          return metric;
        }
        return {
          ...metric,
          value: previousMetricValues.has(metricKey) ? previousMetricValues.get(metricKey) : (metric.value ?? 0),
        };
      });
    } catch (error) {
      console.error('Error refreshing applied metrics', error);
    }
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

  // Validate if the form is ready to submit
  isFormValid(): boolean {
    return this.form.valid;
  }

  get objectKeys() {
    return Object.keys;
  }
  hasKey(obj: any, key: string): boolean {
    return key in obj;
  }
  getKeys(obj: any): string[] {
    return Object.keys(obj);
  }
  getValues(obj: any): any[] {
    return Object.values(obj);
  }

  formatPrice(value: string | number): string {
    const str = (typeof value === 'number' ? value.toString() : (value ?? '').toString()).trim();
    const num = parseFloat(str);
    if (isNaN(num)) {
      return String(value ?? '');
    }
    const rounded = Math.round(Number(str + 'e2')) / 100;
    return rounded.toFixed(2);
  }

  updateOrderChars() {
    const selectedCharacteristics = this.form.get('characteristics')?.value;

    console.log('chars....')
    console.log(selectedCharacteristics)
    console.log('general chars...')
    console.log(this.filteredCharacteristics)
    console.log('keys of selected chars...')
    console.log(this.getKeys(selectedCharacteristics))

    this.orderChars = [];
    for(let i=0; i<this.getKeys(selectedCharacteristics).length;i++){
      let idx = this.filteredCharacteristics.findIndex(item => item.id === this.getKeys(selectedCharacteristics)[i]);
      console.log(this.filteredCharacteristics[idx])
      if(!this.disabledCharacteristics.includes(this.filteredCharacteristics[idx].id)){
        let value = this.getValues(selectedCharacteristics)[i]
        const characteristic = this.filteredCharacteristics[idx];

        // A customer-defined range/number free input commits as {valueFrom, valueTo,
        // unitOfMeasure} or {value, unitOfMeasure} instead of a scalar — unwrap that
        // before the boolean/number inference below, which assumes a scalar value.
        let valueFrom: number | undefined;
        let valueTo: number | undefined;
        let unitOfMeasure: string | undefined;
        if (value && typeof value === 'object') {
          if ('valueFrom' in value) {
            valueFrom = value.valueFrom;
            valueTo = value.valueTo;
            unitOfMeasure = value.unitOfMeasure;
            value = undefined;
          } else if ('value' in value) {
            unitOfMeasure = value.unitOfMeasure;
            value = value.value;
          }
        }

        const hasBooleanValues = characteristic.productSpecCharacteristicValue?.some(
          (charValue: any) => typeof charValue?.value === 'boolean'
        ) ?? false;

        // Defensive conversion for boolean selects serialized as "true"/"false".
        if (hasBooleanValues && typeof value === 'string') {
          const normalized = value.toLowerCase();
          if (normalized === 'true' || normalized === 'false') {
            value = normalized === 'true';
          }
        }

        let valueType = characteristic.valueType

        if (!valueType && typeof value === 'boolean') {
          valueType = 'boolean'
        } else if (!valueType && !isNaN(Number(value))) {
          valueType = 'number'
        } else if (!valueType) {
          valueType = 'string'
        }

        if(value==null && valueType=='number'){
          value=0
        }

        if(!characteristic.name?.endsWith('- enabled')){
          this.orderChars.push({
            "name": characteristic.name,
            "value": value,
            "valueType": valueType,
            ...(valueFrom !== undefined ? { "valueFrom": valueFrom, "valueTo": valueTo } : {}),
            ...(unitOfMeasure ? { "unitOfMeasure": unitOfMeasure } : {}),
          })
        }

      }
    }
    console.log('Calculating the price with...')
    console.log(this.orderChars)
  }

  // Método para calcular el precio usando el servicio
  async calculatePrice(checkout: Boolean = false): Promise<void> {
    this.updateOrderChars();

    if (this.isFree) {
      this.price = [];
      this.isLoading = false;
    }

    if (this.isCustom || this.isFree) {
      return
    }

    const selectedPricePlan = this.form.get('selectedPricePlan')?.value;
    //PROD is an OrderItem
    let prod : any = {
      "id": this.productOff?.id,
      "action": this.mode === 'modify' ? "modify" : "add",
      "quantity": "1",
      "productOffering": {
        "id": this.productOff?.id,
        "href": this.productOff?.id
      },
      "itemTotalPrice": [{
        "productOfferingPrice": {
          "id": selectedPricePlan.id,
          "href": selectedPricePlan.href,
          "name": selectedPricePlan.name
        }
      }],
      "product": {
        "productCharacteristic": this.orderChars
      }
    }

    if (this.mode === 'modify' && this.inventoryProductId) {
      prod.product.id = this.inventoryProductId;
    }

    let usage: any = [];
    if(this.metrics.length > 0){
      usage = this.metrics.map(metric => ({
        usageSpecification: {
          id: metric.usageSpecId
        },
        usageCharacteristic: [{
          name: metric.unitOfMeasure,
          value: checkout? 1 : metric.value
        }]
      }));
    }

    let orderItems = [];
    orderItems.push(prod);

    let prodOrder = {
      "id": uuidv4(),
      "productOrderItem": orderItems
    }

    const previewReq = {
      productOrder: prodOrder,
      usage: usage
    }
    if (!selectedPricePlan) return;

    console.log('--- prod ---')
    console.log(prod)
    console.log('--- prod ---')

    this.isLoading = true;

    try {
      const response = await lastValueFrom(this.priceService.calculatePrice(previewReq));
      console.log('calculate price...')
      console.log(response.orderTotalPrice)
      this.price = response.orderTotalPrice; // Updates the price
      this.price = this.price.map((item) => ({
        ...item,
        id: this.selectedPricePlan.id, //Adds price plan id to the price info
      }));
      this.isLoading = false; // Hides spinner
      return
    } catch (error) {
      this.isLoading = false; // Manejo de errores
      console.error('Error al calcular el precio');
      return
    }
  }

  getProductImage() {
    return this.images.length > 0 ? this.images?.at(0)?.url : 'https://placehold.co/600x400/svg';
  }

  async createOrder() {
    if (this.form.invalid) {
      console.error('Form is invalid');
      return;
    }

    const formValues = this.form.value;

    // Construir el payload del pedido
    const orderPayload = {
      productId: this.productOff?.id,
      pricePlan: formValues.selectedPricePlan,
      characteristics: this.orderChars,
      tsAccepted: formValues.tsAccepted,
      priceSummary: this.price,
    };

    try {
      await this.calculatePrice(true);
    } catch (error) {
      console.error('Error calculating price:', error);
      return;
    }

    if (this.mode === 'modify') {
      const selectedPricePlan = formValues.selectedPricePlan;
      const orderItem: any = {
        id: this.productOff?.id,
        action: 'modify',
        quantity: '1',
        productOffering: {
          id: this.productOff?.id,
          href: this.productOff?.id
        },
        itemTotalPrice: [{
          productOfferingPrice: {
            id: selectedPricePlan.id,
            href: selectedPricePlan.href,
            name: selectedPricePlan.name
          }
        }],
        product: {
          id: this.inventoryProductId,
          productCharacteristic: this.orderChars
        }
      };
      this.modifySubmit.emit(orderItem);
      this.onClose();
      return;
    }

    // Construir las opciones del producto
    const prodOptions = this.buildProdOptions(formValues.tsAccepted);

    if (this.isCustom){
      prodOptions.options.pricing = [{
        id: orderPayload.pricePlan.id
      }]
    }
    try {
      // Añadir producto al carrito
      await this.cartService.addItemShoppingCart(prodOptions);
      console.log('Update successful');

      // Emitir eventos
      this.eventMessage.emitAddedCartItem(prodOptions as cartProduct);

      console.log('Order Payload:', orderPayload);
    } catch (error) {
      console.error('There was an error while updating the cart:', error);
    }

    // Cerrar el drawer
    this.onClose();
  }

  private buildProdOptions(termsAccepted: boolean) {
    return {
      id: this.productOff?.id,
      name: this.productOff?.name,
      image: this.getProductImage(),
      href: this.productOff?.href,
      options: {
        characteristics: this.orderChars,
        pricing: this.price,
      },
      termsAccepted,
    };
  }

}
