import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Table as TableIcon, LayoutGrid, FolderTree } from 'lucide-react';
import Card from '../components/ui/Card';

/**
 * View & Data Types
 */
type ViewType = 'table' | 'cards';
type Row = { component: string; tcmId: string };
type Normalized = Record<string, Row[]>;

/**
 * Utilities
 */
async function safeJson(res: Response | undefined) {
  if (!res || !res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function toTcmString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Normalize the 3rd‑party JSON into a map of group -> rows
 * Input example:
 * {
 *   "A": { "component": "tcmId", "component1": "tcmId1" },
 *   "B": { "component": "tcmId", "component1": "tcmId1" }
 * }
 */
function normalizeMeta(data: unknown): Normalized {
  const result: Normalized = {};
  if (!data || typeof data !== 'object') return result;

  for (const [groupKey, groupVal] of Object.entries(data as Record<string, unknown>)) {
    if (groupVal && typeof groupVal === 'object' && !Array.isArray(groupVal)) {
      const rows: Row[] = Object.entries(groupVal as Record<string, unknown>).map(
        ([componentKey, tcmIdVal]) => ({
          component: componentKey,
          tcmId: toTcmString(tcmIdVal),
        })
      );
      result[groupKey] = rows;
    } else {
      // If group value is not an object, still render a single row for visibility
      result[groupKey] = [{ component: '(root)', tcmId: toTcmString(groupVal) }];
    }
  }

  return result;
}

/**
 * Collapsible Section (WF style & dark mode)
 */
function Collapsible({
  title,
  rows,
  view,
  defaultOpen = true,
}: {
  title: string;
  rows: Row[];
  view: ViewType;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
        className="
            border rounded-xl bg-white dark:bg-gray-900
            border-gray-200 dark:border-gray-800
            overflow-hidden
            shadow-sm hover:shadow-md transition-shadow
            mb-8 last:mb-0 md:mb-6
        "
    >
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`section-${title}`}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-primary-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <FolderTree className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <div className="text-base font-semibold text-primary-700 dark:text-white">{title}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{rows.length} fields</div>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-600 dark:text-gray-300 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Body */}
      {open && (
        <div id={`section-${title}`} className="px-5 pb-5">
          {view === 'table' ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      Component
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      TCM ID
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400 text-center"
                      >
                        No fields found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, idx) => (
                      <tr
                        key={`${title}-${row.component}-${idx}`}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-primary-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                          <span className="block truncate">{row.component}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                          <span className="block truncate">{row.tcmId}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            // Cards view
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rows.length === 0 ? (
                <div className="py-4 text-sm text-gray-600 dark:text-gray-400">No fields found.</div>
              ) : (
                rows.map((row, idx) => (
                  <div
                    key={`${title}-${row.component}-${idx}`}
                    className="p-4 border rounded-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-primary-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Component
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {row.component}
                    </div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-3 mb-1">
                      TCM ID
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {row.tcmId}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Page (Wells Fargo style, dark/light support, dynamic groups, robust fallback)
 */
const MetaComponentsPage: React.FC = () => {
  const [view, setView] = useState<ViewType>('table');
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Normalized>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeta = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/components/meta'); // <-- swap to your endpoint if needed
        const data = await safeJson(res);

        const normalized = normalizeMeta(data);

        // Fallback to sample if API is empty or invalid
        if (Object.keys(normalized).length === 0) {
          const sample = {
            A: { component: 'tcmId', component1: 'tcmId1' },
            B: { component: 'tcmIdB', component1: 'tcmIdB1' },
            C: { fieldX: 'tcmX', fieldY: 'tcmY', fieldZ: 'tcmZ' },
          };
          setGroups(normalizeMeta(sample));
          setError('Using hard‑coded data (API returned empty or invalid).');
        } else {
          setGroups(normalizeMeta(data));
        }
      } catch {
        // Network or parsing error — show sample
        const sample = {
          A: { component: 'tcmId', component1: 'tcmId1' },
          B: { component: 'tcmIdB', component1: 'tcmIdB1' },
          C: { fieldX: 'tcmX', fieldY: 'tcmY', fieldZ: 'tcmZ' },
        };
        setGroups(normalizeMeta(sample));
        setError('Using hard‑coded data (API failed).');
      } finally {
        setLoading(false);
      }
    };

    fetchMeta();
  }, []);

  const groupEntries = useMemo(() => Object.entries(groups), [groups]);
  const totalCount = useMemo(
    () => groupEntries.reduce((acc, [, rows]) => acc + rows.length, 0),
    [groupEntries]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary-700 dark:text-white">Meta Components</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Dynamic sections from third‑party JSON. Columns: <b>Component</b> &amp; <b>TCM ID</b>.
          </p>
        </div>

        {/* View Toggle */}
        <div className="inline-flex rounded-lg border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <button
            onClick={() => setView('table')}
            className={`px-3 py-2 text-sm inline-flex items-center gap-2 ${
              view === 'table'
                ? 'bg-primary-50 dark:bg-gray-800/50 text-primary-900 dark:text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40'
            }`}
            aria-pressed={view === 'table'}
          >
            <TableIcon className="w-4 h-4" />
            Table
          </button>
          <button
            onClick={() => setView('cards')}
            className={`px-3 py-2 text-sm inline-flex items-center gap-2 border-l border-gray-200 dark:border-gray-800 ${
              view === 'cards'
                ? 'bg-primary-50 dark:bg-gray-800/50 text-primary-900 dark:text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40'
            }`}
            aria-pressed={view === 'cards'}
          >
            <LayoutGrid className="w-4 h-4" />
            Cards
          </button>
        </div>
      </div>

      {/* Card Container (WF style accent) */}
      <Card className="p-6 bg-white dark:bg-gray-900 hover:shadow-xl transition-all duration-300 border-l-4 border-l-primary-500">
        <div className="flex items-center space-x-3 mb-6">
          <FolderTree className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          <h2 className="text-xl font-semibold text-primary-700 dark:text-white">
            Component / TCM ID Mapping
          </h2>
        </div>

        {/* Status */}
        <div className="mb-4 flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm border ${
              loading
                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-primary-50 dark:bg-primary-900/20 text-primary-800 dark:text-primary-300 border-primary-200 dark:border-primary-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500' : 'bg-emerald-500'}`}
            />
            {loading ? 'Loading…' : `${totalCount} total fields`}
          </span>

          {error && (
            <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              {error}
            </span>
          )}
        </div>

        {/* Dynamic Collapsibles */}
        <div className="space-y-8">
        {groupEntries.length === 0 && !loading ? (
            <div className="text-gray-600 dark:text-gray-400">No sections found.</div>
        ) : (
            groupEntries.map(([groupName, rows]) => (
                <Collapsible key={groupName} title={groupName} rows={rows} view={view} />
            ))
        )}
        </div>
      </Card>
    </div>
  );
};

export default MetaComponentsPage;
