"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Search, User, CheckCircle, AlertCircle, Hash, Mail, Phone, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import api from "@/lib/api";

interface CustomerInfo {
  id: number;
  name: string;
  surname: string | null;
  phone: string;
  email: string | null;
  points_balance: number;
  user_type: string;
  tier_level: string | null;
  member_id: string | null;
}

interface SearchResponse {
  customers: CustomerInfo[];
  search_term: string;
  count: number;
}

export default function StaffManualEntryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [searchMode, setSearchMode] = useState<"customer" | "voucher">("customer");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<CustomerInfo[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerInfo | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Debounced search
  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setCustomers([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await api.get<SearchResponse>(`/pos/search-customer?q=${encodeURIComponent(query)}`);
      setCustomers(response.data.customers);
      setShowResults(true);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Search failed");
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce effect
  useEffect(() => {
    if (searchMode !== "customer") return;

    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch(searchQuery.trim());
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch, searchMode]);

  const handleVoucherLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!voucherCode.trim()) {
      setError("Please enter a voucher code");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post<any>("/pos/scan-qr", { qr_data: voucherCode.trim() });

      if (response.data.type === "voucher_redeemed") {
        setError("Voucher has already been redeemed");
      } else if (response.data.type === "voucher_ready" && response.data.customer) {
        setSelectedCustomer(response.data.customer);
      } else {
        setError("Invalid voucher code");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Invalid voucher code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCustomer = (customer: CustomerInfo) => {
    setSelectedCustomer(customer);
    setShowResults(false);
    setSearchQuery("");
  };

  const handleContinue = () => {
    if (selectedCustomer) {
      router.push(`/staff/scan?customerId=${selectedCustomer.id}&customerName=${encodeURIComponent(selectedCustomer.name || "")}`);
    }
  };

  const getSearchTypeIcon = () => {
    const q = searchQuery.trim();
    if (!q) return <Search size={20} className="text-[var(--color-text-tertiary)]" />;
    if (/^\d+$/.test(q)) return <CreditCard size={20} className="text-blue-500" />;
    if (q.includes("@")) return <Mail size={20} className="text-purple-500" />;
    if (q.startsWith("+") || /^0?\d{9,10}$/.test(q)) return <Phone size={20} className="text-green-500" />;
    return <User size={20} className="text-amber-500" />;
  };

  const getSearchHint = () => {
    const q = searchQuery.trim();
    if (!q) return "Search by phone, email, ID, or name";
    if (/^\d+$/.test(q)) return "Searching by ID...";
    if (q.includes("@")) return "Searching by email...";
    if (q.startsWith("+") || /^0?\d{9,10}$/.test(q)) return "Searching by phone...";
    return "Searching by name...";
  };

  return (
    <div className="min-h-screen w-full lg:max-w-[800px] lg:mx-auto bg-[var(--color-background)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4 px-4 h-14">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-[var(--color-text-primary)]" />
          </button>
          <h1 className="text-[17px] font-semibold text-[var(--color-text-primary)]">
            Manual Entry
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 lg:p-6">
        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-6">
          <button
            onClick={() => { setSearchMode("customer"); setError(""); setSelectedCustomer(null); }}
            className={`flex-1 py-2.5 text-[14px] font-medium rounded-md transition-all ${
              searchMode === "customer"
                ? "bg-white text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-secondary)]"
            }`}
          >
            <Search size={16} className="inline mr-2" />
            Find Customer
          </button>
          <button
            onClick={() => { setSearchMode("voucher"); setError(""); setSelectedCustomer(null); }}
            className={`flex-1 py-2.5 text-[14px] font-medium rounded-md transition-all ${
              searchMode === "voucher"
                ? "bg-white text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-secondary)]"
            }`}
          >
            <Hash size={16} className="inline mr-2" />
            Voucher Code
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-[13px] text-red-600">{error}</p>
          </div>
        )}

        {/* Customer Search */}
        {searchMode === "customer" && !selectedCustomer && (
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-2">
                Search Customer
              </label>
              <div className="relative">
                <div className="flex items-center gap-3 h-14 px-4 bg-white border border-[var(--color-border)] rounded-xl">
                  {getSearchTypeIcon()}
                  <input
                    type="text"
                    placeholder="Phone, email, ID, or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none"
                    autoFocus
                  />
                  {isLoading && (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-[var(--color-brand)] rounded-full animate-spin" />
                  )}
                </div>
                <p className="text-[12px] text-[var(--color-text-tertiary)] mt-1 px-1">
                  {getSearchHint()}
                </p>

                {/* Search Results Dropdown */}
                {showResults && customers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[var(--color-border)] rounded-xl shadow-lg max-h-[300px] overflow-y-auto z-20">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-[var(--color-border)] last:border-b-0"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User size={18} className="text-gray-500" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
                            {customer.name} {customer.surname || ""}
                          </p>
                          <p className="text-[12px] text-[var(--color-text-secondary)]">
                            {customer.phone} {customer.email && `• ${customer.email}`}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-tertiary)]">
                            {customer.points_balance} pts • {customer.user_type} {customer.member_id && `• ${customer.member_id}`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {showResults && customers.length === 0 && searchQuery.length >= 2 && !isLoading && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[var(--color-border)] rounded-xl shadow-lg p-4 z-20">
                    <p className="text-[13px] text-[var(--color-text-secondary)] text-center">
                      No customers found for "{searchQuery}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Search Examples */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Phone size={14} className="text-green-500" />
                  <span className="text-[12px] font-medium text-[var(--color-text-primary)]">Phone</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">+66812345678 or 0812345678</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Mail size={14} className="text-purple-500" />
                  <span className="text-[12px] font-medium text-[var(--color-text-primary)]">Email</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">john@example.com</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard size={14} className="text-blue-500" />
                  <span className="text-[12px] font-medium text-[var(--color-text-primary)]">ID</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">Customer ID number</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <User size={14} className="text-amber-500" />
                  <span className="text-[12px] font-medium text-[var(--color-text-primary)]">Name</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">John or John Doe</p>
              </div>
            </div>
          </div>
        )}

        {/* Voucher Code Form */}
        {searchMode === "voucher" && !selectedCustomer && (
          <form onSubmit={handleVoucherLookup} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-2">
                Voucher Code or QR Data
              </label>
              <div className="flex items-center gap-3 h-14 px-4 bg-white border border-[var(--color-border)] rounded-xl">
                <Hash size={20} className="text-[var(--color-text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Enter voucher code..."
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  className="flex-1 bg-transparent text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none"
                />
              </div>
            </div>
            <Button type="submit" loading={isLoading} className="w-full h-12">
              <Search size={18} className="mr-2" />
              Validate Code
            </Button>
          </form>
        )}

        {/* Customer Selected */}
        {selectedCustomer && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={20} className="text-green-600" />
                <span className="text-[14px] font-medium text-green-800">Customer Found</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center border-2 border-green-200">
                  <User size={24} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                    {selectedCustomer.name} {selectedCustomer.surname || ""}
                  </p>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    {selectedCustomer.phone}
                  </p>
                  {selectedCustomer.email && (
                    <p className="text-[13px] text-[var(--color-text-secondary)]">
                      {selectedCustomer.email}
                    </p>
                  )}
                  <p className="text-[13px] text-[var(--color-text-secondary)]">
                    {selectedCustomer.points_balance} points • {selectedCustomer.user_type}
                    {selectedCustomer.tier_level && ` • ${selectedCustomer.tier_level}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => { setSelectedCustomer(null); setSearchQuery(""); setVoucherCode(""); }}
                className="flex-1 h-12"
              >
                Search Again
              </Button>
              <Button onClick={handleContinue} className="flex-1 h-12">
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Help Text */}
        {!selectedCustomer && (
          <div className="mt-8 p-4 bg-gray-50 rounded-xl">
            <h3 className="text-[14px] font-medium text-[var(--color-text-primary)] mb-2">
              When to use Manual Entry
            </h3>
            <ul className="text-[13px] text-[var(--color-text-secondary)] space-y-1">
              <li>• Customer&apos;s QR code won&apos;t scan</li>
              <li>• Customer doesn&apos;t have their phone</li>
              <li>• Need to look up customer by name or email</li>
              <li>• Voucher code needs to be entered manually</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
