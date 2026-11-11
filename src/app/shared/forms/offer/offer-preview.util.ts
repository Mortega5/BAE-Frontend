/** Flattens every price plan's components into top-level prices (no bundledPopRelationship
 * refs to resolve) so the offer details page used as preview can read them as-is,
 * including its usage-metrics lookup. */
export function previewPricesFromPlans(pricePlans: any[] | null | undefined): any[] {
  const prices: any[] = [];
  for (const plan of (pricePlans || [])) {
    for (const component of (plan.priceComponents || [])) {
      prices.push({
        id: component.id,
        href: component.id,
        name: component.name || plan.name,
        description: component.description || plan.description,
        priceType: component.priceType,
        price: component.price != null ? { value: component.price, unit: plan.currency || component.currency || 'EUR' } : undefined,
        recurringChargePeriodType: component.recurringPeriod,
        usageSpecId: component.usageSpecId,
        unitOfMeasure: component.usageUnit
      });
    }
  }
  return prices;
}
