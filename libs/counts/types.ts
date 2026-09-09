export type CountRow = {
  id: string;
  id_project: string;
  logged_on: Date | null;
  description: string | null;
};

export type Count = {
  id: string;
  id_project: string;
  logged_on: string | null;
  description: string | null;
};

export type CountList = {
  items: Count[];
  total: number;
};

export type CreateCountInput = {
  logged_on?: string;
  description?: string;
};

export type UpdateCountInput = {
  logged_on?: string | null;
  description?: string | null;
};

export type ListCountsQuery = {
  before?: string;
  after?: string;
  limit: number;
  offset: number;
};
