import { useState, useEffect } from 'react';
import { FileText, Maximize2, X, Star, User, Banknote, Keyboard, ChevronDown } from 'lucide-react';
import { getCases } from '../lib/storage';
import { Case } from '../lib/types';

interface SystemTrayProps {
  onRestore: () => void;
  onClose: () => void;
}

export function SystemTray({ onRestore, onClose }: SystemTrayProps) {
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  useEffect(() => {
    const cases = getCases();
    const active = cases.find(c => c.isActive);
    setActiveCase(active || null);
  }, []);
  
  const formatCurrency = (amount?: number) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  return (
    <div className="fixed top-4 right-4 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-white font-semibold text-sm">Hypoteční zprostředkovatel</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-blue-500/30 rounded transition-colors"
            title={isExpanded ? "Sbalit" : "Rozbalit"}
          >
            <ChevronDown className={`w-4 h-4 text-white transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={onRestore}
            className="p-1.5 hover:bg-blue-500/30 rounded transition-colors"
            title="Obnovit okno"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-red-500/30 rounded transition-colors"
            title="Zavřít aplikaci"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {activeCase ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Aktivní případ</span>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900">{activeCase.jmeno}</h3>
              </div>
              
              {activeCase.vyseUveru && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Banknote className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{formatCurrency(activeCase.vyseUveru)}</span>
                </div>
              )}
              
              {activeCase.ucel && (
                <p className="text-sm text-gray-600 line-clamp-2 mt-2">{activeCase.ucel}</p>
              )}
            </div>
            
            {isExpanded && (
              <>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Keyboard className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-600 uppercase">Klávesové zkratky</span>
                  </div>
                  
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded">
                      <span className="text-gray-600">Vložit jméno</span>
                      <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-mono">Ctrl+1</kbd>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded">
                      <span className="text-gray-600">Vložit rodné číslo</span>
                      <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-mono">Ctrl+2</kbd>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded">
                      <span className="text-gray-600">Vložit výši úvěru</span>
                      <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-mono">Ctrl+3</kbd>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded">
                      <span className="text-gray-600">Vložit adresu</span>
                      <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-mono">Ctrl+4</kbd>
                    </div>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-gray-200">
                  <button
                    onClick={onRestore}
                    className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Otevřít aplikaci
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Žádný aktivní případ</p>
            <button
              onClick={onRestore}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Otevřít aplikaci a vybrat
            </button>
          </div>
        )}
      </div>
      
      {/* Status bar */}
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <span>Běží na pozadí</span>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Připraveno</span>
        </div>
      </div>
    </div>
  );
}
