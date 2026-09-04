export class ApiError extends Error {
  readonly title: string;
  readonly status: number;
  readonly origin: string;

  constructor({
    title,
    status,
    message,
    origin,
  }: {
    title: string;
    status: number;
    message: string;
    origin: string;
  }) {
    super(message);
    this.name = "ApiError";
    this.title = title;
    this.status = status;
    this.origin = origin;
  }

  toResponse(): Response {
    return Response.json(
      {
        title: this.title,
        status: this.status,
        message: this.message,
        origin: this.origin,
      },
      { status: this.status }
    );
  }

  static badRequest(message: string, origin = "validation"): ApiError {
    return new ApiError({ title: "Bad Request", status: 400, message, origin });
  }

  static unauthorized(
    message = "Missing, invalid, or expired session",
    origin = "auth"
  ): ApiError {
    return new ApiError({ title: "Unauthorized", status: 401, message, origin });
  }

  static notFound(message = "Resource not found", origin = "database"): ApiError {
    return new ApiError({ title: "Not Found", status: 404, message, origin });
  }

  static conflict(message: string, origin = "database"): ApiError {
    return new ApiError({ title: "Conflict", status: 409, message, origin });
  }
}
