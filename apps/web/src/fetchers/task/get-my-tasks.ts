import { client } from "@kaneo/libs";

async function getMyTasks() {
  const response = await client.task.me.$get();

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getMyTasks;
