import {
  useState,
  useEffect,
  useRef,
  type FC,
  type FormEvent,
  type ChangeEvent,
} from 'react';
import { listProfiles, runEvaluation } from '../api';
import type { PolicyProfile, EvaluationReport } from '@procura/shared';
import ReportDisplay from './ReportDisplay';

type Status = 'idle' | 'loading' | 'error';

const EvaluationView: FC = () => {
  const [profiles, setProfiles] = useState<PolicyProfile[]>([]);
  const [profilesError, setProfilesError] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listProfiles()
      .then(setProfiles)
      .catch((e: unknown) =>
        setProfilesError(e instanceof Error ? e.message : 'Failed to load profiles'),
      );
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    setReport(null);
    try {
      const result = await runEvaluation({
        documentText,
        policyProfileId: selectedProfileId,
      });
      setReport(result);
      setStatus('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
      setStatus('error');
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setDocumentText((ev.target?.result as string) ?? '');
    reader.readAsText(file);
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h1 className="text-xl font-semibold text-white">Evaluate Vendor</h1>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">Policy profile</label>
          {profilesError ? (
            <p className="text-red-400 text-sm">{profilesError}</p>
          ) : (
            <select
              required
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className={inputCls}
            >
              <option value="">Select a profile…</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">
            Vendor documentation
          </label>
          <textarea
            required
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            rows={10}
            placeholder="Paste vendor documentation here…"
            className={`${inputCls} resize-y font-mono text-xs leading-relaxed`}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">or</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-indigo-400 underline underline-offset-2"
            >
              upload a .txt file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {status === 'error' && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded font-medium text-sm transition-colors"
        >
          {status === 'loading' ? 'Running evaluation…' : 'Run evaluation'}
        </button>
      </form>

      {status === 'loading' && (
        <p className="text-slate-500 text-sm">
          Calling policy-check tools and analysing documentation…
        </p>
      )}

      {report && <ReportDisplay report={report} />}
    </div>
  );
};

const inputCls =
  'w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500';

export default EvaluationView;
