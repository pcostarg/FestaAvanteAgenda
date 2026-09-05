import React from 'react';
import { LayoutGrid, List, BookmarkCheck, Search, WifiOff, X, Share2, Download } from 'lucide-react';

export type ViewMode = 'grelha' | 'lista' | 'horario';

export interface HeaderProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchFocus?: () => void;
  isOffline?: boolean;
  savedCount?: number;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  onOpenExport?: () => void;
  onOpenImport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onViewChange,
  searchQuery,
  onSearchChange,
  onSearchFocus,
  isOffline = false,
  savedCount = 0,
  searchInputRef,
  onOpenExport,
  onOpenImport,
}) => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(false);
  const mobileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleOpenMobileSearch = () => {
    setIsMobileSearchOpen(true);
    if (activeView !== 'lista') {
      onViewChange('lista');
    }
    setTimeout(() => {
      mobileInputRef.current?.focus();
    }, 50);
  };

  const handleCloseMobileSearch = () => {
    setIsMobileSearchOpen(false);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-40 h-16 md:h-20 bg-surface-card/90 backdrop-blur-md border-b border-border-subtle shadow-bar-top transition-all">
      {/* Mobile Search Overlay Bar */}
      {isMobileSearchOpen ? (
        <div className="lg:hidden max-w-7xl mx-auto px-3 sm:px-6 h-full flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <div className="absolute left-3 pointer-events-none text-text-muted flex items-center">
              <Search className="w-4 h-4" />
            </div>
            <input
              ref={mobileInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Pesquisar artistas, palcos..."
              className="w-full h-10 pl-9 pr-10 text-sm bg-surface-container-high border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-highlight focus:ring-1 focus:ring-brand-crimson transition-all"
              aria-label="Pesquisar programação"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 p-1 text-text-muted hover:text-text-primary rounded-full hover:bg-surface-overlay"
                aria-label="Limpar texto de pesquisa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleCloseMobileSearch}
            className="p-2 text-xs font-semibold text-text-secondary hover:text-text-primary rounded-xl bg-surface-container border border-border-subtle shrink-0"
            aria-label="Fechar barra de pesquisa"
          >
            Fechar
          </button>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Festival Emblem & Identity */}
        <div 
          onClick={() => onViewChange('grelha')}
          className="flex items-center gap-3 cursor-pointer select-none group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onViewChange('grelha'); }}
          aria-label="Ir para a Grelha Principal"
        >
          {/* Stylized Avante Star Emblem */}
          <div className="relative flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-xl bg-surface-container-high border border-border-highlight group-hover:border-brand-crimson transition-all shadow-sm">
            <svg viewBox="0 0 24 24" className="w-5 h-5 md:w-6 md:h-6 text-brand-crimson fill-current transition-transform group-hover:scale-110" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-amber"></span>
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-base md:text-xl text-text-primary tracking-tight leading-tight group-hover:text-brand-crimson-bright transition-colors">
                Festa do Avante!
              </span>
              <span className="font-mono text-xs md:text-sm font-bold text-brand-amber bg-surface-container px-1.5 py-0.5 rounded border border-border-subtle">
                2025
              </span>
            </div>
            <span className="text-[10px] md:text-xs text-brand-crimson-bright font-bold uppercase tracking-wider">
              5 • 6 • 7 Setembro • Atalaia
            </span>
          </div>
        </div>

        {/* Center: Desktop Route Navigation Tabs */}
        <nav className="hidden md:flex items-center bg-surface-container/80 p-1 rounded-xl border border-border-subtle" role="tablist">
          <button
            role="tab"
            aria-selected={activeView === 'grelha'}
            onClick={() => onViewChange('grelha')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all ${
              activeView === 'grelha'
                ? 'bg-surface-container-high text-brand-crimson-bright shadow-sm border border-border-highlight'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-container-low'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Grelha</span>
          </button>

          <button
            role="tab"
            aria-selected={activeView === 'lista'}
            onClick={() => onViewChange('lista')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all ${
              activeView === 'lista'
                ? 'bg-surface-container-high text-brand-crimson-bright shadow-sm border border-border-highlight'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-container-low'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Lista</span>
          </button>

          <button
            role="tab"
            aria-selected={activeView === 'horario'}
            onClick={() => onViewChange('horario')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all ${
              activeView === 'horario'
                ? 'bg-surface-container-high text-brand-crimson-bright shadow-sm border border-border-highlight'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-container-low'
            }`}
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>O Meu Horário</span>
            {savedCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[11px] font-bold rounded-full bg-brand-crimson text-text-primary">
                {savedCount}
              </span>
            )}
          </button>
        </nav>

        {/* Center-Right: Search Input with [/] Shortcut Indicator */}
        <div className="relative hidden lg:flex items-center w-56 xl:w-72">
          <div className="absolute left-3 pointer-events-none text-text-muted flex items-center">
            <Search className="w-4 h-4" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={onSearchFocus}
            placeholder="Pesquisar artistas, palcos..."
            className="w-full h-9 pl-9 pr-12 text-xs bg-surface-container-high border border-border-subtle rounded-full text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-highlight focus:ring-1 focus:ring-brand-crimson transition-all"
            aria-label="Pesquisar programação"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 p-1 text-text-muted hover:text-text-primary rounded-full hover:bg-surface-overlay"
              aria-label="Limpar pesquisa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-text-muted bg-surface-overlay border border-border-subtle rounded shadow-xs pointer-events-none">
              /
            </kbd>
          )}
        </div>

        {/* Right Section: Sharing Actions + Mobile Search + Offline Status Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Quick Sharing Action Buttons in Header */}
          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="p-2 text-text-secondary hover:text-brand-amber rounded-xl bg-surface-container hover:bg-surface-container-high border border-border-subtle transition-all flex items-center gap-1.5"
              title="Partilhar ou exportar agenda"
              aria-label="Partilhar ou exportar agenda"
            >
              <Share2 className="w-4 h-4 text-brand-amber" />
              <span className="hidden xl:inline text-xs font-semibold">Partilhar</span>
            </button>
          )}

          {onOpenImport && (
            <button
              onClick={onOpenImport}
              className="p-2 text-text-secondary hover:text-stage-blue rounded-xl bg-surface-container hover:bg-surface-container-high border border-border-subtle transition-all flex items-center gap-1.5"
              title="Importar agenda"
              aria-label="Importar agenda"
            >
              <Download className="w-4 h-4 text-stage-blue" />
              <span className="hidden xl:inline text-xs font-semibold">Importar</span>
            </button>
          )}

          {/* Mobile Search Button (reveals or switches to search) */}
          <button
            onClick={handleOpenMobileSearch}
            className="lg:hidden p-2 text-text-secondary hover:text-text-primary rounded-xl bg-surface-container border border-border-subtle active:scale-95 transition-transform"
            aria-label="Abrir pesquisa"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* PWA Offline / Online Status Pill */}
          {isOffline ? (
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-border-subtle text-brand-amber text-xs font-medium"
              title="Modo offline ativo. Todos os dados estão disponíveis localmente."
            >
              <WifiOff className="w-3.5 h-3.5 text-brand-amber" />
              <span className="hidden sm:inline font-semibold">Offline</span>
            </div>
          ) : (
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-border-subtle text-tertiary text-xs font-medium"
              title="Ligação ativa e sincronizada"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
              </span>
              <span className="hidden sm:inline font-semibold">Online</span>
            </div>
          )}
        </div>

        </div>
      )}
    </header>
  );
};
