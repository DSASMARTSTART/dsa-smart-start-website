
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Tag, Percent, DollarSign, Calendar, Users, ToggleLeft, ToggleRight, X, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_discount: number | null;
  min_order_amount: number | null;
  max_uses: number | null;
  times_used: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface AdminDiscountCodesProps {
  onNavigate: (path: string) => void;
}

const AdminDiscountCodes: React.FC<AdminDiscountCodesProps> = ({ onNavigate }) => {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 10,
    max_discount: '',
    min_order_amount: '',
    max_uses: '',
    expires_at: '',
    is_active: true,
  });

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          setError('Discount codes table not found. Please run the schema.sql in Supabase.');
        } else {
          throw error;
        }
      } else {
        setCodes(data || []);
      }
    } catch (err) {
      console.error('Error loading discount codes:', err);
      setError('Failed to load discount codes');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 10,
      max_discount: '',
      min_order_amount: '',
      max_uses: '',
      expires_at: '',
      is_active: true,
    });
    setEditingCode(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (code: DiscountCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      description: code.description || '',
      discount_type: code.discount_type,
      discount_value: code.discount_value,
      max_discount: code.max_discount?.toString() || '',
      min_order_amount: code.min_order_amount?.toString() || '',
      max_uses: code.max_uses?.toString() || '',
      expires_at: code.expires_at ? code.expires_at.split('T')[0] : '',
      is_active: code.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim()) {
      setError('Code is required');
      return;
    }
    if (formData.discount_value <= 0) {
      setError('Discount value must be greater than 0');
      return;
    }
    if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
      setError('Percentage discount cannot exceed 100%');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || null,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
        min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        is_active: formData.is_active,
      };

      if (editingCode) {
        // Update existing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('discount_codes')
          .update(payload)
          .eq('id', editingCode.id);

        if (error) throw error;
      } else {
        // Create new
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('discount_codes')
          .insert(payload);

        if (error) {
          if (error.code === '23505') {
            setError('A code with this name already exists');
            setSaving(false);
            return;
          }
          throw error;
        }
      }

      setShowModal(false);
      resetForm();
      loadCodes();
    } catch (err) {
      console.error('Error saving discount code:', err);
      setError('Failed to save discount code');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (code: DiscountCode) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('discount_codes')
        .update({ is_active: !code.is_active })
        .eq('id', code.id);

      if (error) throw error;
      loadCodes();
    } catch (err) {
      console.error('Error toggling code:', err);
    }
  };

  const deleteCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount code?')) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('discount_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadCodes();
    } catch (err) {
      console.error('Error deleting code:', err);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isExpired = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Discount Codes</h1>
          <p className="text-gray-500 mt-1">Create and manage promotional discount codes</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors shadow-lg shadow-purple-100"
        >
          <Plus size={18} />
          Create Code
        </button>
      </div>

      {error && !showModal && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600">
          <AlertCircle size={18} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Codes Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Code</th>
              <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Discount</th>
              <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Usage</th>
              <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Expires</th>
              <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
              <th className="text-right py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                      <Tag size={24} className="text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">No discount codes yet</p>
                    <p className="text-gray-400 text-sm mt-1">Create your first code to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              codes.map((code) => (
                <tr key={code.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${code.is_active ? 'bg-purple-100' : 'bg-gray-100'}`}>
                        <Tag size={16} className={code.is_active ? 'text-purple-600' : 'text-gray-400'} />
                      </div>
                      <div>
                        <p className="font-black text-gray-900 tracking-wide">{code.code}</p>
                        {code.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{code.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {code.discount_type === 'percentage' ? (
                        <>
                          <Percent size={14} className="text-green-500" />
                          <span className="font-bold text-gray-900">{code.discount_value}% OFF</span>
                        </>
                      ) : (
                        <>
                          <DollarSign size={14} className="text-green-500" />
                          <span className="font-bold text-gray-900">€{code.discount_value} OFF</span>
                        </>
                      )}
                    </div>
                    {code.min_order_amount && (
                      <p className="text-[10px] text-gray-400 mt-1">Min. order: €{code.min_order_amount}</p>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-gray-400" />
                      <span className="font-bold text-gray-900">
                        {code.times_used}
                        {code.max_uses && <span className="text-gray-400 font-normal"> / {code.max_uses}</span>}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className={`flex items-center gap-2 ${isExpired(code.expires_at) ? 'text-red-500' : 'text-gray-600'}`}>
                      <Calendar size={14} />
                      <span className="font-medium text-sm">{formatDate(code.expires_at)}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => toggleActive(code)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        code.is_active 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {code.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {code.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(code)}
                        className="p-2 hover:bg-purple-100 rounded-lg text-gray-400 hover:text-purple-600 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteCode(code.id)}
                        className="p-2 hover:bg-red-100 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl">
              <h2 className="text-xl font-black text-gray-900">
                {editingCode ? 'Edit Discount Code' : 'Create Discount Code'}
              </h2>
              <button
                onClick={() => { setShowModal(false); resetForm(); setError(null); }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Code */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                  Discount Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SUMMER25"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all font-bold uppercase tracking-wide"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Summer sale discount"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                    Discount Type
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all font-bold"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (€)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                    {formData.discount_type === 'percentage' ? 'Percentage Off' : 'Amount Off (€)'}
                  </label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max={formData.discount_type === 'percentage' ? 100 : undefined}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all font-bold"
                  />
                </div>
              </div>

              {/* Max Discount (for percentage) */}
              {formData.discount_type === 'percentage' && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                    Maximum Discount Cap (€) - Optional
                  </label>
                  <input
                    type="number"
                    value={formData.max_discount}
                    onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                    placeholder="e.g., 50 (limits discount to max €50)"
                    min="0"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                  />
                </div>
              )}

              {/* Min Order Amount */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                  Minimum Order Amount (€) - Optional
                </label>
                <input
                  type="number"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                  placeholder="e.g., 100"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                />
              </div>

              {/* Max Uses */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                  Usage Limit - Optional
                </label>
                <input
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  min="1"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">
                  Expiration Date - Optional
                </label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-bold text-gray-900">Active</p>
                  <p className="text-xs text-gray-500">Code can be used by customers</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`w-12 h-7 rounded-full transition-colors relative ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white rounded-b-3xl">
              <button
                onClick={() => { setShowModal(false); resetForm(); setError(null); }}
                className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    {editingCode ? 'Update Code' : 'Create Code'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDiscountCodes;
