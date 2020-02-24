import queries from "./queries";
import tableStatistic from "./tableStatistic";

const routes = app => {
    queries(app);
    tableStatistic(app);
};
export default routes;