export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  state?: string;
  countryCode: string;
  phone?: string;
  email?: string;
}
