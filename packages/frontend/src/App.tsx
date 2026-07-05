import { useState, type FC } from 'react';
import PolicyProfileForm from './components/PolicyProfileForm';
import EvaluationView from './components/EvaluationView';

type View = 'profiles' | 'evaluate';

const TABS: { id: View; label: string }[] = [
  { id: 'profiles', label: 'Policy Profiles' },
  { id: 'evaluate', label: 'Evaluate' },
];

const App: FC = () => {
  const [view, setView] = useState<View>('profiles');

  return (
    <div className="min-h-screen bg-[#0c0e14] text-slate-200">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-8">
        <span className="font-semibold text-white tracking-tight">Procura</span>
        <nav className="flex gap-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                view === id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        {view === 'profiles' ? <PolicyProfileForm /> : <EvaluationView />}
      </main>
    </div>
  );
};

export default App;
