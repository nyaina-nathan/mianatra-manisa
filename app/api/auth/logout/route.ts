import { route } from "@/libs/api-handler";
import { clearSessionCookie } from "@/libs/auth";

export const POST = route(async () => {
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": clearSessionCookie() },
  });
});
