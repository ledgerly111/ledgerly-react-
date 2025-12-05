import { useCallback, useMemo, useState } from 'react';
import { useAppState } from '../context/AppContext.jsx';

function formatTimestamp(value) {
  if (!value) {
    return 'Unknown time';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
}

function formatLogNumber(logNumber, fallbackIndex) {
  const base = Number.isFinite(Number(logNumber)) ? Number(logNumber) : fallbackIndex;
  return String(base ?? 0).padStart(5, '0');
}

const toneClassMap = {
  keyword: {
    green: 'log-keyword--green',
    yellow: 'log-keyword--yellow',
    purple: 'log-keyword--purple',
    red: 'log-keyword--red',
  },
  amount: {
    green: 'log-amount--green',
    red: 'log-amount--red',
    yellow: 'log-amount--yellow',
  },
  status: {
    blue: 'log-status--blue',
    green: 'log-status--green',
    orange: 'log-status--orange',
    red: 'log-status--red',
  },
};

function getSegmentClass(segment) {
  const base = ['log-segment'];
  if (!segment || !segment.type) {
    return base.join(' ');
  }
  if (segment.type === 'id') {
    base.push('log-id');
    return base.join(' ');
  }
  if (toneClassMap[segment.type]) {
    const tone = segment.tone ?? 'green';
    const toneClass = toneClassMap[segment.type][tone] ?? toneClassMap[segment.type].green;
    base.push(toneClass);
    return base.join(' ');
  }
  if (segment.type === 'text') {
    return base.join(' ');
  }
  return base.join(' ');
}

function extractMessageText(message = []) {
  if (!Array.isArray(message)) {
    return String(message ?? '');
  }
  return message.map((segment) => String(segment?.value ?? '')).join(' ');
}

export default function OwlLogsView() {
  const { logs = [] } = useAppState();
  const [filterTerm, setFilterTerm] = useState('');
  const [selectedLogNumber, setSelectedLogNumber] = useState(null);

  const entries = useMemo(() => (Array.isArray(logs) ? logs : []), [logs]);

  const filteredEntries = useMemo(() => {
    let result = entries;

    // Filter by log number if selected
    if (selectedLogNumber !== null) {
      result = result.filter((entry) => entry?.logNumber === selectedLogNumber);
    }

    // Then filter by search term
    const term = filterTerm.trim().toLowerCase();
    if (term) {
      result = result.filter((entry) => {
        const code = String(entry?.code ?? '').toLowerCase();
        const actorName = String(entry?.actorName ?? '').toLowerCase();
        const messageText = extractMessageText(entry?.message).toLowerCase();
        return (
          code.includes(term) ||
          actorName.includes(term) ||
          messageText.includes(term)
        );
      });
    }

    return result;
  }, [entries, filterTerm, selectedLogNumber]);

  const handleFilterByCode = useCallback((code) => {
    if (!code) {
      return;
    }
    setFilterTerm(code);
    setSelectedLogNumber(null); // Clear log number filter when filtering by code
  }, []);

  const handleFilterByLogNumber = useCallback((logNumber) => {
    if (logNumber === selectedLogNumber) {
      // Toggle off if clicking the same log number
      setSelectedLogNumber(null);
    } else {
      setSelectedLogNumber(logNumber);
      setFilterTerm(''); // Clear text filter when filtering by log number
    }
  }, [selectedLogNumber]);

  const clearAllFilters = useCallback(() => {
    setFilterTerm('');
    setSelectedLogNumber(null);
  }, []);

  const renderMessage = useCallback((entry) => {
    if (!Array.isArray(entry?.message)) {
      const fallback = String(entry?.message ?? 'Action recorded.');
      return <span className="log-segment">{fallback}</span>;
    }
    return entry.message.map((segment, index) => (
      <span key={`${entry.id ?? entry.code}-seg-${index}`} className={getSegmentClass(segment)}>
        {segment?.value ?? ''}
      </span>
    ));
  }, []);

  return (
    <div className="owl-logs-container space-y-6 fade-in font-mono">
      <header className="space-y-3">
        <h2 className="owl-logs-title text-3xl font-bold tracking-tight">Owl Logs</h2>
        <p className="owl-logs-subtitle text-sm">
          Immutable activity records for every critical action across the platform.
        </p>
        <div className="relative">
          <input
            type="search"
            value={filterTerm}
            onChange={(event) => setFilterTerm(event.target.value)}
            placeholder="Filter by code, actor, or message..."
            className="owl-logs-input w-full rounded-lg border px-4 py-2 text-sm placeholder:opacity-60 focus:outline-none focus:ring-2"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] uppercase tracking-wide opacity-60">
            /filter
          </span>
        </div>
      </header>

      {(filterTerm || selectedLogNumber !== null) && (
        <div className="flex items-center gap-2 text-xs">
          {selectedLogNumber !== null && (
            <span className="rounded-lg bg-blue-500/20 border border-blue-500/30 px-3 py-1 text-blue-300">
              Showing logs with number: {formatLogNumber(selectedLogNumber, 0)}
            </span>
          )}
          {filterTerm && (
            <span className="rounded-lg bg-purple-500/20 border border-purple-500/30 px-3 py-1 text-purple-300">
              Filter: "{filterTerm}"
            </span>
          )}
          <button
            type="button"
            onClick={clearAllFilters}
            className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1 text-red-300 hover:bg-red-500/30 transition-colors"
          >
            <i className="fas fa-times mr-1" /> Clear Filters
          </button>
        </div>
      )}

      <div className="owl-logs-main overflow-hidden rounded-xl border shadow-inner">
        <div className="owl-logs-header border-b px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.4em] flex items-center gap-2">
            <span className="inline-flex gap-0.5">
              <span className="inline-block animate-pulse" style={{ animationDuration: '2s' }}>:</span>
              <span className="inline-block animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.5s' }}>:</span>
            </span>
            Audit Stream
          </span>
        </div>
        {filteredEntries.length === 0 ? (
          <div className="owl-logs-empty px-6 py-12 text-center text-xs">
            {filterTerm || selectedLogNumber !== null
              ? 'No logs match the current filters.'
              : 'No Owl Logs captured yet. System events will appear here automatically.'}
          </div>
        ) : (
          <ul className="owl-logs-list max-h-[70vh] overflow-y-auto divide-y">
            {filteredEntries.map((entry, index) => {
              const timestamp = formatTimestamp(entry?.timestamp);
              const code = entry?.code ?? 'GEN-INFO';
              const actorName = entry?.actorName ?? 'System';
              const entryId = entry?.id ?? `${code}-${index}`;
              const formattedNumber = formatLogNumber(entry?.logNumber, entries.length - index);
              const isLogNumberActive = selectedLogNumber !== null && selectedLogNumber === entry?.logNumber;

              return (
                <li
                  key={entryId}
                  className="owl-logs-entry group px-4 py-4 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleFilterByLogNumber(entry?.logNumber)}
                      className={`owl-logs-number rounded px-2 py-0.5 font-semibold uppercase tracking-wide transition-colors cursor-pointer ${isLogNumberActive ? 'ring-2 ring-blue-400' : 'hover:bg-blue-500/20'
                        }`}
                      title="Click to filter logs with this number"
                    >
                      [LOG: {formattedNumber}]
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFilterByCode(code)}
                      className="owl-logs-code-btn rounded px-2 py-0.5 font-semibold uppercase tracking-wide transition-colors"
                      title="Filter by this code"
                    >
                      {code}
                    </button>
                    <span className="owl-logs-actor">@{actorName}</span>
                    <span className="owl-logs-timestamp ml-auto text-[10px] uppercase tracking-widest">
                      {timestamp}
                    </span>
                  </div>
                  <div className="owl-logs-message mt-3 text-sm break-words">
                    {renderMessage(entry)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
