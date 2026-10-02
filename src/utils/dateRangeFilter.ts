import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

// Adds bound fromDate/toDate bounds on a date column; never interpolate the
// dates into the SQL string
export const applyDateRangeFilter = <T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  column: string,
  fromDate?: string,
  toDate?: string,
): void => {
  if (fromDate) {
    query.andWhere(`${column} >= :fromDate`, { fromDate });
  }

  if (toDate) {
    query.andWhere(`${column} <= :toDate`, { toDate });
  }
};
