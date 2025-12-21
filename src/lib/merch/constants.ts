/**
 * Shared constants for merch/checkout functionality
 */

/**
 * EU country codes for shipping zone determination
 */
export const EU_COUNTRY_CODES = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
] as const;

export type EuCountryCode = (typeof EU_COUNTRY_CODES)[number];

/**
 * UK and EU countries with display names for UI dropdowns
 */
export const UK_EU_COUNTRIES = [
  { code: "GB", name: "United Kingdom" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
] as const;

/**
 * Shipping thresholds for free shipping (in pence/cents)
 */
export const FREE_SHIPPING_THRESHOLD_UK = 5500; // £55.00
export const FREE_SHIPPING_THRESHOLD_EU = 6500; // €65.00

/**
 * Shipping costs (in pence/cents)
 */
export const SHIPPING_COST_UK = 499; // £4.99
export const SHIPPING_COST_EU = 999; // €9.99

/**
 * Maximum allowed quantity per cart item
 */
export const MAX_CART_ITEM_QUANTITY = 100;
