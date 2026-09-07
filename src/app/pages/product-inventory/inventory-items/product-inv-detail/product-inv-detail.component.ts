import { Component, EventEmitter, Input, OnInit, Output, ElementRef, ViewChild,ChangeDetectorRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiServiceService } from 'src/app/services/product-service.service';
import {components} from "src/app/models/product-catalog";
import { initFlowbite } from 'flowbite';
import { PriceServiceService } from 'src/app/services/price-service.service';
import {faScaleBalanced, faArrowProgress, faArrowRightArrowLeft, faObjectExclude, faSwap, faGlobe, faBook, faShieldHalved, faAtom, faDownload} from "@fortawesome/pro-solid-svg-icons";
type Product = components["schemas"]["ProductOffering"];
type ProductSpecification = components["schemas"]["ProductSpecification"];
type AttachmentRefOrValue = components["schemas"]["AttachmentRefOrValue"];
//type CharacteristicValueSpecification = components["schemas"]["CharacteristicValueSpecification"];
import { certifications } from 'src/app/models/certification-standards.const'
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { LoginInfo, cartProduct,productSpecCharacteristicValueCart } from 'src/app/models/interfaces';
import { ProductInventoryServiceService } from 'src/app/services/product-inventory-service.service'
import {EventMessageService} from "src/app/services/event-message.service";
import { jwtDecode } from "jwt-decode";
import moment from 'moment';
import { environment } from 'src/environments/environment';
import { Location } from '@angular/common';
import { TableColumn } from 'src/app/models/table-column.model';

@Component({
  selector: 'app-product-inv-detail',
  templateUrl: './product-inv-detail.component.html',
  styleUrl: './product-inv-detail.component.css'
})
export class ProductInvDetailComponent implements OnInit {

  /** When provided (embedded inline, e.g. from InventoryProductsComponent), used instead
   * of the :id route param, and back() emits closeRequested instead of navigating back. */
  @Input() productId?: string;
  /** When provided, used directly as the inventory item instead of re-fetching it via
   * getProduct() — avoids hitting the same request the caller's own list already made
   * (and, right now, a backend authorization bug on GET-by-id). Takes precedence over
   * productId/the route param. */
  @Input() inv?: any;
  @Output() closeRequested = new EventEmitter<void>();

  id:any;
  partyId:any='';
  productOff: Product | undefined;
  check_logged:boolean=false;
  images: AttachmentRefOrValue[]  = [];
  attatchments: AttachmentRefOrValue[]  = [];
  serviceSpecs:any[] = [];
  resourceSpecs:any[]=[];
  prod:any = {};
  prodSpec:ProductSpecification = {};
  pricePlans: any[] = [];

  readonly specColumns: TableColumn[] = [
    { header: 'OFFERINGS._name', getValue: (spec: any) => spec.name, cellClass: (spec: any) => this.hasLongWord(spec.name, 20) ? 'break-all' : 'break-words' },
    { header: 'PRODUCT_DETAILS._description', hideOnMobile: true, getValue: (spec: any) => spec.description || '-' },
  ];

  readonly characteristicColumns: TableColumn[] = [
    { header: 'PRODUCT_INVENTORY._char_name', getValue: (char: any) => char.name },
    { header: 'PRODUCT_INVENTORY._char_value', getValue: (char: any) => this.getCharacteristicValue(char) },
  ];

  protected readonly faScaleBalanced = faScaleBalanced;
  protected readonly faArrowProgress = faArrowProgress;
  protected readonly faArrowRightArrowLeft = faArrowRightArrowLeft;
  protected readonly faObjectExclude = faObjectExclude;
  protected readonly faSwap = faSwap;
  protected readonly faGlobe = faGlobe;
  protected readonly faBook = faBook;
  protected readonly faShieldHalved = faShieldHalved;
  protected readonly faAtom = faAtom;
  protected readonly faDownload = faDownload;

  constructor(
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private api: ApiServiceService,
    private priceService: PriceServiceService,
    private router: Router,
    private elementRef: ElementRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private inventoryServ: ProductInventoryServiceService,
    private location: Location
  ) {
  }

  async ngOnInit() {
    initFlowbite();
    this.handleLoginState();

    if (!this.inv) {
      this.id = this.productId ?? this.route.snapshot.paramMap.get('id');
      if (!this.id) return;
    }

    try {
      if (this.inv) {
        this.prod = this.inv;
      } else {
        this.prod = await this.inventoryServ.getProduct(this.id, this.partyId);
      }

      const offering = await this.api.getProductById(this.prod.productOffering.id);
      this.prodSpec = await this.api.getProductSpecification(offering.productSpecification.id);

      this.pricePlans = await Promise.all(
        (this.prod.productPrice ?? []).map(async (productPrice: any) => {
          const plan = await this.loadPricePlan(productPrice.productOfferingPrice.id);
          return { ...plan, priceType: productPrice.priceType ?? plan.priceType };
        })
      );

      this.productOff = {
        id: offering.id,
        name: offering.name,
        category: offering.category,
        description: offering.description,
        lastUpdate: offering.lastUpdate,
        attachment: this.prodSpec?.attachment ?? [],
        productOfferingPrice: this.prod.productPrice,
        productSpecification: offering.productSpecification,
        productOfferingTerm: offering.productOfferingTerm,
        serviceLevelAgreement: offering.serviceLevelAgreement,
        version: offering.version
      };

      console.log(this.productOff)

      this.organizeAttachments();
      this.completeCharacteristics();

      // Fetch service & resource specs concurrently
      await this.fetchSpecifications();

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching product details:', error);
    }
  }

  private completeCharacteristics() {
    this.prod.productCharacteristic = this.prod?.productCharacteristic?.map((spec: any) => {
      this.prodSpec?.productSpecCharacteristic?.forEach((char: any) => {
        if (spec.name === char.name && char.productSpecCharacteristicValue &&
            char.productSpecCharacteristicValue.length > 0 && char.productSpecCharacteristicValue[0].unitOfMeasure) {
          spec.unitOfMeasure = char.productSpecCharacteristicValue[0].unitOfMeasure;
        }
      });
      return spec;
    })
  }

  private handleLoginState() {
    const aux = this.localStorage.getObject('login_items') as LoginInfo;
    const isValidSession = aux && Object.keys(aux).length > 0 && (aux.expire - moment().unix() - 4) > 0;

    this.check_logged = isValidSession;
    if (isValidSession) {
      if (aux.logged_as == aux.id) {
        this.partyId = aux.partyId;
      } else {
        const loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as);
        this.partyId = loggedOrg.partyId;
      }
    }
    this.cdr.detectChanges();
  }

  private organizeAttachments() {
    const profile = this.productOff?.attachment?.filter((item: any) => item.name === 'Profile Picture') ?? [];

    if (profile.length === 0) {
      this.images = this.productOff?.attachment?.filter((item: any) => item.attachmentType === 'Picture') ?? [];
      this.attatchments = this.productOff?.attachment?.filter((item: any) => item.attachmentType !== 'Picture') ?? [];
    } else {
      this.images = profile;
      this.attatchments = this.productOff?.attachment?.filter((item: any) => item.name !== 'Profile Picture') ?? [];
    }
  }

  private async fetchSpecifications() {
    const serviceSpecRequests = this.prodSpec?.serviceSpecification?.map((spec: any) =>
      this.api.getServiceSpec(spec.id)
    ) ?? [];
    const resourceSpecRequests = this.prodSpec?.resourceSpecification?.map((spec: any) =>
      this.api.getResourceSpec(spec.id)
    ) ?? [];

    const [serviceSpecs, resourceSpecs] = await Promise.all([
      Promise.all(serviceSpecRequests),
      Promise.all(resourceSpecRequests)
    ]);

    this.serviceSpecs = serviceSpecs;
    this.resourceSpecs = resourceSpecs;
  }

  private async loadPricePlan(priceId: string) {
    const pricePlan = await this.api.getOfferingPrice(priceId);
    return pricePlan;
  }

  back(){
    if (this.productId || this.inv) {
      this.closeRequested.emit();
    } else {
      this.location.back();
    }
  }

  getProductImage() {
    return this.images.length > 0 ? this.images?.at(0)?.url : 'https://placehold.co/600x400/svg';
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

  getCharacteristicValue(char: any): string {
    if (char.value != undefined) {
      return char.unitOfMeasure ? `${char.value} (${char.unitOfMeasure})` : `${char.value}`;
    }
    const range = `${char.valueFrom} - ${char.valueTo}`;
    return char.unitOfMeasure ? `${range} (${char.unitOfMeasure})` : range;
  }

  priceTypeBadgeClass(priceType: string | undefined): string {
    switch (priceType) {
      case 'recurring': return 'bg-green-100 text-green-600 border-green-400 dark:bg-secondary-200';
      case 'usage': return 'bg-yellow-100 text-yellow-600 border-yellow-400 dark:bg-secondary-200';
      case 'custom': return 'bg-purple-100 text-purple-600 border-purple-400 dark:bg-secondary-200';
      default: return 'bg-blue-100 text-blue-600 border-blue-400 dark:bg-secondary-200';
    }
  }

}
