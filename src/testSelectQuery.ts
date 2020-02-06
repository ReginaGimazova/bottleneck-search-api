import { FilteredOriginalQuery } from './entity/FilteredOriginalQuery';
import { getSelectQueries, getTableList } from './parser';
import * as fs from 'fs';

export const getOriginalQuery = () => {
  const sql = fs.readFileSync('/home/regagim/Рабочий стол/test.sql').toString();
  const selectStrings = getSelectQueries(sql);

  for (const selectString of selectStrings) {
    const originalRequest = new FilteredOriginalQuery();
    originalRequest.queryText = selectString;

    const tables = getTableList(selectString);
    console.log(tables)
  }
};
