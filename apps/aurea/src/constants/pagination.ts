export const DEFAULT_LIST_PAGE_SIZE = 20;
export const LIST_PAGE_PARAM = 'page';
export const FIRST_LIST_PAGE = 1;

export const clampListPage = (value: number) =>
  Number.isFinite(value) && value > 0 ? Math.floor(value) : FIRST_LIST_PAGE;

export const parseListPage = (value: string | null | undefined) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return clampListPage(parsed);
};
