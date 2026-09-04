import { route } from "@/libs/api-handler";
import { requireUserId } from "@/libs/auth";
import { projectsService } from "@/libs/projects/service";
import { readJsonBody } from "@/libs/validation";

export const GET = route(async (req) => {
  const userId = await requireUserId(req);
  return Response.json(
    await projectsService.list(userId, req.nextUrl.searchParams)
  );
});

export const POST = route(async (req) => {
  const userId = await requireUserId(req);
  const body = await readJsonBody(req);
  const project = await projectsService.create(userId, body);
  return Response.json(project, { status: 201 });
});
