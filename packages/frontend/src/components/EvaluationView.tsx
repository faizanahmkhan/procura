import { useEffect, useState, type FC, type FormEvent } from 'react';
import type { PolicyProfile, EvaluationReport } from '@procura/shared';
import { listProfiles, createEvaluation } from '../api';
import ReportDisplay from './ReportDisplay';

type Status = 'idle' | 'running' | 'error';

const EvaluationView: FC = () => {
  const [profiles, setProfiles] = useState<PolicyProfile[]>([]);
  const [profilesError, setProfilesError] = useState('');
  const [profileId, setProfileId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [report, setReport] = useState<EvaluationReport | null>(null);

  useEffect(() => {
    listProfiles()
      .then(setProfiles)
      .catch((err: unknown) =>
        setProfilesError(err instanceof Error ? err.message : 'Failed to load profiles'),
      );
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('running');
    setError('');
    setReport(null);
    try {
      const result = await createEvaluation({
        policyProfileId: profileId,
        vendorName,
        vendorDocumentation: documentText,
      });
      setReport(result);
      setStatus('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
      setStatus('error');
    }
  }

  return (
    <section>
      <form className="form" onSubmit={handleSubmit}>
        <h1>Evaluate a vendor</h1>

        <div className="field">
          <label htmlFor="eval-profile">Policy profile</label>
          {profilesError ? (
            <p className="error-text">{profilesError}</p>
          ) : (
            <select
              id="eval-profile"
              required
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
            >
              <option value="" disabled>
                {profiles.length === 0 ? 'No saved profiles' : 'Select a profile…'}
              </option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="field">
          <label htmlFor="eval-vendor">Vendor name</label>
          <input
            id="eval-vendor"
            type="text"
            required
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="e.g. Acme AI Ltd"
          />
        </div>

        <div className="field">
          <label htmlFor="eval-doc">Vendor documentation</label>
          <textarea
            id="eval-doc"
            required
            rows={12}
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder="Paste vendor documentation text here…"
          />
        </div>

        {status === 'error' && <p className="error-text">{error}</p>}

        <button type="submit" className="btn" disabled={status === 'running'}>
          {status === 'running' ? 'Evaluating…' : 'Run evaluation'}
        </button>
      </form>

      {status === 'running' && (
        <p className="muted">Running policy checks and analysing documentation…</p>
      )}

      {report && <ReportDisplay report={report} />}
    </section>
  );
};

export default EvaluationView;
