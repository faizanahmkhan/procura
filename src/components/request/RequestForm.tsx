import { useState, type FC, type FormEvent, type ChangeEvent } from 'react';
import type { ToolRequest, ToolCategory, DataSensitivity } from '../../types';
import Header from '../layout/Header';

interface RequestFormProps {
  onSubmit: (req: ToolRequest) => void;
  onCancel: () => void;
}

const CATEGORIES: ToolCategory[] = [
  'AI Coding',
  'AI Chat / LLM',
  'AI Search',
  'AI Image/Video',
  'AI Voice',
  'Data / Analytics',
  'Productivity',
  'Other',
];

const SENSITIVITIES: DataSensitivity[] = [
  'Public only',
  'Internal documents',
  'Code / IP',
  'Customer data',
  'PII',
];

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Operations',
  'Finance',
  'HR',
  'Legal',
  'Security / IT',
  'Other',
];

interface FormState {
  tool: string;
  vendor: string;
  cat: ToolCategory;
  cost: string;
  dept: string;
  dataSens: DataSensitivity;
  usage: string;
  justification: string;
}

const INITIAL_STATE: FormState = {
  tool: '',
  vendor: '',
  cat: 'AI Chat / LLM',
  cost: '',
  dept: '',
  dataSens: 'Public only',
  usage: '',
  justification: '',
};

function generateId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function fieldCls(hasError: boolean): string {
  return `w-full bg-[#0d1018] border rounded-md px-3 py-2 text-[13px] text-[#c8d8e8] placeholder:text-[#2a4050] focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
    hasError ? 'border-red-500/50 bg-red-500/5' : 'border-[#1a2035]'
  }`;
}

interface FieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

const Field: FC<FieldProps> = ({ label, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[12px] font-medium text-[#7a90a8] uppercase tracking-wide">{label}</label>
    {children}
    {error && <p className="text-[11px] text-red-400">{error}</p>}
  </div>
);

const RequestForm: FC<RequestFormProps> = ({ onSubmit, onCancel }) => {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const set =
    (field: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.tool.trim()) next.tool = 'Tool name is required.';
    if (!form.vendor.trim()) next.vendor = 'Vendor is required.';
    if (!form.dept.trim()) next.dept = 'Department is required.';
    if (!form.cost || isNaN(Number(form.cost)) || Number(form.cost) < 0)
      next.cost = 'Enter a valid annual cost (0 or more).';
    if (!form.usage.trim()) next.usage = 'Describe the intended usage.';
    if (!form.justification.trim()) next.justification = 'Business justification is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const req: ToolRequest = {
      id: generateId(),
      tool: form.tool.trim(),
      vendor: form.vendor.trim(),
      cat: form.cat,
      cost: Number(form.cost),
      dept: form.dept.trim(),
      dataSens: form.dataSens,
      usage: form.usage.trim(),
      justification: form.justification.trim(),
      status: 'Pending',
      submittedAt: new Date().toISOString(),
      resolvedAt: null,
      reason: null,
      aiAnalysis: null,
    };

    onSubmit(req);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header
        title="New Tool Request"
        subtitle="Submit an AI tool for governance review"
        action={
          <button
            onClick={onCancel}
            className="text-[13px] text-[#7a90a8] hover:text-white border border-[#1a2035] hover:border-[#2a3850] px-4 py-2 rounded-md transition-colors"
          >
            Cancel
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
          <div className="bg-[#13161f] border border-[#1a2035] rounded-lg p-5 space-y-5">
            <p className="text-[11px] font-semibold text-[#3d5870] uppercase tracking-wider">
              Tool Details
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Tool Name" error={errors.tool}>
                <input
                  type="text"
                  value={form.tool}
                  onChange={set('tool')}
                  placeholder="e.g. GitHub Copilot"
                  className={fieldCls(!!errors.tool)}
                />
              </Field>

              <Field label="Vendor" error={errors.vendor}>
                <input
                  type="text"
                  value={form.vendor}
                  onChange={set('vendor')}
                  placeholder="e.g. GitHub / Microsoft"
                  className={fieldCls(!!errors.vendor)}
                />
              </Field>

              <Field label="Category">
                <select value={form.cat} onChange={set('cat')} className={fieldCls(false)}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>

              <Field label="Annual Cost ($)" error={errors.cost}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.cost}
                  onChange={set('cost')}
                  placeholder="e.g. 1200"
                  className={fieldCls(!!errors.cost)}
                />
              </Field>

              <Field label="Department" error={errors.dept}>
                <select value={form.dept} onChange={set('dept')} className={fieldCls(!!errors.dept)}>
                  <option value="">Select department…</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>

              <Field label="Data Sensitivity">
                <select
                  value={form.dataSens}
                  onChange={set('dataSens')}
                  className={fieldCls(false)}
                >
                  {SENSITIVITIES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="bg-[#13161f] border border-[#1a2035] rounded-lg p-5 space-y-4">
            <p className="text-[11px] font-semibold text-[#3d5870] uppercase tracking-wider">
              Justification
            </p>

            <Field label="Intended Usage" error={errors.usage}>
              <textarea
                value={form.usage}
                onChange={set('usage')}
                rows={3}
                placeholder="Describe how the tool will be used day-to-day…"
                className={`${fieldCls(!!errors.usage)} resize-none`}
              />
            </Field>

            <Field label="Business Justification" error={errors.justification}>
              <textarea
                value={form.justification}
                onChange={set('justification')}
                rows={4}
                placeholder="Explain the business case, expected ROI, or time savings…"
                className={`${fieldCls(!!errors.justification)} resize-none`}
              />
            </Field>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-6 py-2.5 rounded-md text-[13px] transition-colors"
            >
              Submit Request
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="border border-[#1a2035] text-[#7a90a8] hover:text-white hover:bg-[#0f1320] font-medium px-6 py-2.5 rounded-md text-[13px] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestForm;
