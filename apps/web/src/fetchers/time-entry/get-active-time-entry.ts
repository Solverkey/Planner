import { client } from "@kaneo/libs";

async function getActiveTimeEntry() {
  const response = await client["time-entry"].active.$get();

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getActiveTimeEntry;
