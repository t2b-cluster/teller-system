import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, MaxLength } from 'class-validator';

export class CreateTransferDto {
  @IsString()
  @IsNotEmpty()
  fromAccount: string;

  @IsString()
  @IsNotEmpty()
  toAccount: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
