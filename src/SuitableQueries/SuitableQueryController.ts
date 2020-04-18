import SuitableQueryDataStore from "./SuitableQueryDataStore";

export const getAll = (req, res) => {
  const suitableQueryDataStore = new SuitableQueryDataStore();

  suitableQueryDataStore.getAll((data, err) => {
    if (err)
       res.status(500).send({
         message: err.message || "Server error occurred while retrieving suitable route."
       });
    else res.status(200).send(data);
  });
};
