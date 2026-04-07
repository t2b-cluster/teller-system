import { Controller, Post, Get, Body } from '@nestjs/common';
import { AccountService } from './account.service';
import { CreateAccountDto } from './account.dto';

@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  async create(@Body() dto: CreateAccountDto) {
    return this.accountService.create(dto);
  }

  @Get()
  async findAll() {
    return this.accountService.findAll();
  }
}
