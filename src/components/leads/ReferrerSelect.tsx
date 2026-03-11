import { useState, useEffect, useRef } from 'react';
import { getReferrers, type Referrer } from '../../lib/api';

interface ReferrerSelectProps {
  value: { id: string; displayName: string } | null;
  onChange: (referrer: { id: string; displayName: string } | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ReferrerSelect({ value, onChange, disabled, placeholder = 'Hledat podle jména…' }: ReferrerSelectProps) {
  const [query, setQuery] = useState(value?.displayName ?? '');
  const [results, setResults] = useState<Referrer[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (value) setQuery(value.displayName);
  }, [value?.id]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      getReferrers({ q: query })
        .then((list) => {
          if (mountedRef.current) {
            setResults(list);
            setOpen(true);
          }
        })
        .catch(() => {
          if (mountedRef.current) setResults([]);
        })
        .finally(() => {
          if (mountedRef.current) {
            setLoading(false);
          }
          debounceRef.current = null;
        });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (r: Referrer) => {
    onChange({ id: r.id, displayName: r.displayName });
    setQuery(r.displayName);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Zrušit
          </button>
        )}
      </div>
      {open && (
        <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {loading && <li className="px-3 py-2 text-gray-500">Načítání…</li>}
          {!loading && results.length === 0 && query.trim() && (
            <li className="px-3 py-2 text-gray-500">Žádný tipař nenalezen</li>
          )}
          {!loading &&
            results.map((r) => (
              <li
                key={r.id}
                role="button"
                onClick={() => handleSelect(r)}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-gray-900"
              >
                {r.displayName}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
