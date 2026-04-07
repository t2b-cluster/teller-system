import { useRef, useEffect, useState, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { api, type Transaction } from '../api/client';

export default function TransactionHistoryPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState({ accountId: '', status: '', type: '' });

  const buildParams = useCallback((cursor?: string) => {
    const params: Record<string, string> = { limit: '50' };
    if (filters.accountId) params.accountId = filters.accountId;
    if (filters.status) params.status = filters.status;
    if (filters.type) params.type = filters.type;
    if (cursor) params.cursor = cursor;
    return params;
  }, [filters]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['transactions', filters],
    queryFn: ({ pageParam }) => api.getTransactions(buildParams(pageParam)),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const allRows: Transaction[] = data?.pages.flatMap((p) => p.items) ?? [];

  const virtualizer = useVirtualizer({
    count: hasNextPage ? allRows.length + 1 : allRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  useEffect(() => {
    const lastItem = virtualizer.getVirtualItems().at(-1);
    if (lastItem && lastItem.index >= allRows.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [virtualizer.getVirtualItems(), allRows.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const updateFilter = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="page">
      <h2 className="page-title">ประวัติธุรกรรม</h2>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="เลขบัญชี"
          value={filters.accountId}
          onChange={(e) => updateFilter('accountId', e.target.value)}
          aria-label="กรองตามเลขบัญชี"
        />
        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          aria-label="กรองตามสถานะ"
        >
          <option value="">ทุกสถานะ</option>
          <option value="PENDING">PENDING</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
        </select>
        <select
          value={filters.type}
          onChange={(e) => updateFilter('type', e.target.value)}
          aria-label="กรองตามประเภท"
        >
          <option value="">ทุกประเภท</option>
          <option value="TRANSFER">TRANSFER</option>
          <option value="DEPOSIT">DEPOSIT</option>
          <option value="WITHDRAWAL">WITHDRAWAL</option>
        </select>
      </div>

      <div className="table-header">
        <span className="col-ref">Ref</span>
        <span className="col-from">จาก</span>
        <span className="col-to">ไป</span>
        <span className="col-amount">จำนวน</span>
        <span className="col-status">สถานะ</span>
        <span className="col-date">วันที่</span>
      </div>

      <div ref={scrollRef} className="virtual-list" role="list" aria-label="รายการธุรกรรม">
        <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
          {isLoading && <p className="loading-text">กำลังโหลด...</p>}
          {virtualizer.getVirtualItems().map((vRow) => {
            const tx = allRows[vRow.index];
            if (!tx) {
              return (
                <div key="loader" className="row-loading" style={{ position: 'absolute', top: vRow.start, height: vRow.size, width: '100%' }}>
                  {isFetchingNextPage ? 'กำลังโหลดเพิ่ม...' : ''}
                </div>
              );
            }
            return (
              <div
                key={tx.id}
                className="table-row"
                role="listitem"
                style={{ position: 'absolute', top: vRow.start, height: vRow.size, width: '100%' }}
              >
                <span className="col-ref" title={tx.transactionRef}>{tx.transactionRef.slice(-12)}</span>
                <span className="col-from">{tx.fromAccount}</span>
                <span className="col-to">{tx.toAccount}</span>
                <span className="col-amount">{Number(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                <span className={`col-status status-${tx.status.toLowerCase()}`}>{tx.status}</span>
                <span className="col-date">{(() => {
                  const d = new Date(tx.createdAt.endsWith('Z') ? tx.createdAt : tx.createdAt + 'Z');
                  return d.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
                })()}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="list-footer">
        แสดง {allRows.length} รายการ {hasNextPage && '(มีเพิ่มเติม)'}
      </div>
    </div>
  );
}
