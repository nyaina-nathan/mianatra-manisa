import { route } from "@/libs/api-handler";
import { requireUserId } from "@/libs/auth";
import { countsService } from "@/libs/counts/service";
import { readJsonBody } from "@/libs/validation";

export const GET = route<{ projectId: string }>(async (req, { params }) => {
  const userId = await requireUserId(req);
  const { projectId } = await params;
  return Response.json(
    await countsService.list(projectId, userId, req.nextUrl.searchParams)
  );
});

export const POST = route<{ projectId: string }>(async (req, { params }) => {
  const userId = await requireUserId(req);
  const { projectId } = await params;
  const body = await readJsonBody(req);
  const count = await countsService.create(projectId, userId, body);
  return Response.json(count, { status: 201 });
});
