export type VoucherStatus = "active" | "inactive";

export interface Voucher {
  id: string;
  name: string;
  type: "freeItem" | "discount" | "promotion";
  category?: string | null;
  status: VoucherStatus;
  points: number;
  valueDisplay: string;
  redeemedCount: number;
  userCount: number;
  featured?: boolean;
}

export interface VoucherGroup {
  id: string;
  name: string;
  voucherCount: number;
  vouchers: Voucher[];
}
