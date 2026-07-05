import { useState, type FC, type FormEvent, type ReactNode } from 'react';
import { createProfile } from '../api';
import type { PolicyProfile } from '@procura/shared';

const CERTIFICATIONS = ['ISO 27001', 'SOC 2', 'Cyber Essentials', 'PCI DSS', 'GDPR Compliant'];
const REGIONS = ['uk', 'eu', 'us', 'global'] as const;
const BANDINGS = ['low', 'medium', 'high'] as const;

type Status = 'idle' | 'loading' | 'success' | 'error';

const PolicyProfileForm: FC = () => {
  const [name, setName] = useState('');
  const [region, setRegion] = useState<string>('uk');
  const [certs, setCerts] = useState<string[]>([]);
  const [costBanding, setCostBanding] = useState<PolicyProfile['costBanding']>('medium');
  const [lockInTolerance, setLockInTolerance] =
    useState<PolicyProfile['vendorLockInTolerance']>('medium');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [created, setCreated] = useState<PolicyProfile | null>(null);

  function toggleCert(cert: string) {
    setCerts((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const profile = await createProfile({
        name,
        dataResidencyRegion: region,
        requiredCertifications: certs,
        costBanding,
        vendorLockInTolerance: lockInTolerance,
      });
      setCreated(profile);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
      setStatus('error');
    }
  }

  function reset() {
    setStatus('idle');
    setCreated(null);
    setName('');
    setCerts([]);
    setCostBanding('medium');
    setLockInTolerance('medium');
    setRegion('uk');
    setError('');
  }

  if (status === 'success' && created) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-700 bg-emerald-950/40 p-4">
          <p className="text-emerald-400 font-medium">Profile saved</p>
          <p className="text-slate-400 text-sm mt-1 font-mono">{created.id}</p>
        </div>
        <button
          onClick={reset}
          className="text-sm text-slate-400 underline underline-offset-2"
        >
          Create another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h1 className="text-xl font-semibold text-white">New Policy Profile</h1>

      <Field label="Organisation name">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="e.g. Ministry of Justice"
        />
      </Field>

      <Field label="Required data residency region">
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className={inputCls}
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r.toUpperCase()}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Required security certifications">
        <div className="grid grid-cols-2 gap-2 pt-1">
          {CERTIFICATIONS.map((cert) => (
            <label
              key={cert}
              className="flex items-center gap-2 text-sm cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={certs.includes(cert)}
                onChange={() => toggleCert(cert)}
                className="accent-indigo-500 h-4 w-4"
              />
              <span className="text-slate-300">{cert}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="Cost banding">
        <select
          value={costBanding}
          onChange={(e) => setCostBanding(e.target.value as PolicyProfile['costBanding'])}
          className={inputCls}
        >
          {BANDINGS.map((b) => (
            <option key={b} value={b}>
              {capitalise(b)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Vendor lock-in tolerance">
        <select
          value={lockInTolerance}
          onChange={(e) =>
            setLockInTolerance(e.target.value as PolicyProfile['vendorLockInTolerance'])
          }
          className={inputCls}
        >
          {BANDINGS.map((b) => (
            <option key={b} value={b}>
              {capitalise(b)}
            </option>
          ))}
        </select>
      </Field>

      {status === 'error' && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded font-medium text-sm transition-colors"
      >
        {status === 'loading' ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
};

const inputCls =
  'w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500';

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const Field: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-slate-300">{label}</label>
    {children}
  </div>
);

export default PolicyProfileForm;
