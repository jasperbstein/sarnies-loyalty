'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { usersAPI, companiesAPI } from '@/lib/api';
import { Search, ChevronRight, Download, Tag, UserX, ChevronDown, ChevronUp, Plus, X, Upload, FileText, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import '@/app/admin/admin.css';

type SortField = 'name' | 'balance' | 'spent' | 'joined' | 'lastVisit';
type SortDirection = 'asc' | 'desc';
type UserType = 'all' | 'customer' | 'staff' | 'investor' | 'media';
type StatusFilter = 'all' | 'active' | 'inactive';
type DateRangeFilter = 'all' | 'last7days' | 'last30days' | 'last90days';

function AdminUsersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Filters - initialize company filter from URL param if present
  const initialCompanyFilter = searchParams.get('company') || 'all';
  const [typeFilter, setTypeFilter] = useState<UserType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [companyFilter, setCompanyFilter] = useState<string>(initialCompanyFilter);
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

  // Add user modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    surname: '',
    email: '',
    user_type: 'customer'
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // CSV import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [importingUsers, setImportingUsers] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, errors: [] as string[] });

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

  // Update company filter when URL param changes
  useEffect(() => {
    const urlCompany = searchParams.get('company');
    if (urlCompany && urlCompany !== companyFilter) {
      setCompanyFilter(urlCompany);
    }
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter, companyFilter, joinedDateFilter, expirationDateFilter, sortField, sortDirection]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch users and companies in parallel
      const [usersResponse, companiesResponse] = await Promise.all([
        usersAPI.getAll({ limit: 10000 }),
        companiesAPI.getAll().catch(() => ({ data: { companies: [] } })) // Graceful fallback
      ]);

      const users = usersResponse.data.users;
      setAllUsers(users);

      // Get company names from companies API (more reliable than user data)
      const companiesFromAPI = (companiesResponse.data?.companies || [])
        .filter((c: any) => c.is_active)
        .map((c: any) => c.name)
        .sort();

      // Also include any companies from user data that might not be in companies table
      const companiesFromUsers = Array.from(new Set(users.map((u: any) => u.company).filter(Boolean)));

      // Merge both sources, keeping unique values
      const mergedCompanies = Array.from(new Set([...companiesFromAPI, ...companiesFromUsers])).sort();
      setAllCompanies(mergedCompanies as string[]);

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
    if (filteredUsers.length === 0) {
      toast.error('No users to export');
      return;
    }

    // Create CSV content
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Type', 'Company', 'Points Balance', 'Total Spent', 'Joined', 'Last Visit'];
    const csvRows = [headers.join(',')];

    filteredUsers.forEach((user: any) => {
      const row = [
        user.id,
        `"${(user.name || '').replace(/"/g, '""')} ${(user.surname || '').replace(/"/g, '""')}"`,
        `"${(user.email || '').replace(/"/g, '""')}"`,
        `"${(user.phone || '').replace(/"/g, '""')}"`,
        user.user_type || 'customer',
        `"${(user.company || '').replace(/"/g, '""')}"`,
        user.points_balance || 0,
        user.total_spent || 0,
        user.created_at ? new Date(user.created_at).toLocaleDateString() : '',
        user.last_login ? new Date(user.last_login).toLocaleDateString() : ''
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sarnies-users-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${filteredUsers.length} users`);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email) {
      toast.error('Name and email are required');
      return;
    }

    try {
      setCreatingUser(true);
      const response = await usersAPI.create(newUserForm);
      toast.success('User created successfully');
      setShowAddUserModal(false);
      setNewUserForm({ name: '', surname: '', email: '', user_type: 'customer' });
      fetchUsers();
      // Navigate to the new user's detail page
      router.push(`/admin/users/${response.data.user.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  // CSV Template download
  const downloadTemplate = () => {
    const headers = ['name', 'surname', 'email', 'user_type'];
    const exampleRows = [
      ['John', 'Doe', 'john.doe@example.com', 'customer'],
      ['Jane', 'Smith', 'jane.smith@company.com', 'employee'],
      ['Bob', 'Wilson', 'bob@media.com', 'media'],
    ];
    const csvContent = [headers.join(','), ...exampleRows.map(row => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'users-import-template.csv');
    link.click();
  };

  // CSV file handling
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        const obj: any = {};
        headers.forEach((header, i) => {
          obj[header] = values[i] || '';
        });
        return obj;
      }).filter(row => row.email); // Only rows with email

      setCsvPreview(data.slice(0, 5)); // Preview first 5
      setImportProgress({ current: 0, total: data.length, errors: [] });
    };
    reader.readAsText(file);
  };

  // Import users from CSV
  const handleImportUsers = async () => {
    if (!csvFile) return;

    setImportingUsers(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        const obj: any = {};
        headers.forEach((header, i) => {
          obj[header] = values[i] || '';
        });
        return obj;
      }).filter(row => row.email);

      const errors: string[] = [];
      let successCount = 0;

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        setImportProgress(prev => ({ ...prev, current: i + 1 }));

        try {
          await usersAPI.create({
            name: row.name || row.email.split('@')[0],
            surname: row.surname || '',
            email: row.email,
            user_type: row.user_type || 'customer'
          });
          successCount++;
        } catch (error: any) {
          const msg = error.response?.data?.error || 'Unknown error';
          errors.push(`Row ${i + 2}: ${row.email} - ${msg}`);
        }
      }

      setImportProgress(prev => ({ ...prev, errors }));
      setImportingUsers(false);

      if (successCount > 0) {
        toast.success(`Imported ${successCount} users`);
        fetchUsers();
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} failed - see details below`);
      }
      if (successCount > 0 && errors.length === 0) {
        setTimeout(() => {
          setShowImportModal(false);
          setCsvFile(null);
          setCsvPreview([]);
          setImportProgress({ current: 0, total: 0, errors: [] });
        }, 1500);
      }
    };

    reader.readAsText(csvFile);
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

  // Compact dropdown component with macOS styling
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
        <label className="block text-[10px] font-semibold uppercase tracking-[0.04em] text-[#86868b] mb-1.5">{label}</label>
        <div className="relative">
          <button
            onClick={onToggle}
            className={`h-[40px] px-3 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white text-[14px] text-[#1d1d1f] hover:border-[rgba(0,0,0,0.2)] transition-all flex items-center justify-between gap-2 ${width}`}
          >
            <span className="truncate">{selectedOption?.label || 'Select...'}</span>
            <ChevronDown size={14} className="text-[#86868b] flex-shrink-0" />
          </button>

          {isOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={onToggle} />
              <div className="absolute left-0 top-full mt-1 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl shadow-macos-dropdown py-1 z-20 min-w-full max-h-64 overflow-y-auto animate-macos-fade">
                {options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      onToggle();
                    }}
                    className={`w-full text-left px-3 py-2 text-[14px] transition-colors ${
                      value === option.value
                        ? 'bg-[rgba(0,122,255,0.1)] text-[#007AFF] font-medium'
                        : 'text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.04)]'
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
      <div className="min-h-screen bg-gradient-to-b from-[#F5F5F7] to-[#ECECEE] animate-macos-fade">
        <div className="max-w-[1600px] mx-auto px-8 py-8">
          {/* Header */}
          <div className="admin-page-header mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(0,122,255,0.12)] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#007AFF]" />
              </div>
              <div>
                <h1 className="admin-page-title">Users</h1>
                <p className="admin-page-subtitle">{segmentCounts.total} total users</p>
              </div>
            </div>
          </div>

          {/* Filter Bar - macOS Glassmorphism */}
          <div className="admin-card p-5 mb-6">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              {/* Left side: Search + Filters */}
              <div className="flex items-end gap-3 flex-1">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                  <input
                    type="text"
                    className="admin-input w-[280px] pl-10"
                    placeholder="Search users..."
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

              {/* Right side: Import + Add User + Export */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="admin-btn-secondary h-[40px] px-4 flex items-center gap-2"
                >
                  <Upload size={16} />
                  Import CSV
                </button>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="admin-btn-primary h-[40px] px-4 flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add User
                </button>
                <button
                  onClick={exportUsers}
                  className="admin-btn-secondary h-[40px] px-4 flex items-center gap-2"
                >
                  <Download size={16} />
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="admin-card overflow-hidden">
            {/* Bulk actions */}
            {selectedUsers.length > 0 && (
              <div className="bg-gradient-to-b from-[#2997FF] to-[#007AFF] text-white px-6 py-4 border-b border-[rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-between">
                  <div className="text-[14px] font-semibold">
                    {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="h-[36px] px-3 rounded-lg bg-white/20 hover:bg-white/30 text-[13px] font-medium transition-all flex items-center gap-2 backdrop-blur-sm">
                      <Tag size={16} />
                      Add Tags
                    </button>
                    <button className="h-[36px] px-3 rounded-lg bg-white/20 hover:bg-white/30 text-[13px] font-medium transition-all flex items-center gap-2 backdrop-blur-sm">
                      <UserX size={16} />
                      Disable
                    </button>
                    <button
                      onClick={() => setSelectedUsers([])}
                      className="h-[36px] px-3 rounded-lg bg-white/20 hover:bg-white/30 text-[13px] font-medium transition-all backdrop-blur-sm"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Table header */}
            <div className="flex items-center h-[48px] px-4 border-b border-[rgba(0,0,0,0.06)] bg-[rgba(246,246,246,0.6)] text-[11px] font-semibold uppercase tracking-[0.03em] text-[#86868b]">
              <div className="w-10 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-[rgba(0,0,0,0.15)] text-[#007AFF] focus:ring-[#007AFF] cursor-pointer"
                />
              </div>
              <div className="w-[80px] px-4">ID</div>
              <button
                onClick={() => handleSort('name')}
                className="flex-1 px-4 flex items-center gap-1 hover:text-[#1d1d1f] transition-colors group text-left"
              >
                Name
                <SortIcon field="name" />
              </button>
              <div className="w-[100px] px-4">Type</div>
              <div className="w-[160px] px-4">Contact</div>
              <div className="w-[100px] px-4">Status</div>
              <button
                onClick={() => handleSort('balance')}
                className="w-[120px] px-4 text-right flex items-center justify-end gap-1 hover:text-[#1d1d1f] transition-colors group"
              >
                Balance
                <SortIcon field="balance" />
              </button>
              <button
                onClick={() => handleSort('spent')}
                className="w-[120px] px-4 text-right flex items-center justify-end gap-1 hover:text-[#1d1d1f] transition-colors group"
              >
                Spent
                <SortIcon field="spent" />
              </button>
              <button
                onClick={() => handleSort('joined')}
                className="w-[130px] px-4 flex items-center gap-1 hover:text-[#1d1d1f] transition-colors group"
              >
                Joined
                <SortIcon field="joined" />
              </button>
              <button
                onClick={() => handleSort('lastVisit')}
                className="w-[130px] px-4 flex items-center gap-1 hover:text-[#1d1d1f] transition-colors group"
              >
                Last Visit
                <SortIcon field="lastVisit" />
              </button>
              <div className="w-10"></div>
            </div>

            {/* Table body */}
            {loading ? (
              <div className="flex items-center justify-center h-40 text-[14px] text-[#86868b]">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-[2.5px] border-[rgba(0,0,0,0.08)] border-t-[#007AFF] rounded-full animate-spin"></div>
                  <span>Loading users...</span>
                </div>
              </div>
            ) : paginatedUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 px-4">
                <div className="w-14 h-14 rounded-2xl bg-[rgba(0,0,0,0.04)] flex items-center justify-center mb-4">
                  <Search size={24} className="text-[#86868b]" />
                </div>
                <h3 className="text-[16px] font-semibold text-[#1d1d1f] mb-1">No users found</h3>
                <p className="text-[14px] text-[#86868b]">Try adjusting your filters.</p>
              </div>
            ) : (
              paginatedUsers.map((user) => {
                const isSelected = selectedUsers.includes(user.id);
                const userType = user.user_type === 'employee' ? 'staff' : (user.user_type || 'customer');
                const config = userTypeConfig[userType as keyof typeof userTypeConfig];

                return (
                  <div
                    key={user.id}
                    className={`flex items-center h-[60px] px-4 border-b border-[rgba(0,0,0,0.04)] last:border-0 hover:bg-[rgba(0,0,0,0.02)] cursor-pointer transition-colors ${
                      isSelected ? 'bg-[rgba(0,122,255,0.06)]' : ''
                    }`}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                  >
                    <div className="w-10 flex items-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectUser(user.id)}
                        className="w-4 h-4 rounded border-[rgba(0,0,0,0.15)] text-[#007AFF] focus:ring-[#007AFF] cursor-pointer"
                      />
                    </div>
                    <div className="w-[80px] px-4">
                      <span className="text-[13px] font-mono text-[#86868b]">#{user.id}</span>
                    </div>
                    <div className="flex-1 px-4 min-w-0">
                      <p className="text-[14px] font-medium text-[#1d1d1f] truncate">
                        {user.name} {user.surname}
                      </p>
                      {user.company && (
                        <p className="text-[12px] text-[#86868b] truncate">{user.company}</p>
                      )}
                    </div>
                    <div className="w-[100px] px-4">
                      <span className="admin-badge-info">
                        {config.label}
                      </span>
                    </div>
                    <div className="w-[160px] px-4">
                      <p className="text-[13px] text-[#1d1d1f]">{user.phone}</p>
                      {user.email && (
                        <p className="text-[12px] text-[#86868b] truncate">{user.email}</p>
                      )}
                    </div>
                    <div className="w-[100px] px-4">
                      <span className={user.is_active !== false ? 'admin-badge-success' : 'admin-badge'}>
                        {user.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="w-[120px] px-4 text-right font-mono text-[14px] font-medium text-[#1d1d1f]">
                      {userType === 'investor'
                        ? `฿${(user.investor_group_credits_balance || 0).toLocaleString()}`
                        : userType === 'media'
                        ? `฿${((user.media_annual_budget_thb || 0) - (user.media_spent_this_year_thb || 0)).toLocaleString()}`
                        : `${user.points_balance || 0} pts`}
                    </div>
                    <div className="w-[120px] px-4 text-right font-mono text-[14px] font-medium text-[#1d1d1f]">
                      ฿{user.total_spend ? Number(user.total_spend).toLocaleString() : '0'}
                    </div>
                    <div className="w-[130px] px-4 text-[13px] text-[#636366]">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </div>
                    <div className="w-[130px] px-4 text-[13px] text-[#86868b]">
                      {user.last_visit
                        ? new Date(user.last_visit).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                        : 'Never'}
                    </div>
                    <div className="w-10 flex justify-end">
                      <ChevronRight size={16} className="text-[#c7c7cc]" />
                    </div>
                  </div>
                );
              })
            )}

            {/* Pagination */}
            {!loading && paginatedUsers.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[rgba(0,0,0,0.06)] bg-[rgba(246,246,246,0.4)]">
                <p className="text-[13px] text-[#86868b]">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, filteredUsers.length)} of {filteredUsers.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="h-[32px] px-3 border border-[rgba(0,0,0,0.1)] rounded-lg text-[13px] font-medium text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.04)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white"
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
                            ? 'bg-gradient-to-b from-[#2997FF] to-[#007AFF] text-white shadow-sm'
                            : 'border border-[rgba(0,0,0,0.1)] hover:bg-[rgba(0,0,0,0.04)] text-[#1d1d1f] bg-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="h-[32px] px-3 border border-[rgba(0,0,0,0.1)] rounded-lg text-[13px] font-medium text-[#1d1d1f] hover:bg-[rgba(0,0,0,0.04)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal w-full max-w-md animate-macos-fade">
            <div className="admin-modal-header">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Add New User</h2>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-1.5 hover:bg-[rgba(0,0,0,0.06)] rounded-lg transition-colors"
              >
                <X size={18} className="text-[#86868b]" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="admin-modal-body space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="admin-label">First Name *</label>
                  <input
                    type="text"
                    value={newUserForm.name}
                    onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})}
                    className="admin-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="admin-label">Last Name</label>
                  <input
                    type="text"
                    value={newUserForm.surname}
                    onChange={(e) => setNewUserForm({...newUserForm, surname: e.target.value})}
                    className="admin-input w-full"
                  />
                </div>
              </div>
              <div>
                <label className="admin-label">Email *</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                  className="admin-input w-full"
                  placeholder="user@example.com"
                  required
                />
                <p className="text-[11px] text-[#86868b] mt-1.5">User will receive a login invite via email</p>
              </div>
              <div>
                <label className="admin-label">User Type</label>
                <select
                  value={newUserForm.user_type}
                  onChange={(e) => setNewUserForm({...newUserForm, user_type: e.target.value})}
                  className="admin-select w-full"
                >
                  <option value="customer">Customer</option>
                  <option value="employee">Employee</option>
                  <option value="investor">Investor</option>
                  <option value="media">Media</option>
                  <option value="partner">Partner</option>
                </select>
              </div>
            </form>
            <div className="admin-modal-footer">
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="admin-btn-secondary px-4 py-2.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleCreateUser}
                disabled={creatingUser}
                className="admin-btn-primary px-4 py-2.5 disabled:opacity-50"
              >
                {creatingUser ? 'Creating...' : 'Create & Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal w-full max-w-lg animate-macos-fade">
            <div className="admin-modal-header">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Import Users from CSV</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setCsvFile(null);
                  setCsvPreview([]);
                  setImportProgress({ current: 0, total: 0, errors: [] });
                }}
                className="p-1.5 hover:bg-[rgba(0,0,0,0.06)] rounded-lg transition-colors"
              >
                <X size={18} className="text-[#86868b]" />
              </button>
            </div>
            <div className="admin-modal-body space-y-4">
              {/* Template download */}
              <div className="flex items-center justify-between p-4 bg-[rgba(0,122,255,0.06)] rounded-xl border border-[rgba(0,122,255,0.1)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[rgba(0,122,255,0.12)] flex items-center justify-center">
                    <FileText size={18} className="text-[#007AFF]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#1d1d1f]">Download Template</p>
                    <p className="text-[12px] text-[#86868b]">CSV with example data</p>
                  </div>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="text-[13px] font-semibold text-[#007AFF] hover:text-[#0066D6] transition-colors"
                >
                  Download →
                </button>
              </div>

              {/* File upload */}
              <div>
                <label className="admin-label">Upload CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="w-full px-3 py-2.5 text-[14px] border border-[rgba(0,0,0,0.1)] rounded-xl focus:ring-2 focus:ring-[#007AFF] focus:border-transparent file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[13px] file:font-medium file:bg-[rgba(0,0,0,0.06)] file:text-[#1d1d1f] hover:file:bg-[rgba(0,0,0,0.08)] transition-colors"
                />
                <p className="text-[11px] text-[#86868b] mt-1.5">
                  Columns: name, surname, email, user_type (customer/employee/investor/media)
                </p>
              </div>

              {/* Preview */}
              {csvPreview.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-[#1d1d1f] mb-2 uppercase tracking-wide">
                    Preview ({importProgress.total} users found)
                  </p>
                  <div className="border border-[rgba(0,0,0,0.08)] rounded-xl overflow-hidden">
                    <table className="w-full text-[13px]">
                      <thead className="bg-[rgba(246,246,246,0.6)]">
                        <tr>
                          <th className="px-3 py-2.5 text-left text-[#86868b] font-semibold text-[11px] uppercase tracking-wide">Name</th>
                          <th className="px-3 py-2.5 text-left text-[#86868b] font-semibold text-[11px] uppercase tracking-wide">Email</th>
                          <th className="px-3 py-2.5 text-left text-[#86868b] font-semibold text-[11px] uppercase tracking-wide">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, i) => (
                          <tr key={i} className="border-t border-[rgba(0,0,0,0.04)]">
                            <td className="px-3 py-2.5 text-[#1d1d1f]">{row.name} {row.surname}</td>
                            <td className="px-3 py-2.5 text-[#636366]">{row.email}</td>
                            <td className="px-3 py-2.5 text-[#636366]">{row.user_type || 'customer'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importProgress.total > 5 && (
                      <div className="px-3 py-2 bg-[rgba(246,246,246,0.6)] text-[12px] text-[#86868b] border-t border-[rgba(0,0,0,0.04)]">
                        ... and {importProgress.total - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Progress */}
              {importingUsers && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[#636366]">Importing users...</span>
                    <span className="font-semibold text-[#1d1d1f]">{importProgress.current} / {importProgress.total}</span>
                  </div>
                  <div className="h-2 bg-[rgba(0,0,0,0.08)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#007AFF] to-[#2997FF] transition-all duration-300"
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Errors */}
              {importProgress.errors.length > 0 && (
                <div className="p-4 bg-[rgba(255,69,58,0.08)] border border-[rgba(255,69,58,0.15)] rounded-xl">
                  <p className="text-[12px] font-semibold text-[#FF453A] mb-2">
                    {importProgress.errors.length} error(s):
                  </p>
                  <ul className="text-[11px] text-[#FF453A] space-y-1 max-h-32 overflow-y-auto">
                    {importProgress.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setCsvFile(null);
                  setCsvPreview([]);
                  setImportProgress({ current: 0, total: 0, errors: [] });
                }}
                disabled={importingUsers}
                className="admin-btn-secondary px-4 py-2.5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImportUsers}
                disabled={!csvFile || importingUsers || importProgress.total === 0}
                className="admin-btn-primary px-4 py-2.5 disabled:opacity-50"
              >
                {importingUsers ? 'Importing...' : `Import ${importProgress.total} Users`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-b from-[#F5F5F7] to-[#ECECEE] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-[2.5px] border-[rgba(0,0,0,0.08)] border-t-[#007AFF] rounded-full animate-spin"></div>
            <span className="text-[14px] text-[#86868b]">Loading...</span>
          </div>
        </div>
      </AdminLayout>
    }>
      <AdminUsersPageContent />
    </Suspense>
  );
}
