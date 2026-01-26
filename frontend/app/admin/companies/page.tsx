'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Building2, Plus, Edit, Users, Upload, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface Company {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  discount_percentage: number;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  allow_employee_self_registration: boolean;
  email_domain?: string;
  employee_count: number;
  total_points_awarded: number;
  created_at: string;
  updated_at: string;
}

interface Employee {
  id: number;
  company_id: number;
  employee_email: string;
  employee_id?: string;
  full_name?: string;
  department?: string;
  is_verified: boolean;
  verified_at?: string;
  user_id?: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewingEmployees, setViewingEmployees] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [companyFormData, setCompanyFormData] = useState({
    name: '',
    slug: '',
    description: '',
    discount_percentage: '0',
    contact_email: '',
    contact_phone: '',
    email_domain: '',
    allow_employee_self_registration: false,
    is_active: true,
  });

  const [employeeFormData, setEmployeeFormData] = useState({
    employee_email: '',
    employee_id: '',
    full_name: '',
    department: '',
  });

  const [bulkEmployees, setBulkEmployees] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies', {
        params: searchTerm ? { search: searchTerm } : {},
      });
      setCompanies(response.data);
    } catch (error) {
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async (companyId: number) => {
    try {
      const response = await api.get(`/companies/${companyId}/employees`);
      setEmployees(response.data);
    } catch (error) {
      toast.error('Failed to load employees');
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const discountNum = parseInt(companyFormData.discount_percentage);
    if (discountNum < 0 || discountNum > 100) {
      toast.error('Discount must be between 0 and 100');
      return;
    }

    try {
      const data = {
        name: companyFormData.name,
        slug: companyFormData.slug || companyFormData.name.toLowerCase().replace(/\s+/g, '-'),
        description: companyFormData.description || null,
        discount_percentage: discountNum,
        contact_email: companyFormData.contact_email || null,
        contact_phone: companyFormData.contact_phone || null,
        email_domain: companyFormData.email_domain || null,
        allow_employee_self_registration: companyFormData.allow_employee_self_registration,
        is_active: companyFormData.is_active,
      };

      if (editingCompany) {
        await api.put(`/companies/${editingCompany.id}`, data);
        toast.success('Company updated successfully');
      } else {
        await api.post('/companies', data);
        toast.success('Company created successfully');
      }

      setShowCompanyForm(false);
      setEditingCompany(null);
      resetCompanyForm();
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save company');
    }
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!viewingEmployees) return;

    try {
      const data = {
        employee_email: employeeFormData.employee_email.toLowerCase(),
        employee_id: employeeFormData.employee_id || null,
        full_name: employeeFormData.full_name || null,
        department: employeeFormData.department || null,
      };

      await api.post(`/companies/${viewingEmployees.id}/employees`, data);
      toast.success('Employee added successfully');

      setShowEmployeeForm(false);
      resetEmployeeForm();
      fetchEmployees(viewingEmployees.id);
      fetchCompanies(); // Refresh to update employee count
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add employee');
    }
  };

  const handleBulkUpload = async () => {
    if (!viewingEmployees) return;

    try {
      const lines = bulkEmployees.split('\n').filter((line) => line.trim());
      const employeesData = lines.map((line) => {
        const [email, employeeId, fullName, department] = line
          .split(',')
          .map((s) => s.trim());
        return {
          employee_email: email.toLowerCase(),
          employee_id: employeeId || null,
          full_name: fullName || null,
          department: department || null,
        };
      });

      const response = await api.post(
        `/companies/${viewingEmployees.id}/employees/bulk`,
        { employees: employeesData }
      );

      toast.success(
        `Uploaded ${response.data.inserted} employees (${response.data.failed} failed)`
      );

      setShowBulkUpload(false);
      setBulkEmployees('');
      fetchEmployees(viewingEmployees.id);
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to bulk upload');
    }
  };

  const handleDeleteEmployee = async (employeeId: number) => {
    if (!viewingEmployees) return;
    if (!confirm('Are you sure you want to remove this employee?')) return;

    try {
      await api.delete(`/companies/${viewingEmployees.id}/employees/${employeeId}`);
      toast.success('Employee removed');
      fetchEmployees(viewingEmployees.id);
      fetchCompanies();
    } catch (error) {
      toast.error('Failed to remove employee');
    }
  };

  const handleDeleteCompany = async (id: number) => {
    if (!confirm('Are you sure you want to delete this company? This will also remove all associated employees.')) return;

    try {
      await api.delete(`/companies/${id}`);
      toast.success('Company deleted');
      fetchCompanies();
    } catch (error) {
      toast.error('Failed to delete company');
    }
  };

  const resetCompanyForm = () => {
    setCompanyFormData({
      name: '',
      slug: '',
      description: '',
      discount_percentage: '0',
      contact_email: '',
      contact_phone: '',
      email_domain: '',
      allow_employee_self_registration: false,
      is_active: true,
    });
  };

  const resetEmployeeForm = () => {
    setEmployeeFormData({
      employee_email: '',
      employee_id: '',
      full_name: '',
      department: '',
    });
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCompanyFormData({
      name: company.name,
      slug: company.slug,
      description: company.description || '',
      discount_percentage: company.discount_percentage.toString(),
      contact_email: company.contact_email || '',
      contact_phone: company.contact_phone || '',
      email_domain: company.email_domain || '',
      allow_employee_self_registration: company.allow_employee_self_registration,
      is_active: company.is_active,
    });
    setShowCompanyForm(true);
  };

  const handleViewEmployees = (company: Company) => {
    setViewingEmployees(company);
    fetchEmployees(company.id);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {!viewingEmployees ? (
          <>
            {/* Companies List */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Companies</h2>
              <button
                onClick={() => {
                  setEditingCompany(null);
                  resetCompanyForm();
                  setShowCompanyForm(true);
                }}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={20} />
                Create Company
              </button>
            </div>

            {/* Search */}
            <div>
              <input
                type="text"
                placeholder="Search companies..."
                className="input max-w-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && fetchCompanies()}
              />
            </div>

            {/* Company Form */}
            {showCompanyForm && (
              <div className="card bg-blue-50 border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">
                    {editingCompany ? 'Edit Company' : 'Create New Company'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowCompanyForm(false);
                      setEditingCompany(null);
                      resetCompanyForm();
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleCompanySubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={companyFormData.name}
                        onChange={(e) =>
                          setCompanyFormData({ ...companyFormData, name: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Slug (URL-friendly name)
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder="auto-generated if empty"
                        value={companyFormData.slug}
                        onChange={(e) =>
                          setCompanyFormData({ ...companyFormData, slug: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      className="input"
                      rows={3}
                      value={companyFormData.description}
                      onChange={(e) =>
                        setCompanyFormData({
                          ...companyFormData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Discount Percentage (0-100) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="input"
                        value={companyFormData.discount_percentage}
                        onChange={(e) =>
                          setCompanyFormData({
                            ...companyFormData,
                            discount_percentage: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Domain (e.g., google.com)
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder="company.com"
                        value={companyFormData.email_domain}
                        onChange={(e) =>
                          setCompanyFormData({
                            ...companyFormData,
                            email_domain: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        className="input"
                        value={companyFormData.contact_email}
                        onChange={(e) =>
                          setCompanyFormData({
                            ...companyFormData,
                            contact_email: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        className="input"
                        value={companyFormData.contact_phone}
                        onChange={(e) =>
                          setCompanyFormData({
                            ...companyFormData,
                            contact_phone: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={companyFormData.allow_employee_self_registration}
                        onChange={(e) =>
                          setCompanyFormData({
                            ...companyFormData,
                            allow_employee_self_registration: e.target.checked,
                          })
                        }
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Allow employee self-registration via email domain
                      </span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={companyFormData.is_active}
                        onChange={(e) =>
                          setCompanyFormData({
                            ...companyFormData,
                            is_active: e.target.checked,
                          })
                        }
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button type="submit" className="btn btn-primary">
                      {editingCompany ? 'Update Company' : 'Create Company'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCompanyForm(false);
                        setEditingCompany(null);
                        resetCompanyForm();
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Companies Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="card h-48 bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : companies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className={`card ${!company.is_active ? 'opacity-60 bg-gray-50' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building2 size={28} className="text-blue-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-800">{company.name}</h3>
                            <p className="text-xs text-gray-500">{company.slug}</p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditCompany(company)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleViewEmployees(company)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded"
                              title="Manage Employees"
                            >
                              <Users size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteCompany(company.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {company.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {company.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            {company.discount_percentage}% discount
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {company.employee_count} employees
                          </span>
                          {company.email_domain && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              @{company.email_domain}
                            </span>
                          )}
                          {company.allow_employee_self_registration && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Self-registration
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              company.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {company.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-12">
                <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No companies yet</p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Employee Management View */}
            <div>
              <button
                onClick={() => {
                  setViewingEmployees(null);
                  setEmployees([]);
                }}
                className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
              >
                ← Back to Companies
              </button>

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {viewingEmployees.name} - Employees
                  </h2>
                  <p className="text-gray-600">
                    {viewingEmployees.discount_percentage}% discount •{' '}
                    {employees.length} employees
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBulkUpload(true)}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <Upload size={20} />
                    Bulk Upload
                  </button>
                  <button
                    onClick={() => setShowEmployeeForm(true)}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Plus size={20} />
                    Add Employee
                  </button>
                </div>
              </div>

              {/* Add Employee Form */}
              {showEmployeeForm && (
                <div className="card bg-blue-50 border border-blue-200 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Add Employee</h3>
                    <button
                      onClick={() => {
                        setShowEmployeeForm(false);
                        resetEmployeeForm();
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleEmployeeSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Employee Email *
                        </label>
                        <input
                          type="email"
                          className="input"
                          value={employeeFormData.employee_email}
                          onChange={(e) =>
                            setEmployeeFormData({
                              ...employeeFormData,
                              employee_email: e.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Employee ID
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={employeeFormData.employee_id}
                          onChange={(e) =>
                            setEmployeeFormData({
                              ...employeeFormData,
                              employee_id: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={employeeFormData.full_name}
                          onChange={(e) =>
                            setEmployeeFormData({
                              ...employeeFormData,
                              full_name: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Department
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={employeeFormData.department}
                          onChange={(e) =>
                            setEmployeeFormData({
                              ...employeeFormData,
                              department: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button type="submit" className="btn btn-primary">
                        Add Employee
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEmployeeForm(false);
                          resetEmployeeForm();
                        }}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Bulk Upload Form */}
              {showBulkUpload && (
                <div className="card bg-yellow-50 border border-yellow-200 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Bulk Upload Employees</h3>
                    <button
                      onClick={() => {
                        setShowBulkUpload(false);
                        setBulkEmployees('');
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    Enter one employee per line in CSV format:
                    <br />
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      email, employee_id, full_name, department
                    </code>
                  </p>

                  <textarea
                    className="input font-mono text-sm"
                    rows={10}
                    placeholder="john@company.com, EMP001, John Doe, Engineering&#10;jane@company.com, EMP002, Jane Smith, Marketing"
                    value={bulkEmployees}
                    onChange={(e) => setBulkEmployees(e.target.value)}
                  />

                  <div className="flex gap-3 mt-4">
                    <button onClick={handleBulkUpload} className="btn btn-primary">
                      Upload Employees
                    </button>
                    <button
                      onClick={() => {
                        setShowBulkUpload(false);
                        setBulkEmployees('');
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Employees Table */}
              {employees.length > 0 ? (
                <div className="card overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Employee ID
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Full Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Department
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((employee) => (
                        <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-800">
                            {employee.employee_email}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {employee.employee_id || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {employee.full_name || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {employee.department || '-'}
                          </td>
                          <td className="py-3 px-4">
                            {employee.is_verified ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                ✓ Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteEmployee(employee.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card text-center py-12">
                  <Users size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No employees yet</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
