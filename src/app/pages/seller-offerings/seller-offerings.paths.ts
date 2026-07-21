/**
 * Single source of truth for every seller-offerings ("my-offerings") route.
 * Both seller-offerrings.routes.ts (the Routes config) and every component that
 * navigates here import from this file instead of hardcoding path strings -
 * change `rootSegment` or any entry in `segments` and every consumer updates.
 */
const rootSegment = 'my-offerings';
const root = `/${rootSegment}`;

const segments = {
  catalogues: 'catalogues',
  offers: 'offers',
  softwares: 'softwares',
  productSpecs: 'productSpecs',
  serviceSpecs: 'serviceSpecs',
  resourceSpecs: 'resourceSpecs',
  new: 'new',
  custom: 'custom',
  id: ':id',
} as const;

function group(segment: string) {
  const base = `${root}/${segment}`;
  return {
    segment,
    list: () => base,
    new: () => `${base}/${segments.new}`,
    edit: (id: string) => `${base}/${id}`,
  };
}

export const SellerOfferingsPaths = {
  rootSegment,
  root: () => root,
  segments,
  catalogues: group(segments.catalogues),
  offers: {
    ...group(segments.offers),
    custom: () => `${root}/${segments.offers}/${segments.custom}`,
  },
  softwares: group(segments.softwares),
  productSpecs: group(segments.productSpecs),
  serviceSpecs: group(segments.serviceSpecs),
  resourceSpecs: group(segments.resourceSpecs),
} as const;
