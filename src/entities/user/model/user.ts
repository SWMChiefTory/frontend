import { z } from 'zod';
import { DateOnly } from '@/src/shared/utils/dateOnly';
import { Gender } from '../api/gender';

const userSchema = z.object({
  gender: z
    .enum(Object.keys(Gender) as [keyof typeof Gender])
    .transform((val) => val as Gender)
    .optional()
    .nullable(),
  nickname: z.string().trim().min(1, '닉네임을 입력해주세요'),
  isMarketingAgreed: z.boolean(),
  isPrivacyAgreed: z.boolean(),
  isTermsOfUseAgreed: z.boolean(),
  dateOfBirth: z
    .custom<DateOnly>(
      (val) => val instanceof DateOnly,
      '유효한 DateOnly 객체를 입력해주세요',
    )
    .optional()
    .nullable(),
});

export class User {
  readonly gender: Gender | null;
  readonly nickname: string;
  readonly dateOfBirth: DateOnly | null;
  readonly isMarketingAgreed: boolean;
  readonly isPrivacyAgreed: boolean;
  readonly isTermsOfUseAgreed: boolean;

  private constructor(
    gender: Gender | null,
    nickname: string,
    dateOfBirth: DateOnly | null,
    isMarketingAgreed: boolean,
    isPrivacyAgreed: boolean,
    isTermsOfUseAgreed: boolean,
  ) {
    this.gender = gender;
    this.nickname = nickname;
    this.dateOfBirth = dateOfBirth;
    this.isMarketingAgreed = isMarketingAgreed;
    this.isPrivacyAgreed = isPrivacyAgreed;
    this.isTermsOfUseAgreed = isTermsOfUseAgreed;
  }

  static create(data: {
    gender: Gender | undefined | null;
    nickname: string;
    dateOfBirth: DateOnly | undefined | null;
    isMarketingAgreed: boolean;
    isPrivacyAgreed: boolean;
    isTermsOfUseAgreed: boolean;
  }): User {
    const validated = userSchema.parse(data);
    return new User(
      validated.gender || null,
      validated.nickname,
      validated.dateOfBirth || null,
      validated.isMarketingAgreed,
      validated.isPrivacyAgreed,
      validated.isTermsOfUseAgreed,
    );
  }
}
