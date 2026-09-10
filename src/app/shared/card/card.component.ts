import {
  Component,
  Input,
  OnInit,
  ChangeDetectorRef,
  HostListener,
  ElementRef, ViewChild, AfterViewInit, OnDestroy,
  OnChanges
} from '@angular/core';
import {components} from "../../models/product-catalog";
import { FastAverageColor } from 'fast-average-color';
import {faScaleBalanced, faArrowProgress, faArrowRightArrowLeft, faObjectExclude, faSwap, faGlobe, faBook, faShieldHalved, faAtom, faClose, faEllipsis} from "@fortawesome/pro-solid-svg-icons";
type Product = components["schemas"]["ProductOffering"];
type ProductSpecification = components["schemas"]["ProductSpecification"];
type AttachmentRefOrValue = components["schemas"]["AttachmentRefOrValue"];
import {LocalStorageService} from "../../services/local-storage.service";
import {EventMessageService} from "../../services/event-message.service";
import { ApiServiceService } from 'src/app/services/product-service.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { Modal } from 'flowbite';
import { Router } from '@angular/router';
import { PriceServiceService } from 'src/app/services/price-service.service';
import { initFlowbite } from 'flowbite';
import { cartProduct,productSpecCharacteristicValueCart } from '../../models/interfaces';
import { ShoppingCartServiceService } from 'src/app/services/shopping-cart-service.service';
import { certifications } from 'src/app/models/certification-standards.const';
import { jwtDecode } from "jwt-decode";
import { environment } from 'src/environments/environment';
import {ThemeConfig} from "../../themes";
import {Subscription} from "rxjs";
import {ThemeService} from "../../services/theme.service";
import { NotificationService } from '../../services/notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { getShortOfferDescription, getVisibleOfferDescription } from './offer-card-text.util';

@Component({
  selector: 'bae-off-card',
  templateUrl: './card.component.html',
  styleUrl: './card.component.css'
})
export class CardComponent implements OnInit, OnDestroy, AfterViewInit {

  @Input() productOff: Product | undefined;
  @Input() prodSpecInput: ProductSpecification | undefined;
  @Input() cardId: number;
  @Input() viewMode: 'grid' | 'list' = 'grid';

  providerThemeName = environment.providerThemeName;
  quotesEnabled = environment.QUOTES_ENABLED;
  category: string = 'none';
  categories: any[] | undefined  = [];
  categoriesMore: any[] | undefined  = [];
  price: any = {price:0,priceType:'X'};
  images: AttachmentRefOrValue[]  = [];
  bgColor: string = '';
  detailsModalVisibility: boolean = false;
  targetModal: any;
  modal: Modal;
  prodSpec:ProductSpecification = {};
  complianceProf:any[] = certifications;
  complianceLevel:string = 'NL';
  showModal:boolean=false;
  cartSelection:boolean=false;
  check_prices:boolean=false;
  selected_price:any;
  check_char:boolean=false;
  check_terms:boolean=false;
  selected_terms:boolean=false;
  selected_chars:productSpecCharacteristicValueCart[]=[];
  formattedPrices:any[]=[];
  @ViewChild('myProdImage') myProdImage!: ElementRef<HTMLImageElement>;
  @ViewChild('descWrapper') descWrapper?: ElementRef<HTMLElement>;
  @ViewChild('descWrapperList') descWrapperList?: ElementRef<HTMLElement>;
  descLineClamp = 2;
  descLineClampList = 2;
  private descResizeObserver?: ResizeObserver;
  check_logged:boolean=false;
  protected readonly faAtom = faAtom;
  protected readonly faClose = faClose;
  protected readonly faEllipsis = faEllipsis;
  PURCHASE_ENABLED: boolean = environment.PURCHASE_ENABLED;
  checkMoreCats:boolean=false;
  closeCats:boolean=false;
  loadMoreCats:boolean=false;

  orgInfo:any=undefined;

  selectedPricePlanId: string | null = null;
  selectedPricePlan:any = null;

  currentTheme: ThemeConfig | null = null;
  private themeSubscription: Subscription = new Subscription();
  private destroy$ = new Subject<void>();


  productAlreadyInCart:boolean=false;
  showQuoteModal:boolean=false;
  customerId:string='';
  isCustomPrice:boolean = false;
  cheapestPrice: any = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private api: ApiServiceService,
    private priceService: PriceServiceService,
    private cartService: ShoppingCartServiceService,
    private accService: AccountServiceService,
    private themeService: ThemeService,
    private router: Router,
    private notificationService: NotificationService
    ) {
      this.targetModal = document.getElementById('details-modal');
      this.modal = new Modal(this.targetModal);

      this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if(ev.type === 'CloseCartCard') {
          // Note: the success/error toast for this flow is fired by cart-card's own
          // addProductToCart(), which is what emits this event - don't double-toast here.
          this.hideCartSelection();
          this.cdr.detectChanges();
        }
        if(ev.type === 'CloseQuoteRequest'){
          this.showQuoteModal=false;
          this.cdr.detectChanges();
        } else if (ev.type == 'RemovedCartItem'){
          this.cartService.getShoppingCart().then(data => {
            const exists = data.some((item: any) => item.id === this.productOff?.id);
            if (exists) {
              this.productAlreadyInCart=true;
            } else {
              this.productAlreadyInCart=false;
            }
          })
        } else if (ev.type == 'AddedCartItem'){
          this.cartService.getShoppingCart().then(data => {
            const exists = data.some((item: any) => item.id === this.productOff?.id);
            if (exists) {
              this.productAlreadyInCart=true;
            } else {
              this.productAlreadyInCart=false;
            }
          })
        }
        if(ev.type === 'CloseQuoteRequest'){
          this.showQuoteModal=false;
          this.cdr.detectChanges();
        } else if (ev.type == 'RemovedCartItem'){
          this.cartService.getShoppingCart().then(data => {
            const exists = data.some((item: any) => item.id === this.productOff?.id);
            if (exists) {
              this.productAlreadyInCart=true;
            } else {
              this.productAlreadyInCart=false;
            }
          })
        } else if (ev.type == 'AddedCartItem'){
          this.cartService.getShoppingCart().then(data => {
            const exists = data.some((item: any) => item.id === this.productOff?.id);
            if (exists) {
              this.productAlreadyInCart=true;
            } else {
              this.productAlreadyInCart=false;
            }
          })
        }
      })
    }

  @HostListener('document:click')
  onClick() {
    if(this.showModal==true){
      this.showModal=false;
      if(this.productOff?.category)
      if(this.productOff?.category.length>5){
        this.loadMoreCats=false;
        this.checkMoreCats=true;
        this.closeCats=false;
      }
      this.cdr.detectChanges();
    }
    if(this.showQuoteModal=true){
      this.showQuoteModal=false;
    }
    if(this.cartSelection==true){
      this.cartSelection=false;
      this.check_char=false;
      this.check_terms=false;
      this.check_prices=false;
      this.selected_chars=[];
      this.selected_price={};
      this.selected_terms=false;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
    this.descResizeObserver?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupDescriptionClamp(): void {
    if (typeof ResizeObserver === 'undefined') return;
    const target = this.descWrapper?.nativeElement ?? this.descWrapperList?.nativeElement;
    if (!target) return;
    const lineHeightPx = 24;
    this.descResizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const h = entry.contentRect.height;
        const lines = Math.max(1, Math.floor(h / lineHeightPx));
        if (this.viewMode === 'grid' && lines !== this.descLineClamp) {
          this.descLineClamp = lines;
          this.cdr.detectChanges();
        } else if (this.viewMode === 'list' && lines !== this.descLineClampList) {
          this.descLineClampList = lines;
          this.cdr.detectChanges();
        }
      }
    });
    this.descResizeObserver.observe(target);
  }

  async ngOnInit() {
    this.themeSubscription = this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
    });
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      this.check_logged=true;
      if(aux.logged_as==aux.id){
        this.customerId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.customerId = loggedOrg.partyId
      }
      this.cdr.detectChanges();
      let cart = await this.cartService.getShoppingCart();
      const exists = cart.some((item: any) => item.id === this.productOff?.id);
      this.productAlreadyInCart=exists;
      this.cdr.detectChanges();
    } else {
      this.check_logged=false,
      this.cdr.detectChanges();
    }

    this.category = this.productOff?.category?.at(0)?.name ?? 'none';
    if(this.productOff?.category!=undefined&&this.productOff?.category.length>5){
      this.categories = this.productOff?.category.slice(0, 4);
      this.categoriesMore = this.productOff?.category.slice(4);
      this.checkMoreCats=true;
    } else {
      this.categories = this.productOff?.category;
      this.checkMoreCats=false;
    }

    let profile = this.productOff?.attachment?.filter(item => item.name === 'Profile Picture') ?? [];
    if(profile.length==0){
      this.images = this.productOff?.attachment?.filter(item => item.attachmentType === 'Picture') ?? [];
    } else {
      this.images = profile;
    }
    this.prodSpec = this.productOff?.productSpecification ?? {};
    this.getOwner();
    if(this.prodSpec.productSpecCharacteristic != undefined) {
      this.complianceLevel = this.api.getComplianceLevel(this.prodSpec);
    }

    this.isCustomPrice = await this.priceService.isCustomOffering(this.productOff)
    this.cheapestPrice = this.priceService.formatCheapestPricePlan(this.productOff);

    this.prepareOffData();

    this.cdr.detectChanges();
  }

  isCustom(): boolean {
    return this.isCustomPrice;
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

  getShortDescription(): string {
    return getShortOfferDescription(this.productOff?.description);
  }

  getVisibleDescription(): string {
    return getVisibleOfferDescription(this.productOff?.description);
  }
  

  loadMoreCategories(){
    this.loadMoreCats=!this.loadMoreCats;
    this.checkMoreCats=false;
    this.closeCats=true;
  }

  closeCategories(){
    this.closeCats=false;
    this.checkMoreCats=true;
    if(this.productOff?.category)
    this.categories = this.productOff?.category.slice(0, 4);
    this.loadMoreCats=!this.loadMoreCats;
  }

  ngAfterViewInit() {
    initFlowbite();
    this.setupDescriptionClamp();
    /*const fac = new FastAverageColor();
    fac.getColorAsync(this.myProdImage.nativeElement)
      .then(color => {
        this.bgColor = color.rgba;
      })
      .catch(e => {
        console.error(e);
      });*/
  }

  async addProductToCart(productOff: Product | undefined, options: boolean) {
    if (!productOff || !productOff.productOfferingPrice) return;

    const prodOptions = this.createProdOptions(productOff, options);

    try {
      // Añadir producto al carrito
      await this.cartService.addItemShoppingCart(prodOptions);
      console.log('Update successful');

      this.notificationService.showSuccess('CARD._added_card');

      // Emitir evento de producto añadido
      this.eventMessage.emitAddedCartItem(productOff as cartProduct);
    } catch (error: any) {
      console.error('There was an error while adding item to the cart!', error);
      const detail = error?.error?.error || error?.error?.message || error?.message;
      this.notificationService.showError('CARD._add_cart_error', detail ? { details: detail } : undefined);
    }

    // Restablecer selecciones si es necesario
    if (this.cartSelection) {
      this.resetSelections();
    }

    this.cdr.detectChanges();
  }

  private createProdOptions(productOff: Product, options: boolean) {
    return {
      id: productOff.id,
      name: productOff.name,
      image: this.getProductImage(),
      href: productOff.href,
      options: {
        characteristics: this.selected_chars,
        pricing: this.selected_price,
      },
      termsAccepted: options ? this.selected_terms : true,
    };
  }

  private resetSelections() {
    this.cartSelection = false;
    this.check_char = false;
    this.check_terms = false;
    this.check_prices = false;
    this.selected_chars = [];
    this.selected_price = {};
    this.selected_terms = false;
    this.cdr.detectChanges();
  }


async deleteProduct(product: Product | undefined){
    if(product !== undefined) {
      try {
        //this.localStorage.removeCartItem(product);
        await this.cartService.removeItemShoppingCart(product.id);
        console.log('removed');
        this.eventMessage.emitRemovedCartItem(product as Product);
        this.notificationService.showSuccess('SHOPPING_CART._remove_item_success');
      } catch (error: any) {
        console.error('There was an error while removing the item from the cart!', error);
        const detail = error?.error?.error || error?.error?.message || error?.message;
        this.notificationService.showError('SHOPPING_CART._remove_item_error', detail ? { details: detail } : undefined);
      }
    }
  }

  toggleDetailsModal(){
    this.showModal=true;
    this.cdr.detectChanges();
    /*initFlowbite();
    this.targetModal = document.getElementById('details-modal');
    this.modal = new Modal(this.targetModal);
    this.cdr.detectChanges();
    this.modal.toggle();
    this.cdr.detectChanges();
    initFlowbite();*/
  }

  toggleCartSelection(){
    console.log('Add to cart...')
    if (this.productOff?.productOfferingPrice != undefined){
      if(this.productOff?.productOfferingPrice.length > 1){
        this.check_prices=true;
        this.selected_price=this.productOff?.productOfferingPrice[this.productOff?.productOfferingPrice.length-1]
      } else {
        this.selected_price=this.productOff?.productOfferingPrice[0]
      }
    }

    if(this.productOff?.productOfferingTerm != undefined){
      const licenseTerm = this.productOff.productOfferingTerm.find(
        element => element.name === 'License'
      );

      if (!licenseTerm) {
        this.check_terms=false;
      } else {
        this.check_terms=true;
      }
    }
    //this.prepareOffData();

    if (this.check_prices==false && this.check_char == false && this.check_terms == false){
      this.addProductToCart(this.productOff,false);
    } else {
      this.cartSelection=true;
      this.cdr.detectChanges();
    }
  }

  prepareOffData() {
    if(this.prodSpec.productSpecCharacteristic != undefined){
      for(let i=0; i<this.prodSpec.productSpecCharacteristic.length; i++){
        let charvalue = this.prodSpec.productSpecCharacteristic[i].productSpecCharacteristicValue;
        if(charvalue != undefined){
          if(charvalue?.length>1){
            this.check_char = true;
          }
          for(let j=0; j<charvalue.length;j++){
            if(charvalue[j]?.isDefault == true){
              this.selected_chars.push(
                {
                  "characteristic": this.prodSpec.productSpecCharacteristic[i],
                  "value": charvalue[j]
                });
            }
          }
        }
      }
      console.log('Calculando characteristics...')
      console.log(this.selected_chars)
    }
  }

  hideCartSelection(){
    this.cartSelection=false;
    this.check_char=false;
    this.check_terms=false;
    this.check_prices=false;
    this.formattedPrices=[];
    this.selected_chars=[];
    this.selected_price={};
    this.selected_terms=false;
    this.cdr.detectChanges();
  }

  hideModal() {
    this.showModal=false;
    this.loadMoreCats=false;
    this.checkMoreCats=true;
    this.cdr.detectChanges();
    /*this.targetModal = document.getElementById('details-modal');
    this.modal = new Modal(this.targetModal);
    this.modal.hide();*/
  }

  goToProductDetails(productOff:Product| undefined) {
    document.querySelector("body > div[modal-backdrop]")?.remove()
    this.router.navigate(['/search', productOff?.id]);
  }

  goToOrgDetails(id:any) {
    document.querySelector("body > div[modal-backdrop]")?.remove()
    this.router.navigate(['/org-details', id]);
  }

  getOwner(){
    let parties = this.prodSpec?.relatedParty;
    if(parties)
    for(let i=0; i<parties.length;i++){
      if(parties[i].role == environment.SELLER_ROLE){
        if(parties[i].id.includes('organization')){
          this.accService.getOrgInfo(parties[i].id).then(org => {
            this.orgInfo=org;
            console.log('orginfo')
            console.log(this.orgInfo)
          })
        }
      }
    }
  }

  onPricePlanSelected(pricePlan:any) {
    console.log(pricePlan.id);
    this.selectedPricePlanId = pricePlan.id;
    this.selectedPricePlan = pricePlan;
  }

  onValueChange(event: { characteristicId: string; selectedValue: any }): void {
    //this.form.get(event.characteristicId)?.setValue(event.selectedValue);
    console.log('Selected Value:', event);
  }

  isDrawerOpen = false;
  openDrawer(): void {
    if(this.showModal) this.showModal = false;
    this.isDrawerOpen = true;
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
  }

  toggleQuoteModal(){
    //Hides details modal
    this.showModal=false;
    //Show quote modal
    this.showQuoteModal=true;
  }

  protected readonly JSON = JSON;
}
