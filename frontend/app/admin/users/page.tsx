'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { usersAPI } from '@/lib/api';
import { Search, ChevronRight, Download, Tag, UserX, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

type SortField = 'name' | 'balance' | 'spent' | 'joined' | 'lastVisit';
type SortDirection = 'asc' | 'desc';
type UserType = 'all' | 'customer' | 'staff' | 'investor' | 'media';
type StatusFilter = 'all' | 'active' | 'inactive';
type DateRangeFilter = 'all' | 'last7days' | 'last30days' | 'last90days';

export default function AdminUsersPage() {
  const router = useRouter();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Filters
  const [typeFilter, setTypeFilter] = useState<UserType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [joinedDateFilter, setJoinedDateFilter] = useState<DateRangeFilter>('all');
  const [expirationDateFilter, setExpirationDateFilter] = useState<DateRangeFilter>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('joined');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // UI state
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showJoinedDropdown, setShowJoinedDropdown] = useState(false);
  const [showExpiresDropdown, setShowExpiresDropdown] = useState(false);
  const [allCompanies, setAllCompanies] = useState<string[]>([]);

  // Segment counts
  const [segmentCounts, setSegmentCounts] = useState({
    customer: 0,
    staff: 0,
    investor: 0,
    media: 0,
    total: 0
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter, companyFilter, joinedDateFilter, expirationDateFilter, sortField, sortDirection]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getAll({ limit: 10000 });
      const users = response.data.users;

      setAllUsers(users);

      // Extract unique companies
      const companies = Array.from(new Set(users.map((u: any) => u.company).filter(Boolean))).sort();
      setAllCompanies(companies as string[]);

      // Calculate segment counts
      setSegmentCounts({
        customer: users.filter((u: any) => !u.user_type || u.user_type === 'customer').length,
        staff: users.filter((u: any) => u.user_type === 'employee').length,
        investor: users.filter((u: any) => u.user_type === 'investor').length,
        media: users.filter((u: any) => u.user_type === 'media').length,
        total: users.length
      });
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Compute filtered and sorted users
  const filteredUsers = useMemo(() => {
    let filtered = [...allUsers];

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((u: any) => {
        const userType = u.user_type || 'customer';
        const mappedType = userType === 'employee' ? 'staff' : userType;
        return mappedType === typeFilter;
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((u: any) => {
        if (statusFilter === 'active') return u.is_active !== false;
        if (statusFilter === 'inactive') return u.is_active === false;
        return true;
      });
    }

    // Company filter
    if (companyFilter !== 'all') {
      filtered = filtered.filter((u: any) => u.company === companyFilter);
    }

    // Joined date filter
    if (joinedDateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter((u: any) => {
        if (!u.created_at) return false;
        const joinedDate = new Date(u.created_at);
        const daysDiff = (now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (joinedDateFilter === 'last7days') return daysDiff <= 7;
        if (joinedDateFilter === 'last30days') return daysDiff <= 30;
        if (joinedDateFilter === 'last90days') return daysDiff <= 90;
        return true;
      });
    }

    // Expiration date filter
    if (expirationDateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter((u: any) => {
        const expiryDate = u.investor_expiry_date || u.media_expiry_date;
        if (!expiryDate) return false;
        const expiry = new Date(expiryDate);
        const daysDiff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (expirationDateFilter === 'last7days') return daysDiff >= 0 && daysDiff <= 7;
        if (expirationDateFilter === 'last30days') return daysDiff >= 0 && daysDiff <= 30;
        if (expirationDateFilter === 'last90days') return daysDiff >= 0 && daysDiff <= 90;
        return true;
      });
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((u: any) => {
        return (
          u.name?.toLowerCase().includes(searchLower) ||
          u.surname?.toLowerCase().includes(searchLower) ||
          u.email?.toLowerCase().includes(searchLower) ||
          u.phone?.toLowerCase().includes(searchLower) ||
          u.company?.toLowerCase().includes(searchLower) ||
          u.id?.toString().includes(searchLower)
        );
      });
    }

    // Sorting
    filtered.sort((a: any, b: any) => {
      let aVal, bVal;

      switch (sortField) {
        case 'name':
          aVal = `${a.name} ${a.surname}`.toLowerCase();
          bVal = `${b.name} ${b.surname}`.toLowerCase();
          break;
        case 'balance':
          aVal = a.points_balance || 0;
          bVal = b.points_balance || 0;
          break;
        case 'spent':
          aVal = a.total_spend || 0;
          bVal = b.total_spend || 0;
          break;
        case 'joined':
          aVal = new Date(a.created_at || 0).getTime();
          bVal = new Date(b.created_at || 0).getTime();
          break;
        case 'lastVisit':
          aVal = new Date(a.last_visit || 0).getTime();
          bVal = new Date(b.last_visit || 0).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allUsers, search, typeFilter, statusFilter, companyFilter, joinedDateFilter, expirationDateFilter, sortField, sortDirection]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredUsers.slice(startIndex, startIndex + limit);
  }, [filteredUsers, page, limit]);

  const totalPages = Math.ceil(filteredUsers.length / limit);

  const toggleSelectUser = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === paginatedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(paginatedUsers.map(u => u.id));
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const exportUsers = () => {
    toast.success('Export feature coming soon');
  };

  const userTypeConfig = {
    customer: { label: 'Customer', count: segmentCounts.customer },
    staff: { label: 'Staff', count: segmentCounts.staff },
    investor: { label: 'Investor', count: segmentCounts.investor },
    media: { label: 'Media', count: segmentCounts.media },
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={14} className="opacity-0 group-hover:opacity-30" />;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  // Compact dropdown component
  const Dropdown = ({
    label,
    value,
    options,
    isOpen,
    onToggle,
    onChange,
    width = 'w-[140px]'
  }: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    isOpen: boolean;
    onToggle: () => void;
    onChange: (value: string) => void;
    width?: string;
  }) => {
    const selectedOption = options.find(opt => opt.value === value);

    return (
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-tight text-neutral-500 mb-1.5">{label}</label>
        <div className="relative">
          <button
            onClick={onToggle}
            className={`h-[40px] px-3 rounded-lg border border-neutral-300 bg-white text-[14px] text-neutral-900 hover:border-neutral-400 transition-all flex items-center justify-between gap-2 ${width}`}
          >
            <span className="truncate">{selectedOption?.label || 'Select...'}</span>
            <ChevronDown size={14} className="text-neutral-500 flex-shrink-0" />
          </button>

          {isOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={onToggle} />
              <div className="absolute left-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-20 min-w-full max-h-64 overflow-y-auto">
                {options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      onToggle();
                    }}
                    className={`w-full text-left px-3 py-2 text-[14px] transition-colors ${
                      value === option.value
                        ? 'bg-neutral-100 text-neutral-900 font-medium'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-[28px] font-semibold text-neutral-900">Users</h1>
            <p className="text-[14px] text-neutral-500 mt-1">{segmentCounts.total} total users</p>
          </div>

          {/* Filter Bar */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 mb-6 shadow-sm">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              {/* Left side: Search + Filters */}
              <div className="flex items-end gap-4 flex-1">
                {/* Search - No label */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    className="w-[320px] h-[40px] pl-10 pr-3 border border-neutral-300 rounded-lg text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <Dropdown
                  label="TYPE"
                  value={typeFilter}
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'customer', label: `Customers (${segmentCounts.customer})` },
                    { value: 'staff', label: `Staff (${segmentCounts.staff})` },
                    { value: 'investor', label: `Investors (${segmentCounts.investor})` },
                    { value: 'media', label: `Media (${segmentCounts.media})` },
                  ]}
                  isOpen={showTypeDropdown}
                  onToggle={() => setShowTypeDropdown(!showTypeDropdown)}
                  onChange={(val) => setTypeFilter(val as UserType)}
                  width="w-[140px]"
                />

                <Dropdown
                  label="STATUS"
                  value={statusFilter}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                  isOpen={showStatusDropdown}
                  onToggle={() => setShowStatusDropdown(!showStatusDropdown)}
                  onChange={(val) => setStatusFilter(val as StatusFilter)}
                  width="w-[120px]"
                />

                <Dropdown
                  label="COMPANY"
                  value={companyFilter}
                  options={[
                    { value: 'all', label: 'All Companies' },
                    ...allCompanies.map(company => ({ value: company, label: company }))
                  ]}
                  isOpen={showCompanyDropdown}
                  onToggle={() => setShowCompanyDropdown(!showCompanyDropdown)}
                  onChange={(val) => setCompanyFilter(val)}
                  width="w-[160px]"
                />

                <Dropdown
                  label="JOINED"
                  value={joinedDateFilter}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'last7days', label: 'Last 7 days' },
                    { value: 'last30days', label: 'Last 30 days' },
                    { value: 'last90days', label: 'Last 90 days' },
                  ]}
                  isOpen={showJoinedDropdown}
                  onToggle={() => setShowJoinedDropdown(!showJoinedDropdown)}
                  onChange={(val) => setJoinedDateFilter(val as DateRangeFilter)}
                  width="w-[130px]"
                />

                <Dropdown
                  label="EXPIRES IN"
                  value={expirationDateFilter}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'last7days', label: 'Next 7 days' },
                    { value: 'last30days', label: 'Next 30 days' },
                    { value: 'last90days', label: 'Next 90 days' },
                  ]}
                  isOpen={showExpiresDropdown}
                  onToggle={() => setShowExpiresDropdown(!showExpiresDropdown)}
                  onChange={(val) => setExpirationDateFilter(val as DateRangeFilter)}
                  width="w-[130px]"
                />
              </div>

              {/* Right side: Export */}
              <button
                onClick={exportUsers}
                className="h-[40px] px-4 rounded-lg border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 text-[14px] font-medium transition-all flex items-center gap-2"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
            {/* Bulk actions */}
            {selectedUsers.length > 0 && (
              <div className="bg-neutral-900 text-white px-6 py-4 border-b border-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="text-[14px] font-medium">
                    {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="h-[36px] px-3 rounded-lg bg-white/10 hover:bg-white/20 text-[14px] font-medium transition-all flex items-center gap-2">
                      <Tag size={16} />
                      Add Tags
                    </button>
                    <button className="h-[36px] px-3 rounded-lg bg-white/10 hover:bg-white/20 text-[14px] font-medium transition-all flex items-center gap-2">
                      <UserX size={16} />
                      Disable
                    </button>
                    <button
                      onClick={() => setSelectedUsers([])}
                      className="h-[36px] px-3 rounded-lg bg-white/10 hover:bg-white/20 text-[14px] font-medium transition-all"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Table header */}
            <div className="flex items-center h-[48px] px-4 border-b border-neutral-200 bg-neutral-50 text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
              <div className="w-10 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                />
              </div>
              <div className="w-[80px] px-4">ID</div>
              <button
                onClick={() => handleSort('name')}
                className="flex-1 px-4 flex items-center gap-1 hover:text-neutral-900 transition-colors group text-left"
              >
                Name
                <SortIcon field="name" />
              </button>
              <div className="w-[100px] px-4">Type</div>
              <div className="w-[160px] px-4">Contact</div>
              <div className="w-[100px] px-4">Status</div>
              <button
                onClick={() => handleSort('balance')}
                className="w-[120px] px-4 text-right flex items-center justify-end gap-1 hover:text-neutral-900 transition-colors group"
              >
                Balance
                <SortIcon field="balance" />
              </button>
              <button
                onClick={() => handleSort('spent')}
                className="w-[120px] px-4 text-right flex items-center justify-end gap-1 hover:text-neutral-900 transition-colors group"
              >
                Spent
                <SortIcon field="spent" />
              </button>
              <button
                onClick={() => handleSort('joined')}
                className="w-[130px] px-4 flex items-center gap-1 hover:text-neutral-900 transition-colors group"
              >
                Joined
                <SortIcon field="joined" />
              </button>
              <button
                onClick={() => handleSort('lastVisit')}
                className="w-[130px] px-4 flex items-center gap-1 hover:text-neutral-900 transition-colors group"
              >
                Last Visit
                <SortIcon field="lastVisit" />
              </button>
              <div className="w-10"></div>
            </div>

            {/* Table body */}
            {loading ? (
              <div className="flex items-center justify-center h-40 text-[14px] text-neutral-500">
                Loading users...
              </div>
            ) : paginatedUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 px-4">
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                  <Search size={24} className="text-neutral-400" />
                </div>
                <h3 className="text-[16px] font-semibold text-neutral-900 mb-1">No users found</h3>
                <p className="text-[14px] text-neutral-500">Try adjusting your filters.</p>
              </div>
            ) : (
              paginatedUsers.map((user) => {
                const isSelected = selectedUsers.includes(user.id);
                const userType = user.user_type === 'employee' ? 'staff' : (user.user_type || 'customer');
                const config = userTypeConfig[userType as keyof typeof userTypeConfig];

                return (
                  <div
                    key={user.id}
                    className={`flex items-center h-[60px] px-4 border-b border-neutral-100 last:border-0 hover:bg-neutral-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-neutral-100' : ''
                    }`}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                  >
                    <div className="w-10 flex items-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectUser(user.id)}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                      />
                    </div>
                    <div className="w-[80px] px-4">
                      <span className="text-[13px] font-mono text-neutral-500">#{user.id}</span>
                    </div>
                    <div className="flex-1 px-4 min-w-0">
                      <p className="text-[14px] font-medium text-neutral-900 truncate">
                        {user.name} {user.surname}
                      </p>
                      {user.company && (
                        <p className="text-[13px] text-neutral-500 truncate">{user.company}</p>
                      )}
                    </div>
                    <div className="w-[100px] px-4">
                      <span className="inline-flex items-center h-[24px] px-2 rounded-md bg-neutral-100 text-[12px] font-medium text-neutral-700">
                        {config.label}
                      </span>
                    </div>
                    <div className="w-[160px] px-4">
                      <p className="text-[13px] text-neutral-900">{user.phone}</p>
                      {user.email && (
                        <p className="text-[12px] text-neutral-500 truncate">{user.email}</p>
                      )}
                    </div>
                    <div className="w-[100px] px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-1 h-1 rounded-full ${user.is_active !== false ? 'bg-green-500' : 'bg-neutral-300'}`}></div>
                        <span className="text-[13px] font-medium text-neutral-700">
                          {user.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="w-[120px] px-4 text-right font-mono text-[14px] font-medium text-neutral-900">
                      {userType === 'investor'
                        ? `฿${(user.investor_group_credits_balance || 0).toLocaleString()}`
                        : userType === 'media'
                        ? `฿${((user.media_annual_budget_thb || 0) - (user.media_spent_this_year_thb || 0)).toLocaleString()}`
                        : `${user.points_balance || 0} pts`}
                    </div>
                    <div className="w-[120px] px-4 text-right font-mono text-[14px] font-medium text-neutral-900">
                      ฿{user.total_spend ? Number(user.total_spend).toLocaleString() : '0'}
                    </div>
                    <div className="w-[130px] px-4 text-[13px] text-neutral-600">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </div>
                    <div className="w-[130px] px-4 text-[13px] text-neutral-400">
                      {user.last_visit
                        ? new Date(user.last_visit).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                        : 'Never'}
                    </div>
                    <div className="w-10 flex justify-end">
                      <ChevronRight size={16} className="text-neutral-400" />
                    </div>
                  </div>
                );
              })
            )}

            {/* Pagination */}
            {!loading && paginatedUsers.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-white">
                <p className="text-[14px] text-neutral-600">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, filteredUsers.length)} of {filteredUsers.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="h-[32px] px-3 border border-neutral-300 rounded-lg text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`h-[32px] w-[32px] rounded-lg text-[13px] font-medium transition-all ${
                          page === pageNum
                            ? 'bg-neutral-900 text-white'
                            : 'border border-neutral-300 hover:bg-neutral-50 text-neutral-700 bg-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="h-[32px] px-3 border border-neutral-300 rounded-lg text-[13px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
