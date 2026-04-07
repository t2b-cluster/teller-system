export interface TransferRequestDto {
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  description?: string;
}

export interface TransferResponseDto {
  transactionId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  timestamp: string;
}

export interface TransactionQueryDto {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  type?: 'TRANSFER' | 'DEPOSIT' | 'WITHDRAWAL';
  status?: 'PENDING' | 'SUCCESS' | 'FAILED';
  cursor?: string;
  limit?: number;
}
