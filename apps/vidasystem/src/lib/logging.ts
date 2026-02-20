export type LogFieldFilter = {
  include?: string[];
  exclude?: string[];
};

const isIncluded = (key: string, filter?: LogFieldFilter) => {
  if (filter?.include && !filter.include.includes(key)) {
    return false;
  }
  if (filter?.exclude && filter.exclude.includes(key)) {
    return false;
  }
  return true;
};

const isEqualValue = (left: unknown, right: unknown) => {
  if (left === right) return true;
  if (left == null && right == null) return true;
  if (typeof left !== 'object' || typeof right !== 'object') return false;

  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

export const buildLogSnapshot = <T extends Record<string, any>>(
  record?: T | null,
  filter?: LogFieldFilter
) => {
  if (!record) return undefined;

  const snapshot: Record<string, any> = {};
  Object.keys(record).forEach((key) => {
    if (!isIncluded(key, filter)) return;
    const value = record[key];
    snapshot[key] = value === undefined ? null : value;
  });

  return Object.keys(snapshot).length > 0 ? snapshot : undefined;
};

export const buildLogDiff = <T extends Record<string, any>>(
  oldRecord?: T | null,
  newRecord?: T | null,
  filter?: LogFieldFilter
) => {
  if (!oldRecord && !newRecord) {
    return { oldData: undefined, newData: undefined };
  }

  const oldData: Record<string, any> = {};
  const newData: Record<string, any> = {};
  const keys = new Set<string>();

  if (oldRecord) {
    Object.keys(oldRecord).forEach((key) => keys.add(key));
  }
  if (newRecord) {
    Object.keys(newRecord).forEach((key) => keys.add(key));
  }

  keys.forEach((key) => {
    if (!isIncluded(key, filter)) return;
    const oldValue = oldRecord ? oldRecord[key] : undefined;
    const newValue = newRecord ? newRecord[key] : undefined;

    if (!isEqualValue(oldValue, newValue)) {
      oldData[key] = oldValue === undefined ? null : oldValue;
      newData[key] = newValue === undefined ? null : newValue;
    }
  });

  return {
    oldData: Object.keys(oldData).length > 0 ? oldData : undefined,
    newData: Object.keys(newData).length > 0 ? newData : undefined,
  };
};
