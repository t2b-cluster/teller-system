import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import DOMPurify from 'dompurify';
import { api } from '../api/client';

export default function TransferPage() {
  const [form, setForm] = useState({
    fromAccount: '',
    toAccount: '',
    amount: '',
    description: '',
  });
  const [result, setResult] = useState<{ status: string; ref?: string; error?: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const idempotencyKey = uuidv4();
      return api.transfer(
        {
          fromAccount: DOMPurify.sanitize(form.fromAccount),
          toAccount: DOMPurify.sanitize(form.toAccount),
          amount: parseFloat(form.amount),
          currency: 'THB',
          description: DOMPurify.sanitize(form.description),
        },
        idempotencyKey,
      );
    },
    onSuccess: (data) => setResult({ status: data.status, ref: data.transactionRef }),
    onError: (err: Error) => setResult({ status: 'ERROR', error: err.message }),
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
      <h2 className="page-title">โอนเงิน</h2>

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-group">
          <label htmlFor="fromAccount">บัญชีต้นทาง</label>
          <input
            id="fromAccount"
            type="text"
            placeholder="เช่น 1001000001"
            value={form.fromAccount}
            onChange={(e) => updateField('fromAccount', e.target.value)}
            required
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <label htmlFor="toAccount">บัญชีปลายทาง</label>
          <input
            id="toAccount"
            type="text"
            placeholder="เช่น 1001000002"
            value={form.toAccount}
            onChange={(e) => updateField('toAccount', e.target.value)}
            required
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <label htmlFor="amount">จำนวนเงิน (THB)</label>
          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => updateField('amount', e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">หมายเหตุ</label>
          <input
            id="description"
            type="text"
            placeholder="(ไม่บังคับ)"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            maxLength={500}
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'กำลังดำเนินการ...' : 'ยืนยันโอนเงิน'}
        </button>
      </form>

      {result && (
        <div className={`result-card ${result.status === 'ERROR' ? 'result-error' : 'result-success'}`} role="alert">
          {result.status === 'ERROR' ? (
            <p>เกิดข้อผิดพลาด: {result.error}</p>
          ) : (
            <>
              <p>สถานะ: {result.status}</p>
              <p>Ref: {result.ref}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
