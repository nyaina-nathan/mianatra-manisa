import { route } from "@/libs/api-handler";
import { requireUserId } from "@/libs/auth";
import { projectsService } from "@/libs/projects/service";
import { readJsonBody } from "@/libs/validation";

export const GET = route<{ projectId: string }>(async (req, { params }) => {
  const userId = await requireUserId(req);
  const { projectId } = await params;
  return Response.json(await projectsService.get(userId, projectId));
});

export const PATCH = route<{ projectId: string }>(async (req, { params }) => {
  const userId = await requireUserId(req);
  const { projectId } = await params;
  const body = await readJsonBody(req);
  return Response.json(await projectsService.update(userId, projectId, body));
});

export const DELETE = route<{ projectId: string }>(async (req, { params }) => {
  const userId = await requireUserId(req);
  const { projectId } = await params;
  await projectsService.remove(userId, projectId);
  return new Response(null, { status: 204 });
});
