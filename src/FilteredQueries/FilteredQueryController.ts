import FilteredQueryDataStore from "./FilteredQueryDataStore";

export const getAll = (req, res) => {
  const filteredQueryDataStore = new FilteredQueryDataStore();

    filteredQueryDataStore.getAll((data, err) => {
    if (err)
       res.status(500).send({
         message: err.message || "Server error occurred while retrieving suitable route."
       });
    else res.status(200).send(data);
  });
};
