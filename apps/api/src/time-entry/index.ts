import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import * as v from "valibot";
import { timeEntrySchema } from "../schemas";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import createTimeEntry from "./controllers/create-time-entry";
import deleteTimeEntry from "./controllers/delete-time-entry";
import getActiveTimeEntry from "./controllers/get-active-time-entry";
import getTimeEntriesByTaskId from "./controllers/get-time-entries";
import getTimeEntry from "./controllers/get-time-entry";
import startTimeEntry from "./controllers/start-time-entry";
import stopTimeEntry from "./controllers/stop-time-entry";
import updateTimeEntry from "./controllers/update-time-entry";

const timeEntry = new Hono<{
  Variables: {
    userId: string;
  };
}>()
  .get(
    "/active",
    describeRoute({
      operationId: "getActiveTimeEntry",
      tags: ["Time Entries"],
      description:
        "Get the currently running time entry for the signed-in user (if any)",
      responses: {
        200: {
          description: "Active time entry or null",
          content: {
            "application/json": {
              schema: resolver(v.nullable(timeEntrySchema)),
            },
          },
        },
      },
    }),
    async (c) => {
      const userId = c.get("userId");
      const active = await getActiveTimeEntry(userId);
      return c.json(active);
    },
  )
  .get(
    "/task/:taskId",
    describeRoute({
      operationId: "getTaskTimeEntries",
      tags: ["Time Entries"],
      description: "Get all time entries for a specific task",
      responses: {
        200: {
          description: "List of time entries for the task",
          content: {
            "application/json": { schema: resolver(v.array(timeEntrySchema)) },
          },
        },
      },
    }),
    validator("param", v.object({ taskId: v.string() })),
    workspaceAccess.fromTaskId(),
    async (c) => {
      const { taskId } = c.req.valid("param");
      const timeEntries = await getTimeEntriesByTaskId(taskId);
      return c.json(timeEntries);
    },
  )
  .get(
    "/:id",
    describeRoute({
      operationId: "getTimeEntry",
      tags: ["Time Entries"],
      description: "Get a specific time entry by ID",
      responses: {
        200: {
          description: "Time entry details",
          content: {
            "application/json": { schema: resolver(timeEntrySchema) },
          },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    workspaceAccess.fromTimeEntry(),
    async (c) => {
      const { id } = c.req.valid("param");
      const timeEntry = await getTimeEntry(id);
      return c.json(timeEntry);
    },
  )
  .post(
    "/start",
    describeRoute({
      operationId: "startTimeEntry",
      tags: ["Time Entries"],
      description:
        "Start a new time entry for a task. Auto-stops any other active entry of the user.",
      responses: {
        200: {
          description: "Started time entry",
          content: {
            "application/json": { schema: resolver(timeEntrySchema) },
          },
        },
      },
    }),
    validator(
      "json",
      v.object({
        taskId: v.string(),
        description: v.optional(v.string()),
      }),
    ),
    workspaceAccess.fromTaskId(),
    async (c) => {
      const { taskId, description } = c.req.valid("json");
      const userId = c.get("userId");
      const started = await startTimeEntry({ taskId, userId, description });
      return c.json(started);
    },
  )
  .post(
    "/stop",
    describeRoute({
      operationId: "stopTimeEntry",
      tags: ["Time Entries"],
      description:
        "Stop the active time entry of the signed-in user. If `id` is provided, stops that one.",
      responses: {
        200: {
          description: "Stopped time entry",
          content: {
            "application/json": { schema: resolver(timeEntrySchema) },
          },
        },
      },
    }),
    validator(
      "json",
      v.object({
        id: v.optional(v.string()),
      }),
    ),
    async (c) => {
      const body = c.req.valid("json");
      const userId = c.get("userId");
      const stopped = await stopTimeEntry({
        userId,
        timeEntryId: body.id,
      });
      return c.json(stopped);
    },
  )
  .post(
    "/",
    describeRoute({
      operationId: "createTimeEntry",
      tags: ["Time Entries"],
      description: "Create a new time entry for a task",
      responses: {
        200: {
          description: "Time entry created successfully",
          content: {
            "application/json": { schema: resolver(timeEntrySchema) },
          },
        },
      },
    }),
    validator(
      "json",
      v.object({
        taskId: v.string(),
        startTime: v.string(),
        endTime: v.optional(v.string()),
        description: v.optional(v.string()),
      }),
    ),
    workspaceAccess.fromTaskId(),
    async (c) => {
      const { taskId, startTime, endTime, description } = c.req.valid("json");
      const userId = c.get("userId");
      const timeEntry = await createTimeEntry({
        taskId,
        userId,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : undefined,
        description,
      });
      return c.json(timeEntry);
    },
  )
  .put(
    "/:id",
    describeRoute({
      operationId: "updateTimeEntry",
      tags: ["Time Entries"],
      description: "Update an existing time entry",
      responses: {
        200: {
          description: "Time entry updated successfully",
          content: {
            "application/json": { schema: resolver(timeEntrySchema) },
          },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    validator(
      "json",
      v.object({
        startTime: v.string(),
        endTime: v.optional(v.string()),
        description: v.optional(v.string()),
      }),
    ),
    workspaceAccess.fromTimeEntry(),
    async (c) => {
      const { id } = c.req.valid("param");
      const { startTime, endTime, description } = c.req.valid("json");
      const timeEntry = await updateTimeEntry({
        timeEntryId: id,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : undefined,
        description,
      });
      return c.json(timeEntry);
    },
  )
  .delete(
    "/:id",
    describeRoute({
      operationId: "deleteTimeEntry",
      tags: ["Time Entries"],
      description: "Delete a time entry by ID",
      responses: {
        200: {
          description: "Deleted time entry",
          content: {
            "application/json": { schema: resolver(timeEntrySchema) },
          },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    workspaceAccess.fromTimeEntry(),
    async (c) => {
      const { id } = c.req.valid("param");
      const deleted = await deleteTimeEntry(id);
      return c.json(deleted);
    },
  );

export default timeEntry;
