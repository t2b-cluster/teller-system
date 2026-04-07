import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, MaxLength } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  accountName: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  initialDeposit?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
