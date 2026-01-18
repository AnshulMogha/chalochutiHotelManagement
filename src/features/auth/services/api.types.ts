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
  accessToken: string;
  accessTokenExpiry: string;
}

export interface SuperAdminLoginRequest {
  email: string;
  password: string;
}

export interface SuperAdminLoginResponse {
  accessToken?: string;
  accessTokenExpiry?: string;
  tempToken?: string;
  tempTokenExpiry?: string;
}
