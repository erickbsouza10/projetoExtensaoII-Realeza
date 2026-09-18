export interface Course {
  id: string;
  name: string;
  code: string;
  totalSemesters: number;
}
export interface UserProfile {
  id: string;
  registration: string;
  name: string;
  email: string | null;
  course: Course | null;
  semester: number | null;
  role: 'STUDENT' | 'ADMIN' | 'SUPER_ADMIN';
}
export interface AuthSession {
  accessToken: string;
  user: UserProfile;
}
export interface LoginInput {
  registration: string;
  password: string;
}
export interface RegisterInput extends LoginInput {
  name: string;
  courseId: string;
  semester: number;
}
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
let token: string | null = null;
let unauthorized: (() => void) | null = null;
export function setApiToken(value: string | null) {
  token = value;
}
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorized = handler;
}
export async function api<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown; authenticated?: boolean } = {},
): Promise<T> {
  const requestToken = options.authenticated ? token : null;
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      signal: AbortSignal.timeout(15000),
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Não foi possível conectar ao reino. Verifique sua conexão e tente novamente.',
    );
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && options.authenticated && token === requestToken)
      unauthorized?.();
    throw new ApiError(
      response.status,
      data?.code ?? 'API_ERROR',
      Array.isArray(data?.message)
        ? data.message.join(' ')
        : (data?.message ?? 'Não foi possível concluir a solicitação.'),
    );
  }
  if (data === null)
    throw new ApiError(
      response.status,
      'INVALID_RESPONSE',
      'O servidor retornou uma resposta inválida.',
    );
  return data as T;
}
