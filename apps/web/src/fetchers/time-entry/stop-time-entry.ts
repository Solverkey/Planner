import { client } from "@kaneo/libs";

type StopTimeEntryRequest = {
  id?: string;
};

async function stopTimeEntry({ id }: StopTimeEntryRequest = {}) {
  const response = await client["time-entry"].stop.$post({
    json: id !== undefined ? { id } : {},
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default stopTimeEntry;
