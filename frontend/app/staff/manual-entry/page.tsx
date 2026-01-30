'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StaffLayout from '@/components/StaffLayout';
import CustomerPreviewCard from '@/components/CustomerPreviewCard';
import api from '@/lib/api';
import { Keyboard, CheckCircle, AlertCircle, ArrowRight, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

type EntryMode = 'input' | 'preview' | 'error';

export default function ManualEntryPage() {
  const router = useRouter();
  const [mode, setMode] = useState<EntryMode>('input');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    setErrorMessage('');

    try {
      let parsedData;
      try {
        parsedData = JSON.parse(token);
      } catch {
        // If not JSON, assume it's a JWT token (loyalty ID)
        parsedData = { token: token.trim() };
      }

      // Validate and fetch data
      if (parsedData.type === 'loyalty_id' || !parsedData.type) {
        const userId = parsedData.customer_id || parsedData.id;
        if (!userId) {
          throw new Error('Invalid token: Missing customer ID');
        }

        const response = await api.get(`/users/${userId}`);

        setQrData({
          type: 'loyalty_id',
          user: response.data
        });
        setMode('preview');
      } else if (parsedData.type === 'voucher_redemption') {
        if (!parsedData.customer_id || !parsedData.voucher_id) {
          throw new Error('Invalid voucher token: Missing required fields');
        }

        const response = await api.get(`/users/${parsedData.customer_id}`);
        const voucherResponse = await api.get(`/vouchers/${parsedData.voucher_id}`);

        setQrData({
          type: 'voucher_redemption',
          user: response.data,
          voucher: parsedData,
          voucherDetails: voucherResponse.data
        });
        setMode('preview');
      } else {
        throw new Error('Unknown QR code type');
      }

      toast.success('Token validated successfully');
    } catch (error: any) {
      console.error('Validation Error:', error);
      setErrorMessage(error.response?.data?.error || error.message || 'Invalid token');
      setMode('error');
      toast.error(error.response?.data?.error || error.message || 'Invalid token');
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    // Store the validated data and redirect to scan page
    // The scan page will handle the actual transaction
    router.push('/staff/scan');
  };

  const reset = () => {
    setMode('input');
    setToken('');
    setQrData(null);
    setErrorMessage('');
  };

  return (
    <StaffLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Keyboard className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Manual QR Entry</h2>
          </div>
          <p className="text-gray-300">
            Enter QR token manually when camera scanner is not available
          </p>
        </div>

        {mode === 'input' && (
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
            <form onSubmit={handleValidate} className="space-y-6">
              {/* Token Input */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  QR Code Token *
                </label>
                <textarea
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black font-mono text-sm resize-none"
                  rows={6}
                  placeholder="Paste or type QR token here..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Accepts both JSON format and JWT tokens
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full p-1 mt-0.5">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Token Types</p>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>Loyalty QR:</strong> JWT token or JSON with customer_id</li>
                      <li>• <strong>Voucher QR:</strong> JSON with voucher_id and customer_id</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !token.trim()}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Validating...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Validate Token
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/staff/scan')}
                  className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Use Scanner
                </button>
              </div>
            </form>
          </div>
        )}

        {mode === 'preview' && qrData && (
          <div className="space-y-6">
            {/* Success Header */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="bg-green-600 text-white rounded-full p-3">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-900">Token Validated</h3>
                  <p className="text-sm text-green-700">
                    QR code is valid and ready to process
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Preview */}
            <CustomerPreviewCard
              customer={qrData.user}
              qrType={qrData.type}
              showFullDetails={true}
            />

            {/* Voucher Info (if applicable) */}
            {qrData.type === 'voucher_redemption' && qrData.voucherDetails && (
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6">
                <h4 className="font-bold text-purple-900 mb-3">Voucher Information</h4>
                <div className="space-y-2">
                  <p className="text-sm text-purple-800">
                    <strong>Title:</strong> {qrData.voucherDetails.title}
                  </p>
                  <p className="text-sm text-purple-800">
                    <strong>Value:</strong> ฿{Number(qrData.voucherDetails.cash_value).toFixed(2)}
                  </p>
                  <p className="text-sm text-purple-800">
                    <strong>Points Cost:</strong> {qrData.voucherDetails.points_required}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={handleProceed}
                  className="flex-1 bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition-all shadow-sm hover:shadow-md"
                >
                  <span className="flex items-center justify-center gap-2">
                    Proceed to {qrData.type === 'loyalty_id' ? 'Add Points' : 'Redeem Voucher'}
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </button>

                <button
                  onClick={reset}
                  className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Start Over
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'error' && (
          <div className="space-y-6">
            {/* Error Display */}
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
              <div className="bg-red-600 text-white rounded-full p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-red-900 mb-2">Invalid Token</h3>
              <p className="text-red-700 mb-6">{errorMessage}</p>

              <div className="bg-white rounded-xl p-4 border border-red-200 text-left">
                <p className="text-sm font-medium text-red-900 mb-2">Common Issues:</p>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• Token is expired or malformed</li>
                  <li>• Customer ID does not exist</li>
                  <li>• Missing required fields in JSON</li>
                  <li>• Network connection error</li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="flex-1 bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
                >
                  Try Again
                </button>

                <button
                  onClick={() => router.push('/staff/scan')}
                  className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Use Scanner
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
