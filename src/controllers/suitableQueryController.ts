import SuitableQueryDataStore from "../dataStores/SuitableQueryDataStore";

export const getAll = async (req, res) => {
  const suitableQueryDataStore = new SuitableQueryDataStore();

  await suitableQueryDataStore.getAll((data, err) => {
    if (err)
       res.status(500).send({
         message: err.message || "Some error occurred while retrieving customers."
       });
    else res.status(200).send(data);
  });
};
