import type { Metadata } from "next";
import { ProjectDetailView } from "./_components/project-detail-view";

export const metadata: Metadata = {
  title: "Project — Mianatra Manisa",
};

export default async function ProjectPage({
  params,
}: PageProps<"/home/p/[projectId]">) {
  const { projectId } = await params;
  return <ProjectDetailView projectId={projectId} />;
}
