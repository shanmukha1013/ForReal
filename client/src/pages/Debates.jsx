import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Scale } from 'lucide-react';
import { debateService } from '@/services/debateService';
import { DebateCard } from '@/features/debates/DebateCard';
import { CreateDebateModal } from '@/features/debates/CreateDebateModal';
import { Button, EmptyState, ErrorState, PageHeader, SkeletonList, Tabs } from '@/components/ui';
import { usePageTitle } from '@/hooks';
import { CATEGORIES } from '@/lib/constants';

const SORTS = [
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
  { value: 'ending_soon', label: 'Ending soon' },
  { value: 'finished', label: 'Closed' },
];

export default function Debates() {
  usePageTitle('Debates');
  const [params, setParams] = useSearchParams();
  const sort = SORTS.some((s) => s.value === params.get('sort')) ? params.get('sort') : 'trending';
  const category = CATEGORIES.includes(params.get('category')) ? params.get('category') : '';
  const createOpen = params.get('new') === '1';

  const [debates, setDebates] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('loading'); // loading | ready | error | more
  const [error, setError] = useState(null);
  const requestRef = useRef(0);

  const load = useCallback(async (nextPage = 1) => {
    const requestId = ++requestRef.current;
    setStatus(nextPage === 1 ? 'loading' : 'more');
    setError(null);
    try {
      const query = {
        page: nextPage,
        limit: 10,
        category: category || undefined,
        ...(sort === 'finished' ? { status: 'finished', sort: 'newest' } : { sort, status: sort === 'newest' ? undefined : 'open' }),
      };
      const res = await debateService.list(query);
      if (requestId !== requestRef.current) return;
      setDebates((prev) => (nextPage === 1 ? res.data.debates : [...prev, ...res.data.debates.filter((d) => !prev.some((p) => p._id === d._id))]));
      setPage(nextPage);
      setPages(res.data.pages);
      setStatus('ready');
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setError(err.message);
      setStatus('error');
    }
  }, [sort, category]);

  useEffect(() => {
    load(1);
  }, [load]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: key !== 'new' });
  };

  return (
    <div>
      <PageHeader
        eyebrow="The arena"
        title="Debates"
        description="Pick a question. Take a side. Make the case that changes minds."
        actions={(
          <Button variant="ivory" onClick={() => updateParam('new', '1')}>
            <Plus size={18} strokeWidth={3} /> Open a debate
          </Button>
        )}
      />

      <div className="mb-5 flex flex-col gap-3">
        <Tabs label="Sort debates" tabs={SORTS} value={sort} onChange={(value) => updateParam('sort', value === 'trending' ? '' : value)} />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Filter by category">
          {['', ...CATEGORIES].map((c) => {
            const active = category === c;
            return (
              <button
                key={c || 'all'}
                type="button"
                onClick={() => updateParam('category', c)}
                aria-pressed={active}
                className={`h-8 shrink-0 rounded-full border-2 border-ink px-3 text-xs font-bold transition-colors ${active ? 'bg-ink text-ivory' : 'bg-ivory hover:bg-ink hover:text-ivory'}`}
              >
                {c || 'All topics'}
              </button>
            );
          })}
        </div>
      </div>

      {status === 'loading' ? (
        <SkeletonList count={3} />
      ) : status === 'error' && debates.length === 0 ? (
        <ErrorState title="Debates didn’t load." message={error} onRetry={() => load(1)} />
      ) : debates.length === 0 ? (
        <EmptyState
          icon={Scale}
          title={sort === 'finished' ? 'Nothing closed yet.' : 'The floor is open.'}
          action={<Button variant="accent" onClick={() => updateParam('new', '1')}><Plus size={18} strokeWidth={3} /> Open the first debate</Button>}
        >
          {category ? `No ${category.toLowerCase()} debates here yet.` : 'No debates match this view yet. Start one worth having.'}
        </EmptyState>
      ) : (
        <div className="space-y-5">
          {debates.map((debate, i) => (
            <DebateCard key={debate._id} debate={debate} rank={sort === 'trending' && !category && i < 3 ? i + 1 : undefined} />
          ))}
          {page < pages && (
            <div className="flex justify-center pt-2">
              <Button variant="ivory" onClick={() => load(page + 1)} isLoading={status === 'more'}>Load more debates</Button>
            </div>
          )}
          {status === 'error' && debates.length > 0 && (
            <p className="text-center text-sm font-bold">{error} <button type="button" className="underline" onClick={() => load(page + 1)}>Retry</button></p>
          )}
        </div>
      )}

      <CreateDebateModal isOpen={createOpen} onClose={() => updateParam('new', '')} />
    </div>
  );
}
