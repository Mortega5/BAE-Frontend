import { NgOptimizedImage } from '@angular/common';
import { TruncateValuePipe } from 'src/app/shared/pipes/truncate-value.pipe';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { BrowserModule } from '@angular/platform-browser';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { FaIconComponent, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from "@ngx-translate/http-loader";
import { NgxFileDropModule } from 'ngx-file-drop';
import { MarkdownModule } from 'ngx-markdown';
import { MatomoInitializationMode, MatomoInitializerService, MatomoModule, MatomoRouterModule } from 'ngx-matomo-client';
import { CartCardComponent } from 'src/app/shared/cart-card/cart-card.component';
import { ErrorMessageComponent } from 'src/app/shared/error-message/error-message.component';
import { appConfigFactory } from './app-config-factory';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ChatbotWidgetComponent } from './chatbot-widget/chatbot-widget.component';
import { RequestInterceptor } from './interceptors/requests-interceptor';
import { ContactUsComponent } from './offerings/contact-us/contact-us.component';
import { ExploreDomeComponent } from "./offerings/explore-dome/explore-dome.component";
import { FaqComponent } from './offerings/faq/faq.component';
import { GalleryComponent } from "./offerings/gallery/gallery.component";
import { HowItWorksComponent } from "./offerings/how-it-works/how-it-works.component";
import { PlatformBenefitsComponent } from "./offerings/platform-benefits/platform-benefits.component";
import { AdminComponent } from './pages/admin/admin.component';
import { AnalyticsConfigComponent } from './pages/admin/analytics-config/analytics-config.component';
import { CategoriesComponent } from './pages/admin/categories/categories.component';
import { CreateCategoryComponent } from './pages/admin/categories/create-category/create-category.component';
import { UpdateCategoryComponent } from './pages/admin/categories/update-category/update-category.component';
import { EmailComponent } from './pages/admin/email/email.component';
import { FeaturesConfigComponent } from './pages/admin/features-config/features-config.component';
import { DefaultCatalogComponent } from './pages/admin/default-catalog/default-catalog.component';
import { SearchFiltersConfigComponent } from './pages/admin/search-filters-config/search-filters-config.component';
import { VerificationComponent } from './pages/admin/verification/verification.component';
import { CatalogsComponent } from "./pages/catalogs/catalogs.component";
import { BillingAddressComponent } from "./pages/checkout/billing-address/billing-address.component";
import { CheckoutComponent } from "./pages/checkout/checkout.component";
import { OrganizationDetailsComponent } from './pages/organization-details/organization-details.component';
import { ProductDetailsComponent } from "./pages/product-details/product-details.component";
import { InventoryProductsComponent } from './pages/product-inventory/inventory-items/inventory-products/inventory-products.component';
import { ProductInvDetailComponent } from './pages/product-inventory/inventory-items/product-inv-detail/product-inv-detail.component';
import { InventoryResourcesComponent } from './pages/product-inventory/inventory-resources/inventory-resources.component';
import { InventoryServicesComponent } from './pages/product-inventory/inventory-services/inventory-services.component';
import { ProductInventoryComponent } from "./pages/product-inventory/product-inventory.component";
import { SearchCatalogComponent } from "./pages/search-catalog/search-catalog.component";
import { SearchComponent } from "./pages/search/search.component";
import { CreateCatalogComponent } from './pages/seller-offerings/offerings/seller-catalogs/create-catalog/create-catalog.component';
import { SellerCatalogsComponent } from './pages/seller-offerings/offerings/seller-catalogs/seller-catalogs.component';
import { UpdateCatalogComponent } from './pages/seller-offerings/offerings/seller-catalogs/update-catalog/update-catalog.component';
import { CreateOfferComponent } from './pages/seller-offerings/offerings/seller-offer/create-offer/create-offer.component';
import { NewPricePlanComponent } from './pages/seller-offerings/offerings/seller-offer/new-price-plan/new-price-plan.component';
import { SellerOfferComponent } from './pages/seller-offerings/offerings/seller-offer/seller-offer.component';
import { UpdateOfferComponent } from './pages/seller-offerings/offerings/seller-offer/update-offer/update-offer.component';
import { UpdatePricePlanComponent } from './pages/seller-offerings/offerings/seller-offer/update-price-plan/update-price-plan.component';
import { BlueprintProductFormComponent } from './pages/seller-offerings/offerings/seller-product-spec/blueprint-product-form/blueprint-product-form.component';
import { CreateProductSpecComponent } from './pages/seller-offerings/offerings/seller-product-spec/create-product-spec/create-product-spec.component';
import { SellerProductSpecComponent } from './pages/seller-offerings/offerings/seller-product-spec/seller-product-spec.component';
import { UpdateProductSpecComponent } from './pages/seller-offerings/offerings/seller-product-spec/update-product-spec/update-product-spec.component';
import { ResourceSpecFormComponent } from './pages/seller-offerings/offerings/seller-resource-spec/resource-spec-form/resource-spec-form.component';
import { TableInputComponent } from './shared/forms/table-input/table-input.component';
import { PaginatedTableComponent } from './shared/forms/paginated-table/paginated-table.component';
import { FilterBarComponent } from './shared/forms/filter-bar/filter-bar.component';
import { FilteredPaginatedTableComponent } from './shared/forms/filtered-paginated-table/filtered-paginated-table.component';
import { SellerResourceSpecComponent } from './pages/seller-offerings/offerings/seller-resource-spec/seller-resource-spec.component';
import { SellerServiceSpecComponent } from './pages/seller-offerings/offerings/seller-service-spec/seller-service-spec.component';
import { ServiceSpecFormComponent } from './pages/seller-offerings/offerings/seller-service-spec/service-spec-form/service-spec-form.component';
import { SellerOfferingsComponent } from "./pages/seller-offerings/seller-offerings.component";
import { ShoppingCartComponent } from "./pages/shopping-cart/shopping-cart.component";
import { BillingInfoComponent } from './pages/user-profile/profile-sections/billing-info/billing-info.component';
import { OrderInfoComponent } from './pages/user-profile/profile-sections/order-info/order-info.component';
import { OrgInfoComponent } from './pages/user-profile/profile-sections/org-info/org-info.component';
import { UserInfoComponent } from './pages/user-profile/profile-sections/user-info/user-info.component';
import { UserProfileComponent } from "./pages/user-profile/user-profile.component";
import { AppInitService } from './services/app-init.service';
import { GoogleTagManagerService } from './services/google-tag-manager.service';
import { ThemeAwareTranslateLoader } from './services/theme-aware-translate.loader';
import { ThemeService } from './services/theme.service';
import { BadgeComponent } from "./shared/badge/badge.component";
import { BillingAccountFormComponent } from "./shared/billing-account-form/billing-account-form.component";
import { CardComponent } from "./shared/card/card.component";
import { CategoriesFilterComponent } from "./shared/categories-filter/categories-filter.component";
import { CategoriesPanelComponent } from "./shared/categories-panel/categories-panel.component";
import { CategoriesRecursionListComponent } from './shared/categories-recursion-list/categories-recursion-list.component';
import { CategoriesRecursionComponent } from "./shared/categories-recursion/categories-recursion.component";
import { CategoryItemComponent } from "./shared/category-item/category-item.component";
import { CharacteristicComponent } from "./shared/characteristic/characteristic.component";
import { CustomOfferComponent } from "./shared/forms/offer/custom-offer/custom-offer.component";
import { OfferComponent } from "./shared/forms/offer/offer.component";
import { LoadingSpinnerComponent } from './shared/loading-spinner/loading-spinner.component';
import { NotFoundStateComponent } from './shared/not-found-state/not-found-state.component';
import { NotificationComponent } from './shared/notification/notification.component';
import { PricePlanDrawerComponent } from "./shared/price-plan-drawer/price-plan-drawer.component";
import { RevenueReportComponent } from './shared/revenue-report/revenue-report.component';
import { SharedModule } from "./shared/shared.module";

// Función Factory requerida para crear el cargador con sus dependencias
export function createThemeAwareLoader(http: HttpClient, themeService: ThemeService) {
  return new ThemeAwareTranslateLoader(http, themeService);
}

import { QuotesModule } from "src/app/features/quotes/quotes.module";
import { AboutDomeComponent } from "src/app/pages/about-dome/about-dome.component";
import { OperatorRevenueSharingComponent } from "src/app/pages/admin/operator-revenue-sharing/operator-revenue-sharing.component";
import { ProviderRevenueSharingComponent } from "src/app/pages/user-profile/profile-sections/provider-revenue-sharing/provider-revenue-sharing.component";
import { DynamicFormComponent } from "src/app/shared/forms/dynamic-form/dynamic-form.component";
import { MarkdownTextareaComponent } from "src/app/shared/forms/markdown-textarea/markdown-textarea.component";
import { RequestValidationModalComponent } from './pages/seller-offerings/offerings/seller-product-spec/update-product-spec/request-validation-modal/request-validation-modal.component';
import { CreateSoftwareComponent } from './pages/seller-offerings/offerings/seller-software/create-software/create-software.component';
import { SellerSoftware } from './pages/seller-offerings/offerings/seller-software/seller-software';
import { SoftwareCharacteristicsComponent } from './pages/seller-offerings/offerings/seller-software/software-characteristics/software-characteristics.component';
import { SpecificationCharacteristicFormComponent } from './shared/forms/specification-characteristic/specification-characteristic-form.component';
import { UpdateSoftwareComponent } from './pages/seller-offerings/offerings/seller-software/update-software/update-software.component';
import { StatusFieldComponent } from './shared/status-field/status-field.component';
import { StepperStepDirective } from './shared/stepper/stepper-step.directive';
import { StepperComponent } from './shared/stepper/stepper.component';

@NgModule({
  declarations: [
    AppComponent,
    SearchComponent,
    GalleryComponent,
    PlatformBenefitsComponent,
    HowItWorksComponent,
    ExploreDomeComponent,
    CategoriesFilterComponent,
    CategoryItemComponent,
    CardComponent,
    BadgeComponent,
    //CartDrawerComponent,
    BillingAddressComponent,
    CheckoutComponent,
    ProductDetailsComponent,
    SearchCatalogComponent,
    CatalogsComponent,
    ShoppingCartComponent,
    ProductInventoryComponent,
    BillingAccountFormComponent,
    UserProfileComponent,
    OrgInfoComponent,
    SellerOfferingsComponent,
    InventoryProductsComponent,
    UserInfoComponent,
    BillingInfoComponent,
    OrderInfoComponent,
    SellerCatalogsComponent,
    SellerProductSpecComponent,
    SellerServiceSpecComponent,
    SellerResourceSpecComponent,
    SellerOfferComponent,
    BlueprintProductFormComponent,
    CreateProductSpecComponent,
    ServiceSpecFormComponent,
    ResourceSpecFormComponent,
    CreateOfferComponent,
    CategoriesRecursionComponent,
    UpdateProductSpecComponent,
    UpdateOfferComponent,
    CreateCatalogComponent,
    UpdateCatalogComponent,
    ErrorMessageComponent,
    CartCardComponent,
    AdminComponent,
    AnalyticsConfigComponent,
    CategoriesComponent,
    CreateCategoryComponent,
    UpdateCategoryComponent,
    CategoriesRecursionListComponent,
    ContactUsComponent,
    VerificationComponent,
    EmailComponent,
    FeaturesConfigComponent,
    SearchFiltersConfigComponent,
    DefaultCatalogComponent,
    InventoryResourcesComponent,
    InventoryServicesComponent,
    ProductInvDetailComponent,
    OrganizationDetailsComponent,
    FaqComponent,
    NewPricePlanComponent,
    UpdatePricePlanComponent,
    RequestValidationModalComponent,
    SellerSoftware,
    CreateSoftwareComponent,
    UpdateSoftwareComponent
  ],
  imports: [
    TruncateValuePipe,
    BrowserModule,
    FontAwesomeModule,
    SharedModule,
    AppRoutingModule,
    NgOptimizedImage,
    FaIconComponent,
    FormsModule,
    ReactiveFormsModule,
    TableInputComponent,
    PaginatedTableComponent,
    FilterBarComponent,
    FilteredPaginatedTableComponent,
    PickerComponent,
    NgxFileDropModule,
    ChatbotWidgetComponent,
    NotificationComponent,
    QuotesModule,
    MarkdownModule.forRoot(),
    TranslateModule.forRoot({
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: (createThemeAwareLoader),
        deps: [HttpClient, ThemeService]
      }
    }),
    CategoriesPanelComponent,
    MatomoModule.forRoot({
      mode: MatomoInitializationMode.AUTO_DEFERRED
    }),
    MatomoRouterModule,
    CharacteristicComponent,
    PricePlanDrawerComponent,
    RevenueReportComponent,
    OfferComponent,
    CustomOfferComponent,
    AboutDomeComponent,
    MarkdownTextareaComponent,
    DynamicFormComponent,
    ProviderRevenueSharingComponent,
    OperatorRevenueSharingComponent,
    SoftwareCharacteristicsComponent,
    SpecificationCharacteristicFormComponent,
    StepperComponent,
    StepperStepDirective,
    StatusFieldComponent,
    LoadingSpinnerComponent,
    NotFoundStateComponent,
  ],
  providers: [
    AppInitService,
    {
      provide: APP_INITIALIZER,
      useFactory: appConfigFactory,
      deps: [AppInitService, MatomoInitializerService, GoogleTagManagerService],
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: RequestInterceptor,
      multi: true,
    }
  ],
  exports: [
    CategoriesRecursionComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/');
}
