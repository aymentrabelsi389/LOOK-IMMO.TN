/**
 * filterConstants.ts
 *
 * Single source of truth for all property-filter boundary values.
 * Every component that builds or resets filter state must import from here
 * instead of repeating raw numbers in JSX/logic.
 */

// ── Price boundaries ──────────────────────────────────────────────────────────

/** Default maximum price for standard listings (vente/location, non-land). */
export const DEFAULT_MAX_PRICE = 5_000_000;

/**
 * Extended maximum price used for:
 *  - Land / terrain listings (`propertyType === 'land'`)
 *  - Hot-deal / promotion bundles (`isHotDeal === true`)
 */
export const LAND_OR_HOTDEAL_MAX_PRICE = 15_000_000;

/** Default minimum price (no lower bound filter). */
export const DEFAULT_MIN_PRICE = 0;

// ── Bedroom boundaries ───────────────────────────────────────────────────────

/** Default minimum bedroom count (no bedroom filter applied). */
export const DEFAULT_MIN_BEDROOMS = 0;

/** Quick-select bedroom options rendered in the filter panel. */
export const BEDROOM_OPTIONS = [1, 2, 3, 4] as const;
export type BedroomOption = (typeof BEDROOM_OPTIONS)[number];

// ── Surface / area boundaries ────────────────────────────────────────────────

/** Default minimum surface area in m² (no area filter applied). */
export const DEFAULT_MIN_AREA = 0;

/** Area step increment / decrement used in the surface stepper widget. */
export const AREA_STEP = 100;

/**
 * Minimum area threshold for PromotionLandsSection to consider a land plot
 * a "development-ready" parcel worthy of display.
 */
export const PROMOTION_LAND_MIN_AREA = 1_000;

// ── Pagination ───────────────────────────────────────────────────────────────

/** Number of property cards displayed per page on the listings page. */
export const LISTINGS_PER_PAGE = 12;

// ── Price slider ─────────────────────────────────────────────────────────────

/** Slider step granularity (in TND). */
export const PRICE_SLIDER_STEP = 50_000;

// ── Debounce ─────────────────────────────────────────────────────────────────

/** Milliseconds to wait before committing a slider value to the server query. */
export const PRICE_DEBOUNCE_MS = 350;
