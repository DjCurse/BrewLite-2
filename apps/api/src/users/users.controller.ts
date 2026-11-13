import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  findMe(@Req() request: AuthenticatedRequest) {
    return this.users.findMe(request.user.userId);
  }
}
