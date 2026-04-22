export interface GetAccessTokenResponse {
  accessTokenExpiry: string;
  accessToken: string;
}
export interface SendOtpResponse {
  tempToken: string;
  tempTokenExpiry: string;
}
export interface SendOtpRequest {
  email: string;
}
export interface VerifyOtpRequest {
  otp: string;
  tempToken: string;
}
export interface VerifyOtpResponse {
  accessToken?: string;
  accessTokenExpiry?: string;
  pwdChangeToken?: string;
  pwdChangeExpiry?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken?: string;
  accessTokenExpiry?: string;
  tempToken?: string;
  tempTokenExpiry?: string;
  pwdChangeToken?: string;
  pwdChangeExpiry?: string;
}

export interface ChangePasswordRequest {
  pwdChangeToken: string;
  oldPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  resetToken: string;
  resetTokenExpiry?: string;
}

export interface VerifyResetOtpRequest {
  resetToken: string;
  otp: string;
}

export interface VerifyResetOtpResponse {
  resetToken?: string;
  resetTokenExpiry?: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  otp: string;
  newPassword: string;
}

export interface ResendPasswordResetOtpRequest {
  resetToken: string;
}
