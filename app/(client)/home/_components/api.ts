export class ApiClientError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }

  get isExpired(): boolean {
    return this.status === 401;
  }
}

export const GENERIC_ERROR = "Something went wrong. Please try again.";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: init.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    throw new ApiClientError(0, GENERIC_ERROR);
  }
  if (response.status === 204) {
    return null as T;
  }
  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as { message?: string } | null;
    throw new ApiClientError(response.status, body?.message ?? GENERIC_ERROR);
  }
  return (await response.json()) as T;
}
