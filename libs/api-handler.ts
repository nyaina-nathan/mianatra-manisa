import type { NextRequest } from "next/server";
import { ApiError } from "./api-error";

type RouteContext<P> = { params: Promise<P> };
type Controller<P> = (
  req: NextRequest,
  ctx: RouteContext<P>
) => Promise<Response>;

export function route<P = Record<string, never>>(
  controller: Controller<P>
): Controller<P> {
  return async (req, ctx) => {
    try {
      return await controller(req, ctx);
    } catch (error) {
      if (error instanceof ApiError) {
        return error.toResponse();
      }
      console.error(error);
      return Response.json(
        {
          title: "Internal Server Error",
          status: 500,
          message: "An unexpected error occurred",
          origin: "unknown",
        },
        { status: 500 }
      );
    }
  };
}
