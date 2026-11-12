import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

import { Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  @Matches(/[A-Za-z]/, { message: 'Mật khẩu phải có ít nhất một chữ cái.' })
  @Matches(/[0-9]/, { message: 'Mật khẩu phải có ít nhất một chữ số.' })
  password!: string;
}
