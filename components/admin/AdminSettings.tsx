// ============================================
// Admin Settings — Company info, invoicing & VAT, email recipients
// ============================================

import React, { useEffect, useState } from 'react';
import { Save, Building2, FileText, Mail, AlertCircle, CheckCircle2, Plus, X } from 'lucide-react';
import { Button, Input } from './AdminUIComponents';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AppSettings {
  id: string;
  company_legal_name: string;
  company_address: string;
  company_city: string;
  company_postal_code: string;
  company_country: string;
  company_pib: string;
  company_maticni_broj: string;
  company_vat_id: string;
  company_phone: string;
  company_email: string;
  company_iban: string;
  company_bank_name: string;
  vat_registered: boolean;
  vat_rate: number;
  eur_to_rsd_rate: number;
  invoice_number_prefix: string;
  accountant_emails: string[];
  invoice_email_from: string;
  invoice_email_reply_to: string;
  updated_at: string;
}

type Tab = 'company' | 'invoicing' | 'email';

interface AdminSettingsProps {
  onNavigate: (path: string) => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = () => {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('company');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newAccountantEmail, setNewAccountantEmail] = useState('');

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: e } = await (supabase as any)
        .from('app_settings')
        .select('*')
        .eq('id', 'singleton')
        .single();
      if (e) throw e;
      setSettings(data as AppSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = { ...settings, updated_at: new Date().toISOString(), updated_by: profile?.id || null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: e } = await (supabase as any)
        .from('app_settings')
        .update(payload)
        .eq('id', 'singleton');
      if (e) throw e;
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addAccountantEmail = () => {
    if (!settings) return;
    const email = newAccountantEmail.trim();
    if (!email || settings.accountant_emails.includes(email)) return;
    update('accountant_emails', [...settings.accountant_emails, email]);
    setNewAccountantEmail('');
  };

  const removeAccountantEmail = (email: string) => {
    if (!settings) return;
    update('accountant_emails', settings.accountant_emails.filter((e) => e !== email));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{error || 'Settings not available'}</p>
      </div>
    );
  }

  const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    { id: 'company', label: 'Company Info', icon: Building2 },
    { id: 'invoicing', label: 'Invoicing & VAT', icon: FileText },
    { id: 'email', label: 'Email Recipients', icon: Mail },
  ];

  // Helper to preview the next invoice number based on current year
  const year = new Date().getFullYear();
  const previewNumber = `${settings.invoice_number_prefix || ''}${year}-0001`;

  return (
    <div className="px-6 lg:px-12 py-10 max-w-5xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Company information, invoicing rules, and where invoices are sent.
          </p>
        </div>
        <Button onClick={save} disabled={saving} variant="primary">
          <Save size={16} className="mr-2" />
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
          <CheckCircle2 size={18} className="text-green-500 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold uppercase tracking-wide transition-colors whitespace-nowrap border-b-2 ${
                active
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'company' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Legal name" value={settings.company_legal_name} onChange={(e) => update('company_legal_name', e.target.value)} />
            <Input label="Company email" type="email" value={settings.company_email} onChange={(e) => update('company_email', e.target.value)} />
            <Input label="Phone" value={settings.company_phone} onChange={(e) => update('company_phone', e.target.value)} />
            <Input label="PIB (Tax ID)" value={settings.company_pib} onChange={(e) => update('company_pib', e.target.value)} />
            <Input label="Matični broj" value={settings.company_maticni_broj} onChange={(e) => update('company_maticni_broj', e.target.value)} />
            <Input label="VAT ID" value={settings.company_vat_id} onChange={(e) => update('company_vat_id', e.target.value)} />
            <div className="md:col-span-2"><Input label="Address" value={settings.company_address} onChange={(e) => update('company_address', e.target.value)} /></div>
            <Input label="City" value={settings.company_city} onChange={(e) => update('company_city', e.target.value)} />
            <Input label="Postal code" value={settings.company_postal_code} onChange={(e) => update('company_postal_code', e.target.value)} />
            <Input label="Country" value={settings.company_country} onChange={(e) => update('company_country', e.target.value)} />
            <Input label="Bank name" value={settings.company_bank_name} onChange={(e) => update('company_bank_name', e.target.value)} />
            <div className="md:col-span-2"><Input label="IBAN" value={settings.company_iban} onChange={(e) => update('company_iban', e.target.value)} /></div>
          </div>
        </div>
      )}

      {tab === 'invoicing' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.vat_registered}
              onChange={(e) => update('vat_registered', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <div>
              <div className="font-bold text-gray-900">Company is VAT-registered (u sistemu PDV-a)</div>
              <div className="text-xs text-gray-500">When enabled, invoices show a VAT breakdown at the rate below.</div>
            </div>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="VAT rate (%)"
              type="number"
              step="0.01"
              value={String(settings.vat_rate)}
              onChange={(e) => update('vat_rate', parseFloat(e.target.value) || 0)}
              disabled={!settings.vat_registered}
            />
            <Input
              label="EUR → RSD rate"
              type="number"
              step="0.0001"
              value={String(settings.eur_to_rsd_rate)}
              onChange={(e) => update('eur_to_rsd_rate', parseFloat(e.target.value) || 0)}
              hint="Used to display dual currency on invoices"
            />
            <Input
              label="Invoice number prefix"
              value={settings.invoice_number_prefix}
              onChange={(e) => update('invoice_number_prefix', e.target.value)}
              hint={`Next: ${previewNumber}`}
            />
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 leading-relaxed">
            Invoice numbering is sequential per year (resets every January 1). Numbers are allocated atomically and cannot be reused or duplicated.
          </div>
        </div>
      )}

      {tab === 'email' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Sender (From)"
              value={settings.invoice_email_from}
              onChange={(e) => update('invoice_email_from', e.target.value)}
              hint="Must be a verified Resend sender, e.g. 'Eduway Academy <noreply@eduway.academy>'"
            />
            <Input
              label="Reply-To"
              type="email"
              value={settings.invoice_email_reply_to}
              onChange={(e) => update('invoice_email_reply_to', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
              Accountant email recipients (BCC on every invoice)
            </label>
            <div className="space-y-2 mb-4">
              {settings.accountant_emails.length === 0 && (
                <p className="text-sm text-gray-400 italic">No accountant emails configured. Invoices will only be sent to the customer.</p>
              )}
              {settings.accountant_emails.map((email) => (
                <div key={email} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-sm text-gray-900">{email}</span>
                  <button
                    onClick={() => removeAccountantEmail(email)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label={`Remove ${email}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={newAccountantEmail}
                onChange={(e) => setNewAccountantEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAccountantEmail(); } }}
                placeholder="accountant@example.com"
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
              />
              <Button onClick={addAccountantEmail} variant="secondary">
                <Plus size={16} className="mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
