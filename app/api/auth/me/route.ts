import { route } from "@/libs/api-handler";
import { requireUserId } from "@/libs/auth";
import { usersService } from "@/libs/users/service";

export const GET = route(async (req) => {
  const userId = await requireUserId(req);
  return Response.json(await usersService.getCurrent(userId));
});
