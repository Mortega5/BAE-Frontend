import { Routes } from '@angular/router';
import { CustomOfferComponent } from 'src/app/shared/forms/offer/custom-offer/custom-offer.component';
import { CreateCatalogComponent } from './offerings/seller-catalogs/create-catalog/create-catalog.component';
import { SellerCatalogsComponent } from './offerings/seller-catalogs/seller-catalogs.component';
import { UpdateCatalogComponent } from './offerings/seller-catalogs/update-catalog/update-catalog.component';
import { CreateOfferComponent } from './offerings/seller-offer/create-offer/create-offer.component';
import { SellerOfferComponent } from './offerings/seller-offer/seller-offer.component';
import { UpdateOfferComponent } from './offerings/seller-offer/update-offer/update-offer.component';
import { CreateProductSpecComponent } from './offerings/seller-product-spec/create-product-spec/create-product-spec.component';
import { SellerProductSpecComponent } from './offerings/seller-product-spec/seller-product-spec.component';
import { UpdateProductSpecComponent } from './offerings/seller-product-spec/update-product-spec/update-product-spec.component';
import { ResourceSpecFormComponent } from './offerings/seller-resource-spec/resource-spec-form/resource-spec-form.component';
import { SellerResourceSpecComponent } from './offerings/seller-resource-spec/seller-resource-spec.component';
import { ServiceSpecFormComponent } from './offerings/seller-service-spec/service-spec-form/service-spec-form.component';
import { SellerServiceSpecComponent } from './offerings/seller-service-spec/seller-service-spec.component';
import { CreateSoftwareComponent } from './offerings/seller-software/create-software/create-software.component';
import { SellerSoftware } from './offerings/seller-software/seller-software';
import { UpdateSoftwareComponent } from './offerings/seller-software/update-software/update-software.component';
import { SellerOfferingsPaths } from './seller-offerings.paths';

const { segments } = SellerOfferingsPaths;

export const sellerOfferingsRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: segments.catalogues },
  {
    path: segments.catalogues,
    children: [
      { path: '', component: SellerCatalogsComponent },
      { path: segments.new, component: CreateCatalogComponent },
      { path: segments.id, component: UpdateCatalogComponent },
    ],
  },
  {
    path: segments.offers,
    children: [
      { path: '', component: SellerOfferComponent },
      { path: segments.new, component: CreateOfferComponent },
      { path: segments.custom, component: CustomOfferComponent },
      { path: segments.id, component: UpdateOfferComponent },
    ],
  },
  {
    path: segments.softwares,
    children: [
      { path: '', component: SellerSoftware },
      { path: segments.new, component: CreateSoftwareComponent },
      { path: segments.id, component: UpdateSoftwareComponent },
    ],
  },
  {
    path: segments.productSpecs,
    children: [
      { path: '', component: SellerProductSpecComponent },
      { path: segments.new, component: CreateProductSpecComponent },
      { path: segments.id, component: UpdateProductSpecComponent },
    ],
  },
  {
    path: segments.serviceSpecs,
    children: [
      { path: '', component: SellerServiceSpecComponent },
      { path: segments.new, component: ServiceSpecFormComponent, data: { mode: 'create' } },
      { path: segments.id, component: ServiceSpecFormComponent, data: { mode: 'update' } },
    ],
  },
  {
    path: segments.resourceSpecs,
    children: [
      { path: '', component: SellerResourceSpecComponent },
      { path: segments.new, component: ResourceSpecFormComponent, data: { mode: 'create' } },
      { path: segments.id, component: ResourceSpecFormComponent, data: { mode: 'update' } },
    ],
  },
];
