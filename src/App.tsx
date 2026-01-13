import { HashRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import DecksPage from './pages/DecksPage';
import ReviewPage from './pages/ReviewPage';
import SettingsPage from './pages/SettingsPage';
import KeybindsPage from './pages/KeybindsPage';
import { SettingsProvider } from './state/settings';
import { KeybindsProvider } from './context/KeybindsProvider';
import './styles.css';
import logo from '../assets/logo.png';
import ErrorBoundary from './components/ErrorBoundary';

import StatsPage from './pages/StatsPage';
import CollectionPage from './pages/CollectionPage';
import ManualAddPage from './pages/ManualAddPage';
import EditCardPage from './pages/EditCardPage'; // <-- NEW
import ManageDeckPage from './pages/ManageDeckPage';
import { useEffect, useRef, useState } from 'react';
import ForcedAnswersPage from './pages/ForcedAnswersPage';
import AutoAddPage from './pages/AutoAddPage';

declare global {
  interface Window {
    zoom?: {
      getFactor: () => number;
      setFactor: (f: number) => number;
      in: (step?: number) => number;
      out: (step?: number) => number;
      reset: () => number;
    };
  }
}

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!addMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!addMenuRef.current) return;
      const target = e.target as Node | null;
      if (target && addMenuRef.current.contains(target)) return;
      setAddMenuOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAddMenuOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [addMenuOpen]);

  const handleAutoAdd = () => {
    setAddMenuOpen(false);
    navigate('/auto-add');
  };

  const linkStyle = { textDecoration: 'none' as const };

  return (
    <>
    <header className="header">
      <img
        src={logo}
        alt="Chess Flashcards logo"
        style={{ width: 45, height: 45, borderRadius: 4 }}
      />
      <div className="brand">Chess Flashcards</div>
      <div style={{ flex: 1 }} />
      <nav className="header-actions">
        <Link to="/" className="button secondary" style={linkStyle}>Home</Link>
        <Link to="/stats" className="button secondary" style={linkStyle}>Stats</Link>
        <Link to="/collection" className="button secondary" style={linkStyle}>Collection</Link>
        <div ref={addMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="button secondary"
            onClick={() => setAddMenuOpen(prev => !prev)}
            aria-expanded={addMenuOpen}
          >
            <span>Add</span>
            <span style={{ fontSize: 12, opacity: 0.8 }}>▾</span>
          </button>
          {addMenuOpen && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: 'var(--panel)', border: '1px solid var(--border-strong)', borderRadius: 8, minWidth: 220, maxHeight: '40vh', overflowY: 'auto', boxShadow: '0 6px 16px rgba(0,0,0,0.25)', padding: 6, zIndex: 5 }}>
              <button
                type="button"
                onClick={() => handleAutoAdd()}
                style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', color: 'inherit', padding: '8px 10px', borderRadius: 6, cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 600 }}>Auto Add</div>
                <div className="sub" style={{ marginTop: 2 }}>Scan recent games and add cards automatically</div>
              </button>
              <button
                type="button"
                onClick={() => { setAddMenuOpen(false); navigate('/manual-add'); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', color: 'inherit', padding: '8px 10px', borderRadius: 6, cursor: 'pointer', marginTop: 6 }}
              >
                <div style={{ fontWeight: 600 }}>Manual Add</div>
                <div className="sub" style={{ marginTop: 2 }}>Create a card by entering the position yourself</div>
              </button>
            </div>
          )}
        </div>
        <Link to="/settings" state={{ from: location }} className="button secondary" style={linkStyle}>Settings</Link>
      </nav>
    </header>
    </>
  );
}

function useZoomShortcuts() {
  useEffect(() => {
    if (!window.zoom) return;

    const STEP = 0.05, MIN = 0.25, MAX = 5.0;
    const clamp = (f: number) => Math.max(MIN, Math.min(MAX, f));
    const set = (f: number) => window.zoom!.setFactor(clamp(f));
    const get = () => window.zoom!.getFactor();

    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const isZoomIn = e.key === '+' || e.key === '=' || e.code === 'Equal' || e.code === 'NumpadAdd';
      const isZoomOut = e.key === '-' || e.code === 'Minus' || e.code === 'NumpadSubtract';
      const isReset = e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0';
      if (isZoomIn) { e.preventDefault(); set(get() + STEP); }
      else if (isZoomOut) { e.preventDefault(); set(get() - STEP); }
      else if (isReset) { e.preventDefault(); window.zoom!.reset(); }
    };

    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      set(get() + dir * STEP);
    };
    const onMouseWheel = (e: any) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const dir = e.wheelDelta > 0 ? 1 : -1;
      set(get() + dir * STEP);
    };

    window.addEventListener('keydown', onKey, { capture: true });
    window.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('mousewheel', onMouseWheel as any, { passive: false });
    document.addEventListener('mousewheel', onMouseWheel as any, { passive: false });

    return () => {
      window.removeEventListener('keydown', onKey, { capture: true } as any);
      window.removeEventListener('wheel', onWheel as any);
      document.removeEventListener('wheel', onWheel as any);
      window.removeEventListener('mousewheel', onMouseWheel as any);
      document.removeEventListener('mousewheel', onMouseWheel as any);
    };
  }, []);
}

export default function App() {
  useZoomShortcuts();

  // Global text sanitization to fix mojibake from smart quotes/ellipses
  useEffect(() => {
    const map: Record<string, string> = {
      'â€™': "'",
      'â€˜': "'",
      'â€œ': '"',
      'â€': '"',
      'â€': '"',
      'â€“': '-',
      'â€”': '--',
      'â€¦': '...',
    } as any;
    const many = Object.keys(map);
    const fixNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        let t = (node.textContent || '');
        for (const k of many) { if (t.includes(k)) t = t.split(k).join(map[k]); }
        if (t !== node.textContent) node.textContent = t;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        for (const child of Array.from(node.childNodes)) fixNode(child);
      }
    };
    try { fixNode(document.body); } catch {}
  }, []);

  // Normalize any mojibake occurrences across the app (apostrophes/ellipses)
  useEffect(() => {
    const demojibake = (s: string): string => {
      try {
        // Convert UTF-8 bytes mis-read as Latin-1 back to Unicode (e.g., â€™ -> ’)
        return decodeURIComponent(escape(s));
      } catch { return s; }
    };
    const normalize = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const cur = node.textContent || '';
        const fixed = demojibake(cur)
          .replace(/\u2018|\u2019/g, "'")
          .replace(/\u201C|\u201D/g, '"')
          .replace(/\u2026/g, '...')
          .replace(/\u2013/g, '-')
          .replace(/\u2014/g, '--');
        if (fixed !== cur) node.textContent = fixed;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        for (const child of Array.from(node.childNodes)) normalize(child);
      }
    };
    try { normalize(document.body); } catch {}
    const mo = new MutationObserver(muts => {
      for (const m of muts) {
        m.addedNodes && m.addedNodes.forEach(n => normalize(n));
        if (m.type === 'characterData' && m.target) normalize(m.target as Node);
      }
    });
    try { mo.observe(document.body, { childList: true, characterData: true, subtree: true }); } catch {}
    return () => { try { mo.disconnect(); } catch {} };
  }, []);

  // Keep a CSS var of the app header height for sticky page titles
  useEffect(() => {
    const updateVar = () => {
      const header = document.querySelector('.header') as HTMLElement | null;
      const h = header ? header.getBoundingClientRect().height : 0;
      document.documentElement.style.setProperty('--app-header-offset', `${Math.round(h)}px`);
    };
    updateVar();
    window.addEventListener('resize', updateVar);
    return () => window.removeEventListener('resize', updateVar);
  }, []);

  return (
    <SettingsProvider>
      <KeybindsProvider>
        <HashRouter>
          <div className="app">
            <Header />
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<DecksPage />} />
                <Route path="/review/:deckId" element={<ReviewPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/keybinds" element={<KeybindsPage />} />
                <Route path="/settings/forced-answers" element={<ForcedAnswersPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/collection" element={<CollectionPage />} />
                <Route path="/auto-add" element={<AutoAddPage />} />
                <Route path="/manual-add" element={<ManualAddPage />} />
                <Route path="/edit/:cardId" element={<EditCardPage />} /> {/* NEW */}
                <Route path="/manage/:deckId" element={<ManageDeckPage />} />
              </Routes>
            </ErrorBoundary>
          </div>
        </HashRouter>
      </KeybindsProvider>
    </SettingsProvider>
  );
}
