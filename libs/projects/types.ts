export type ProjectRow = {
  id: string;
  id_user: string;
  title: string;
  description: string | null;
  started_on: Date | null;
};

export type Project = {
  id: string;
  id_user: string;
  title: string;
  description: string | null;
  started_on: string | null;
};

export type ProjectList = {
  items: Project[];
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
