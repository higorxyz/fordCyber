export class ApiError extends Error {
  status: number;
  code: string;
  safeMessage: string;

  constructor(status: number, code: string, safeMessage: string) {
    super(code);
    this.status = status;
    this.code = code;
    this.safeMessage = safeMessage;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return Boolean(err && typeof err === "object" && "status" in err && "code" in err);
}
