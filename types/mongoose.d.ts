export type TFilterAllData = {
  filterOr: Record<string, any>[];
  filterAnd: Record<string, any>[];
  page: number;
  limit: number;
};
