import { useState, type FC, type FormEvent } from 'react';
import type { PolicyProfile } from '@procura/shared';
import { createProfile } from '../api';

const REGIONS: { value: string; label: string }[] = [
  { value: 'uk', label: 'UK' },
  { value: 'eu', label: 'EU' },
  { value: 'us', label: 'US' },
];

const CERTIFICATIONS = ['SOC 2', 'ISO 27001', 'Cyber Essentials'];

const BANDINGS = ['low', 'medium', 'high'] as const;

type Status = 'idle' | 'saving' | 'saved' | 'error';

const PolicyProfileForm: FC = () => {
  const [name, setName] = useState('');
  const [region, setRegion] = useState('uk');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [costBanding, setCostBanding] = useState<PolicyProfile['costBanding']>('medium');
  const [lockInTolerance, setLockInTolerance] =
    useState<PolicyProfile['vendorLockInTolerance']>('medium');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<PolicyProfile | null>(null);

  function toggleCertification(cert: string) {
    setCertifications((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError('');
    try {
      const profile = await createProfile({
        name,
        dataResidencyRegion: region,
        requiredCertifications: certifications,
        costBanding,
        vendorLockInTolerance: lockInTolerance,
      });
      setSaved(profile);
      setStatus('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
      setStatus('error');
    }
  }

  function reset() {
    setName('');
    setRegion('uk');
    setCertifications([]);
    setCostBanding('medium');
    setLockInTolerance('medium');
    setStatus('idle');
    setError('');
    setSaved(null);
  }

  if (status === 'saved' && saved) {
    return (
      <section>
        <div className="notice notice-success">
          <p className="notice-title">Profile saved</p>
          <p className="notice-detail">
            {saved.name} · <code>{saved.id}</code>
          </p>
        </div>
        <button type="button" className="btn-link" onClick={reset}>
          Create another profile
        </button>
      </section>
    );
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h1>New policy profile</h1>

      <div className="field">
        <label htmlFor="profile-name">Profile name</label>
        <input
          id="profile-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Standard procurement policy"
        />
      </div>

      <div className="field">
        <label htmlFor="profile-region">Required data residency region</label>
        <select
          id="profile-region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="field">
        <legend>Required security certifications</legend>
        {CERTIFICATIONS.map((cert) => (
          <label key={cert} className="checkbox-label">
            <input
              type="checkbox"
              checked={certifications.includes(cert)}
              onChange={() => toggleCertification(cert)}
            />
            {cert}
          </label>
        ))}
      </fieldset>

      <div className="field">
        <label htmlFor="profile-cost">Cost banding</label>
        <select
          id="profile-cost"
          value={costBanding}
          onChange={(e) => setCostBanding(e.target.value as PolicyProfile['costBanding'])}
        >
          {BANDINGS.map((b) => (
            <option key={b} value={b}>
              {b.charAt(0).toUpperCase() + b.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="profile-lockin">Vendor lock-in tolerance</label>
        <select
          id="profile-lockin"
          value={lockInTolerance}
          onChange={(e) =>
            setLockInTolerance(e.target.value as PolicyProfile['vendorLockInTolerance'])
          }
        >
          {BANDINGS.map((b) => (
            <option key={b} value={b}>
              {b.charAt(0).toUpperCase() + b.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {status === 'error' && <p className="error-text">{error}</p>}

      <button type="submit" className="btn" disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
};

export default PolicyProfileForm;
