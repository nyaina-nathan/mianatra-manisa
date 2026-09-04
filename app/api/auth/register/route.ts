import { route } from "@/libs/api-handler";
import { createSessionCookie } from "@/libs/auth";
import { createToken } from "@/libs/jwt";
import { usersService } from "@/libs/users/service";
import { readJsonBody } from "@/libs/validation";

export const POST = route(async (req) => {
  const user = await usersService.register(await readJsonBody(req));
  return Response.json(user, {
    status: 201,
    headers: { "Set-Cookie": createSessionCookie(await createToken(user.id)) },
  });
});
