'use client';

import { useState } from 'react';
import Modal from './Modal';
import Button from './ui/Button';
import { Plus, Minus } from 'lucide-react';

interface AdjustPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  userName: string;
  onAdjust: (points: number, reason: string, note?: string) => Promise<void>;
}

export default function AdjustPointsModal({
  isOpen,
  onClose,
  currentBalance,
  userName,
  onAdjust,
}: AdjustPointsModalProps) {
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'add' | 'deduct'>('add');

  const pointsValue = parseInt(points) || 0;
  const finalPoints = mode === 'deduct' ? -pointsValue : pointsValue;
  const newBalance = currentBalance + finalPoints;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!points || pointsValue === 0) {
      return;
    }

    if (!reason.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onAdjust(finalPoints, reason, note || undefined);
      // Reset form
      setPoints('');
      setReason('');
      setNote('');
      setMode('add');
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust Points Balance" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Adjusting points for</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{userName}</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600">Current Balance</p>
              <p className="text-2xl font-bold text-blue-600">{currentBalance}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">New Balance</p>
              <p className={`text-2xl font-bold ${newBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {newBalance}
              </p>
            </div>
          </div>
        </div>

        {/* Mode Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Action
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('add')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                mode === 'add'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Plus size={20} />
              Add Points
            </button>
            <button
              type="button"
              onClick={() => setMode('deduct')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                mode === 'deduct'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Minus size={20} />
              Deduct Points
            </button>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Amount <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="Enter points amount"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
            required
          />
          {pointsValue > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              {mode === 'add' ? '+' : '-'}{pointsValue} points
            </p>
          )}
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Reason <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Compensation for service issue"
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Internal Note */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Internal Note (Optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add any additional context for internal records..."
            rows={3}
            className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={mode === 'deduct' ? 'danger' : 'primary'}
            loading={loading}
            disabled={!points || !reason.trim()}
          >
            {mode === 'add' ? 'Add' : 'Deduct'} {pointsValue > 0 ? pointsValue : ''} Points
          </Button>
        </div>
      </form>
    </Modal>
  );
}
