import { route } from "@/libs/api-handler";
import { requireUserId } from "@/libs/auth";
import { countsService } from "@/libs/counts/service";
import { readJsonBody } from "@/libs/counts/validation";

export const GET = route<{ projectId: string; countId: string }>(
  async (req, { params }) => {
    const userId = await requireUserId(req);
    const { projectId, countId } = await params;
    return Response.json(await countsService.get(projectId, userId, countId));
  }
);

export const PATCH = route<{ projectId: string; countId: string }>(
  async (req, { params }) => {
    const userId = await requireUserId(req);
    const { projectId, countId } = await params;
    const body = await readJsonBody(req);
    return Response.json(
      await countsService.update(projectId, userId, countId, body)
    );
  }
);

export const DELETE = route<{ projectId: string; countId: string }>(
  async (req, { params }) => {
    const userId = await requireUserId(req);
    const { projectId, countId } = await params;
    await countsService.remove(projectId, userId, countId);
    return new Response(null, { status: 204 });
  }
);
