'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Coffee, ArrowRight, ArrowLeft, CheckCircle, Building2, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import api from '@/lib/api';

// Disable static generation for this page (uses searchParams)
export const dynamic = 'force-dynamic';

type Step = 1 | 2 | 3;

interface CompanyInfo {
  id: number;
  name: string;
  discount_percentage: number;
  logo_url?: string;
}

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, updateUser } = useAuthStore();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    phone: searchParams.get('phone') || user?.phone || '',
    name: '',
    surname: '',
    email: '',
    birthday: '', // DD-MM format
    gender: '',
    company: '', // Freetext
    email_consent: false,
    sms_consent: false,
    preferred_outlet: ''
  });

  // Redirect if already registered
  useEffect(() => {
    if ((user as any)?.registration_completed) {
      router.push('/app/dashboard');
    }
  }, [user, router]);

  // Check company eligibility when email changes
  useEffect(() => {
    const checkCompanyEligibility = async () => {
      if (formData.email && formData.email.includes('@')) {
        setCheckingEmail(true);
        try {
          const response = await api.post('/companies/verify-email', {
            email: formData.email
          });

          if (response.data.eligible) {
            setCompanyInfo(response.data.company);
            toast.success(
              `You're eligible for ${response.data.company.name}'s ${response.data.company.discount_percentage}% employee discount!`,
              { duration: 5000 }
            );
          } else {
            setCompanyInfo(null);
          }
        } catch (error) {
          // Not eligible, no problem
          setCompanyInfo(null);
        } finally {
          setCheckingEmail(false);
        }
      }
    };

    const timeoutId = setTimeout(checkCompanyEligibility, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.email]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (currentStep: Step): boolean => {
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        toast.error('Please enter your first name');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(3, prev + 1) as Step);
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(1, prev - 1) as Step);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(step)) return;

    setLoading(true);
    try {
      const response = await api.post('/auth/register', formData);

      const { token, user: updatedUser } = response.data;

      // Update auth store
      updateUser({ ...updatedUser, type: 'customer' });

      toast.success('Registration complete! Welcome to Sarnies Loyalty');

      // Redirect to dashboard
      setTimeout(() => {
        router.push('/app/dashboard');
      }, 1000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const canSkip = step === 2 || step === 3;

  const handleSkip = () => {
    router.push('/app/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-full mb-4 shadow-lg">
            <Coffee className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-black mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">Just a few more details to get started</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step {step} of 3</span>
            <span className="text-sm text-gray-500">{Math.round((step / 3) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-black h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-xl font-bold text-black mb-6">Basic Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="John"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="Doe"
                      value={formData.surname}
                      onChange={(e) => handleChange('surname', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Birthday
                      <span className="text-xs text-gray-500 font-normal ml-2">(DD-MM)</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="15-03"
                      maxLength={5}
                      value={formData.birthday}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '');
                        if (value.length >= 2) {
                          value = value.slice(0, 2) + '-' + value.slice(2, 4);
                        }
                        handleChange('birthday', value);
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Gender
                    </label>
                    <select
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white"
                      value={formData.gender}
                      onChange={(e) => handleChange('gender', e.target.value)}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Contact & Company */}
            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-xl font-bold text-black mb-6">Contact Information</h2>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                    <span className="text-xs text-gray-500 font-normal ml-2">(Optional, but unlocks company benefits)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="you@company.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                    {checkingEmail && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {companyInfo && (
                    <div className="mt-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                          {companyInfo.logo_url ? (
                            <img src={companyInfo.logo_url} alt={companyInfo.name} className="w-8 h-8 object-contain" />
                          ) : (
                            <Building2 className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-green-600" />
                            <p className="text-sm font-bold text-green-900">Company Benefits Unlocked!</p>
                          </div>
                          <p className="text-xs text-green-800">
                            As a <strong>{companyInfo.name}</strong> employee, you'll receive an additional{' '}
                            <strong>{companyInfo.discount_percentage}% discount</strong> on all purchases and access to exclusive rewards.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company
                    <span className="text-xs text-gray-500 font-normal ml-2">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="Your company name"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                  />
                </div>

                <div className="border-t border-gray-200 pt-5">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Marketing Preferences</p>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black mt-0.5"
                        checked={formData.email_consent}
                        onChange={(e) => handleChange('email_consent', e.target.checked)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-black">Email updates</p>
                        <p className="text-xs text-gray-600">Receive exclusive offers and new reward notifications</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black mt-0.5"
                        checked={formData.sms_consent}
                        onChange={(e) => handleChange('sms_consent', e.target.checked)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-black">SMS notifications</p>
                        <p className="text-xs text-gray-600">Get notified about your points and special promotions</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Preferences */}
            {step === 3 && (
              <div className="space-y-5 animate-fade-in">
                <h2 className="text-xl font-bold text-black mb-6">Preferences</h2>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Preferred Outlet
                    <span className="text-xs text-gray-500 font-normal ml-2">(Optional)</span>
                  </label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white"
                    value={formData.preferred_outlet}
                    onChange={(e) => handleChange('preferred_outlet', e.target.value)}
                  >
                    <option value="">Select your favorite location</option>
                    <option value="Sukhumvit">Sarnies Sukhumvit</option>
                    <option value="Old Town">Sarnies Old Town</option>
                    <option value="Roastery">Sarnies Roastery</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    We'll use this to personalize your experience and notify you of outlet-specific offers
                  </p>
                </div>

                {/* Summary */}
                <div className="border-t border-gray-200 pt-5 mt-6">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Summary</p>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium text-gray-900">
                        {formData.name} {formData.surname}
                      </span>
                    </div>
                    {formData.email && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium text-gray-900">{formData.email}</span>
                      </div>
                    )}
                    {companyInfo && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Company:</span>
                        <span className="font-medium text-green-700">
                          {companyInfo.name} ({companyInfo.discount_percentage}% discount)
                        </span>
                      </div>
                    )}
                    {formData.birthday && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Birthday:</span>
                        <span className="font-medium text-gray-900">{formData.birthday}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <div>
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-black transition-colors font-medium"
                    disabled={loading}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {canSkip && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="px-6 py-3 text-gray-600 hover:text-black transition-colors font-medium"
                    disabled={loading}
                  >
                    Skip for now
                  </button>
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center gap-2 bg-black text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-md hover:shadow-lg"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-black text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Complete Registration
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          © 2025 Sarnies. Your data is safe with us.
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  );
}
