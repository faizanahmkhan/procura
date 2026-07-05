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
    <div className="app">
      <header className="app-header">
        <span className="app-brand">Procura</span>
        <nav className="app-nav">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={view === id ? 'nav-tab nav-tab-active' : 'nav-tab'}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-main">
        {view === 'profiles' ? <PolicyProfileForm /> : <EvaluationView />}
      </main>
    </div>
  );
};

export default App;
