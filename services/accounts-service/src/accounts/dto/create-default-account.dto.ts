import { IsString, IsNotEmpty } from 'class-validator';

export class CreateDefaultAccountDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;
}
