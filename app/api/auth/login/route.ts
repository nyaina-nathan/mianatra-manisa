import { route } from "@/libs/api-handler";
import { createSessionCookie } from "@/libs/auth";
import { createToken } from "@/libs/jwt";
import { usersService } from "@/libs/users/service";
import { readJsonBody } from "@/libs/validation";

export const POST = route(async (req) => {
  const user = await usersService.login(await readJsonBody(req));
  return Response.json(user, {
    headers: { "Set-Cookie": createSessionCookie(await createToken(user.id)) },
  });
});
