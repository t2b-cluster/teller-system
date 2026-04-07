import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { api } from '../api/client';

export default function AccountPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    accountNumber: '',
    accountName: '',
    initialDeposit: '',
    currency: 'THB',
  });
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.getAccounts(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.createAccount({
        accountNumber: DOMPurify.sanitize(form.accountNumber.trim()),
        accountName: DOMPurify.sanitize(form.accountName.trim()),
        initialDeposit: form.initialDeposit ? parseFloat(form.initialDeposit) : 0,
        currency: form.currency,
      }),
    onSuccess: (data) => {
      setResult({ ok: true, message: `เปิดบัญชี ${data.accountNumber} สำเร็จ` });
      setForm({ accountNumber: '', accountName: '', initialDeposit: '', currency: 'THB' });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (err: Error) => {
      setResult({ ok: false, message: err.message });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setResult(null);
    mutation.mutate();
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="page">
      <h2 className="page-title">เปิดบัญชีใหม่</h2>

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-group">
          <label htmlFor="accountNumber">เลขบัญชี</label>
          <input
            id="accountNumber"
            type="text"
            placeholder="เช่น 1001000010"
            value={form.accountNumber}
            onChange={(e) => updateField('accountNumber', e.target.value)}
            required
            maxLength={20}
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <label htmlFor="accountName">ชื่อบัญชี</label>
          <input
            id="accountName"
            type="text"
            placeholder="ชื่อ-นามสกุล เจ้าของบัญชี"
            value={form.accountName}
            onChange={(e) => updateField('accountName', e.target.value)}
            required
            maxLength={200}
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <label htmlFor="initialDeposit">ยอดเงินฝากเริ่มต้น (THB)</label>
          <input
            id="initialDeposit"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.initialDeposit}
            onChange={(e) => updateField('initialDeposit', e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'กำลังดำเนินการ...' : 'เปิดบัญชี'}
        </button>
      </form>

      {result && (
        <div className={`result-card ${result.ok ? 'result-success' : 'result-error'}`} role="alert">
          <p>{result.message}</p>
        </div>
      )}

      <h3 className="sub-heading">บัญชีทั้งหมดในระบบ</h3>
      {isLoading ? (
        <p className="loading-text">กำลังโหลด...</p>
      ) : (
        <div className="account-table-wrap">
          <table className="account-table">
            <thead>
              <tr>
                <th>เลขบัญชี</th>
                <th>ชื่อบัญชี</th>
                <th>ยอดคงเหลือ</th>
                <th>สกุลเงิน</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {accounts?.map((acc) => (
                <tr key={acc.id}>
                  <td>{acc.accountNumber}</td>
                  <td>{acc.accountName}</td>
                  <td className="text-right">{Number(acc.balance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  <td>{acc.currency}</td>
                  <td><span className={`status-badge status-${acc.status.toLowerCase()}`}>{acc.status}</span></td>
                </tr>
              ))}
              {accounts?.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted">ยังไม่มีบัญชีในระบบ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
