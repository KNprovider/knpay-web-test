// src/types/auth.ts
export type UserType = 'privat' | 'erhverv';

export interface LoginFormData {
  email: string;
  userType: UserType;
  companyName?: string;
  cvr?: string;
}

export interface VerificationData {
  email: string;
  code: string;
}
