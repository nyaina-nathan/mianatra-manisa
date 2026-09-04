export type ProjectRow = {
  id: string;
  id_user: string;
  title: string;
  description: string | null;
  started_on: Date | null;
};

export type ProjectRowWithCount = ProjectRow & {
  _count: { counts: number };
};

export type Project = {
  id: string;
  id_user: string;
  title: string;
  description: string | null;
  started_on: string | null;
};

export type ProjectWithCount = Project & {
  total_count: number;
};

export type ProjectList = {
  items: ProjectWithCount[];
  total: number;
};

export type CreateProjectInput = {
  title: string;
  description?: string;
  started_on?: string;
};

export type UpdateProjectInput = {
  title?: string;
  description?: string | null;
  started_on?: string | null;
};

export type ListProjectsQuery = {
  search?: string;
  limit: number;
  offset: number;
};
