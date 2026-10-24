export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
}

export interface UpdateProfilePayload {
  name: string;
  email?: string;
}

export interface UpdateProfileResponse {
  message: string;
  user: User;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface DeleteAccountPayload {
  password: string;
}

export interface DeleteAccountResponse {
  message: string;
}

export interface ApiErrorResponse {
  error?: string;
  message?: string;
}

export class ApiError extends Error {
  status: number;
  data?: ApiErrorResponse;

  constructor(message: string, status: number, data?: ApiErrorResponse) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}
