export interface IDmaConfig {
  readonly isIndexAuctions: boolean;
  readonly isIndexCommodity: boolean;

  readonly isItemsIndex: boolean;
  readonly isItemsForceUpdate: boolean;
  readonly isItemsBuild: boolean;

  readonly isItemsPricingInit: boolean;
  readonly isItemsPricingBuild: boolean;
  readonly isItemsPricingLab: boolean;
}
