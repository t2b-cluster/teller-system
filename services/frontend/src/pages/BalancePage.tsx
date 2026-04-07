import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { api } from '../api/client';

export default function BalancePage() {
  const [accountId, setAccountId] = useState('');
  const [searchId, setSearchId] = useState('');

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['balance', searchId],
    queryFn: () => api.getBalance(searchId),
    enabled: !!searchId,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSearchId(DOMPurify.sanitize(accountId.trim()));
  };

  return (
    <div className="page">
      <h2 className="page-title">ตรวจสอบยอดคงเหลือ</h2>

      <form onSubmit={handleSubmit} className="form-card form-inline">
        <div className="form-group">
          <label htmlFor="balanceAccount">เลขบัญชี</label>
          <input
            id="balanceAccount"
            type="text"
            placeholder="เช่น 1001000001"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'กำลังค้นหา...' : 'ค้นหา'}
        </button>
      </form>

      {error && (
        <div className="result-card result-error" role="alert">
          <p>{(error as Error).message}</p>
        </div>
      )}

      {data && (
        <div className="balance-card" role="status">
          <div className="balance-label">ยอดคงเหลือ</div>
          <div className="balance-value">
            {Number(data.balance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            <span className="balance-currency">THB</span>
          </div>
          <div className="balance-meta">
            บัญชี: {data.accountId}
            <span className={`source-badge source-${data.source}`}>{data.source}</span>
            {isFetching && <span className="refreshing">กำลังรีเฟรช...</span>}
          </div>
        </div>
      )}
    </div>
  );
}
