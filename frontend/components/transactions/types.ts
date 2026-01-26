export type TransactionType = "earned" | "redeemed" | "adjusted";
export type TransactionStatus = "completed" | "pending" | "failed";

export interface Transaction {
  id: string;
  userName: string;
  userSubtitle?: string; // outlet / note
  userInitials: string;
  type: TransactionType;
  status: TransactionStatus;
  points: number;
  valueDisplay: string;  // "฿150.00"
  outlet?: string | null;
  createdAtDisplay: string; // "21 Nov 2025, 14:21"
}
