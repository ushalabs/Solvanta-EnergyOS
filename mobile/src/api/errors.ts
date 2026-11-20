// Error shape shared by the on-device engine and the remaining network calls (weather).
// It keeps the old FastAPI error format, so screens show the same messages as before.
export interface ApiProblemDetails {
  error?: {
    code: string;
    message: string;
    status: number;
    details?: Array<{ field?: string; issue?: string }>;
    timestamp?: string;
  };
  detail?: string | Array<{ loc?: Array<string | number>; msg?: string }>;
}

export class SolvantaApiError extends Error {
  status: number;
  data: ApiProblemDetails;

  constructor(status: number, data: ApiProblemDetails) {
    const detail = Array.isArray(data.detail) ? data.detail.map(d => `${d.loc?.join('.') || 'input'}: ${d.msg || 'Invalid value'}`).join('; ') : data.detail;
    const message = data.error?.message || detail || `API request failed with status ${status}`;
    super(message);
    this.name = 'SolvantaApiError';
    this.status = status;
    this.data = data;
  }
}

/** Thrown by the local engine: same status codes the backend used (404, 409, 422). */
export function httpError(status: number, detail: string): SolvantaApiError {
  return new SolvantaApiError(status, { detail });
}
