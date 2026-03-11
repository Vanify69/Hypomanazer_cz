import { useRef, useState, useEffect, useCallback } from 'react';
import { FileText, Circle } from 'lucide-react';
import { Case } from '../../lib/types';

const TRAY_POSITION_KEY = 'hypo-tray-indicator-position';

export type TrayIndicatorVariant = 'floating' | 'embedded';

interface TrayIndicatorProps {
  activeCase: Case | null;
  /** floating = táhnutelné okno (desktop), embedded = v hlavičce/sidebaru (mobil, tablet) */
  variant?: TrayIndicatorVariant;
}

const TRAY_WIDTH = 220;
const TRAY_HEIGHT = 60;
const TRAY_MARGIN = 8;

function loadSavedPosition(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(TRAY_POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { x: number; y: number };
    if (typeof parsed?.x !== 'number' || typeof parsed?.y !== 'number') return null;
    const maxX = window.innerWidth - TRAY_WIDTH - TRAY_MARGIN;
    const maxY = window.innerHeight - TRAY_HEIGHT - TRAY_MARGIN;
    const x = Math.max(TRAY_MARGIN, Math.min(maxX, parsed.x));
    const y = Math.max(TRAY_MARGIN, Math.min(maxY, parsed.y));
    return { x, y };
  } catch {
    // ignore
  }
  return null;
}

function savePosition(x: number, y: number) {
  try {
    localStorage.setItem(TRAY_POSITION_KEY, JSON.stringify({ x, y }));
  } catch {
    // ignore
  }
}

const TrayContent = ({ activeCase, compact = false }: { activeCase: Case | null; compact?: boolean }) => (
  <>
    {activeCase && (
      <Circle className="w-2 h-2 shrink-0 text-green-500 fill-green-500" aria-hidden />
    )}
    <div className="shrink-0">
      <FileText className={`text-gray-700 dark:text-gray-300 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
    </div>
    <div className={`text-gray-900 dark:text-gray-100 min-w-0 ${compact ? 'text-xs' : 'text-sm'}`}>
      <div className="font-medium truncate">
        {activeCase ? `Aktivní: ${activeCase.jmeno}` : 'Žádný aktivní'}
      </div>
      {!compact && <div className="text-xs text-gray-500 dark:text-gray-400">Systémová lišta</div>}
    </div>
  </>
);

export function TrayIndicator({ activeCase, variant = 'floating' }: TrayIndicatorProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => loadSavedPosition());
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, elX: 0, elY: 0 });
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const el = boxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const elX = position?.x ?? rect.left;
    const elY = position?.y ?? rect.top;
    dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, elX, elY };
    lastPositionRef.current = { x: elX, y: elY };
    setPosition({ x: elX, y: elY });
    setDragging(true);
  }, [position?.x, position?.y]);

  useEffect(() => {
    if (variant !== 'floating' || !dragging) return;
    const handleMove = (e: MouseEvent) => {
      const { mouseX, mouseY, elX, elY } = dragStartRef.current;
      const dx = e.clientX - mouseX;
      const dy = e.clientY - mouseY;
      const el = boxRef.current;
      const w = el ? el.offsetWidth : TRAY_WIDTH;
      const h = el ? el.offsetHeight : TRAY_HEIGHT;
      const margin = TRAY_MARGIN;
      let x = elX + dx;
      let y = elY + dy;
      x = Math.max(margin, Math.min(window.innerWidth - w - margin, x));
      y = Math.max(margin, Math.min(window.innerHeight - h - margin, y));
      lastPositionRef.current = { x, y };
      setPosition({ x, y });
    };
    const handleUp = () => {
      setDragging(false);
      const toSave = lastPositionRef.current;
      if (toSave) savePosition(toSave.x, toSave.y);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [variant, dragging]);

  useEffect(() => {
    if (variant !== 'floating' || !dragging) return;
    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = 'grabbing';
    return () => {
      document.body.style.cursor = prevCursor;
    };
  }, [variant, dragging]);

  if (variant === 'embedded') {
    return (
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 min-w-0 max-w-full"
        title={activeCase ? `Aktivní případ: ${activeCase.jmeno}` : 'Žádný aktivní případ'}
      >
        <TrayContent activeCase={activeCase} compact />
      </div>
    );
  }

  const style: React.CSSProperties = {
    ...(position ? { left: position.x, top: position.y, right: 'auto' } : { right: 16, top: 16 }),
    ...(dragging ? { cursor: 'grabbing' } : {}),
  };

  return (
    <div
      ref={boxRef}
      role="presentation"
      className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 flex items-center gap-3 z-50 select-none cursor-default hover:cursor-grab"
      style={style}
      onMouseDown={handleMouseDown}
    >
      <TrayContent activeCase={activeCase} />
    </div>
  );
}
