import { useState, useEffect } from 'react';
import { useTournamentStore } from './store/tournamentStore';
import { getStateFromUrl, clearStateFromUrl } from './utils/stateEncoder';
import { TournamentSetup } from './components/Setup/TournamentSetup';
import { SparringSetup } from './components/Setup/SparringSetup';
import { TournamentList } from './components/Dashboard/TournamentList';
import { CurrentMatch } from './components/Tournament/CurrentMatch';
import { Schedule } from './components/Tournament/Schedule';
import { Standings } from './components/Tournament/Standings';
import { ChangeLog } from './components/History/ChangeLog';
import { PlayerProfile } from './components/Player/PlayerProfile';
import { ShareModal } from './components/Sync/ShareModal';
import { Tabs } from './components/UI/Tabs';
import { ContentErrorBoundary } from './components/ErrorBoundary';

const ALL_TABS = [
  { id: 'match', icon: '\u{1F3BE}', label: 'Mecz' },
  { id: 'schedule', icon: '\u{1F4CB}', label: 'Mecze' },
  { id: 'standings', icon: '\u{1F3C6}', label: 'Tabela' },
  { id: 'history', icon: '\u{1F4DC}', label: 'Historia' }
];

const DUEL_TABS = [
  { id: 'match', icon: '\u{1F3BE}', label: 'Mecz' },
  { id: 'history', icon: '\u{1F4DC}', label: 'Historia' }
];

function App() {
  const { status, importState, resetTournament, goToDashboard, name, location, date, createdAt, players, gameType, syncStatus, endTournament } = useTournamentStore();
  const isSparring = gameType === 'sparring';
  const TABS = isSparring ? DUEL_TABS : ALL_TABS;

  const [activeTab, setActiveTab] = useState('match');
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [tabTransition, setTabTransition] = useState(false);

  // Check for imported state on mount
  useEffect(() => {
    const urlState = getStateFromUrl();
    if (urlState) {
      if (window.confirm('Znaleziono turniej w linku. Czy chcesz go zaimportowac?')) {
        try {
          importState(urlState);
        } catch (e) {
          window.alert(e.message || 'Nie udało się zaimportować turnieju');
        }
      }
      clearStateFromUrl();
    }
  }, [importState]);

  const handlePlayerClick = (playerId) => {
    setSelectedPlayerId(playerId);
  };

  const handleGoToDashboard = () => {
    goToDashboard();
  };

  const handleTabChange = (tabId) => {
    if (tabId !== activeTab) {
      setTabTransition(true);
      setTimeout(() => {
        setActiveTab(tabId);
        setTabTransition(false);
      }, 150);
    }
  };

  // Show dashboard (tournament list)
  if (status === 'dashboard') {
    return <TournamentList />;
  }

  // Show setup screen
  if (status === 'setup') {
    return gameType === 'sparring' ? <SparringSetup /> : <TournamentSetup />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex flex-col safe-bottom">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-tennis-600 focus:text-white focus:rounded-lg focus:font-semibold focus:shadow-lg"
      >
        Przejdź do treści
      </a>

      {/* Desktop Layout with Sidebar Banner */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar with Tournament Banner */}
        <aside className="hidden xl:block w-80 flex-shrink-0 bg-gradient-to-b from-tennis-800 to-tennis-900 relative overflow-hidden">
          {/* Tournament Banner Image */}
          <div className="absolute inset-0">
            <img
              src="./image-turniej.jpeg"
              alt="Turniej Tenisowy"
              className="w-full h-full object-cover opacity-30"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-tennis-900/80 via-tennis-800/90 to-tennis-900" />
          </div>

          {/* Sidebar Content */}
          <div className="relative z-10 p-6 h-full flex flex-col">
            {/* Logo/Title */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-2xl border border-white/20 mb-4">
                <span className="text-4xl" role="img" aria-label="Tennis">{'\u{1F3BE}'}</span>
              </div>
              <h1 className="font-bold text-xl text-white leading-tight mb-1">{name}</h1>
              {(date || location) && (
                <span className="text-tennis-300 text-sm">
                  {[date, location].filter(Boolean).join(' • ')}
                </span>
              )}
            </div>

            {/* Quick Stats */}
            <div className="space-y-3 flex-1">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="text-tennis-200 text-sm mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-white font-medium">{status === 'completed' ? 'Zakończony' : 'W toku'}</span>
                </div>
              </div>

              {location && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                  <div className="text-tennis-200 text-sm mb-1">Lokalizacja</div>
                  <div className="text-white font-medium">{location}</div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t border-white/10">
              <button
                onClick={() => setShowShare(true)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Udostępnij turniej</span>
              </button>
              {status !== 'completed' && (
                <button
                  onClick={() => { if (window.confirm('Zakończyć turniej?')) endTournament(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-xl text-yellow-300 hover:text-white transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Zakończ turniej</span>
                </button>
              )}
              <button
                onClick={handleGoToDashboard}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-xl text-tennis-300 hover:text-white transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
                <span>Wszystkie turnieje</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile/Tablet Header — sticky */}
          <header className="xl:hidden header-premium sticky top-0 z-30 text-white px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleGoToDashboard}
                className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
                aria-label="Wróć do listy turniejów"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="font-bold text-lg truncate max-w-[180px] leading-tight">{name}</h1>
                <span className="text-tennis-200 text-xs">{status === 'completed' ? 'Zakończony' : 'W toku'}</span>
              </div>
            </div>
            {/* Sync indicator */}
            {syncStatus === 'syncing' && (
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="Synchronizacja..." />
            )}
            {syncStatus === 'synced' && (
              <div className="w-2 h-2 bg-green-400 rounded-full" title="Zsynchronizowano" />
            )}
            {syncStatus === 'error' && (
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" title="Błąd synchronizacji" />
            )}
            <button
              onClick={() => setShowShare(true)}
              className="p-3 hover:bg-white/10 active:bg-white/20 rounded-xl transition-all duration-200 active:scale-95"
              aria-label="Udostępnij"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </header>

          {/* Desktop Top Navigation */}
          <nav className="hidden xl:block bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Nawigacja turnieju">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                  id={`desktop-tab-${tab.id}`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200
                    ${activeTab === tab.id
                      ? 'bg-tennis-100 text-tennis-700'
                      : 'text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Main Content with tab transition */}
          <main
            id="main-content"
            role="tabpanel"
            aria-labelledby={`tab-${activeTab} desktop-tab-${activeTab}`}
            className={`flex-1 flex flex-col overflow-hidden transition-opacity duration-150 pb-16 xl:pb-0 ${tabTransition ? 'opacity-0' : 'opacity-100'}`}
          >
            <ContentErrorBoundary>
              {activeTab === 'match' && (
                <CurrentMatch onPlayerClick={handlePlayerClick} />
              )}
              {activeTab === 'schedule' && (
                <Schedule onPlayerClick={handlePlayerClick} />
              )}
              {activeTab === 'standings' && (
                <Standings onPlayerClick={handlePlayerClick} />
              )}
              {activeTab === 'history' && (
                <ChangeLog />
              )}
            </ContentErrorBoundary>
          </main>

          {/* Bottom Navigation - Mobile only — fixed */}
          <nav className="xl:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-lg border-t border-gray-200/50 safe-bottom shadow-lg shadow-black/5">
            <Tabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />
          </nav>
        </div>
      </div>

      {/* Modals */}
      <PlayerProfile
        playerId={selectedPlayerId}
        isOpen={!!selectedPlayerId}
        onClose={() => setSelectedPlayerId(null)}
      />

      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} />

    </div>
  );
}

export default App;
