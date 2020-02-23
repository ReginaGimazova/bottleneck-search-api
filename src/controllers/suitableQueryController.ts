import SuitableQueryDataStore from "../dataStores/SuitableQueryDataStore";

export const getAll = async (req, res) => {
  const suitableQueryDataStore = new SuitableQueryDataStore();

  await suitableQueryDataStore.getAll((data, err) => {
    if (err)
       res.status(500).send({
         message: err.message || "Server error occurred while retrieving suitable queries."
       });
    else res.status(200).send(data);
  });
};

export const save = async () => {
  const suitableQueryDataStore = new SuitableQueryDataStore();
  await suitableQueryDataStore.save();
};