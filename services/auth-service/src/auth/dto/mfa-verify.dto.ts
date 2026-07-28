import { IsString, Length, Matches } from 'class-validator';

export class MfaVerifyDto {
  @IsString()
  mfaToken: string;

  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @Matches(/^[0-9]+$/, { message: 'Code must contain only digits' })
  code: string;
}
