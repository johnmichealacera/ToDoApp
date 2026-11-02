import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TableName = process.env.TABLE_NAME;
const ID_PATTERN = /^[\w-]{1,64}$/;

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: body === undefined ? "" : JSON.stringify(body),
});

const toTask = (item) => ({ id: item.taskId, text: item.text, completed: item.completed });

function userIdOf(event) {
  return event.requestContext.authorizer?.jwt?.claims?.sub;
}

function readText(value) {
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, 500);
  return text || null;
}

function readBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString() : event.body;
  return JSON.parse(raw);
}

async function listItems(userId) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const page = await db.send(new QueryCommand({
      TableName,
      KeyConditionExpression: "userId = :u",
      ExpressionAttributeValues: { ":u": userId },
      ExclusiveStartKey,
    }));
    items.push(...page.Items);
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function route(event, userId, body) {
  const id = event.pathParameters?.id;

  switch (event.routeKey) {
    case "GET /tasks":
      return json(200, (await listItems(userId)).map(toTask));

    case "POST /tasks": {
      const text = readText(body.text);
      if (!text) return json(400, { message: "text is required" });
      const taskId = ID_PATTERN.test(body.id ?? "") ? body.id : randomUUID();
      const item = { userId, taskId, text, completed: false, createdAt: new Date().toISOString() };
      await db.send(new PutCommand({ TableName, Item: item, ConditionExpression: "attribute_not_exists(taskId)" }));
      return json(201, toTask(item));
    }

    case "PATCH /tasks/{id}": {
      const sets = [];
      const values = {};
      if (body.text !== undefined) {
        const text = readText(body.text);
        if (!text) return json(400, { message: "text cannot be empty" });
        sets.push("#text = :t");
        values[":t"] = text;
      }
      if (body.completed !== undefined) {
        if (typeof body.completed !== "boolean") return json(400, { message: "completed must be true or false" });
        sets.push("completed = :c");
        values[":c"] = body.completed;
      }
      if (!sets.length) return json(400, { message: "nothing to update" });
      const { Attributes } = await db.send(new UpdateCommand({
        TableName,
        Key: { userId, taskId: id },
        UpdateExpression: `SET ${sets.join(", ")}`,
        ConditionExpression: "attribute_exists(taskId)",
        ExpressionAttributeNames: body.text !== undefined ? { "#text": "text" } : undefined,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      }));
      return json(200, toTask(Attributes));
    }

    case "DELETE /tasks/{id}":
      await db.send(new DeleteCommand({ TableName, Key: { userId, taskId: id } }));
      return json(204);

    case "DELETE /tasks": {
      const done = (await listItems(userId)).filter((item) => item.completed);
      for (const item of done) {
        await db.send(new DeleteCommand({ TableName, Key: { userId, taskId: item.taskId } }));
      }
      return json(200, { deleted: done.length });
    }

    default:
      return json(404, { message: "not found" });
  }
}

export const handler = async (event) => {
  const userId = userIdOf(event);
  if (!userId) return json(401, { message: "sign in first" });
  let body;
  try {
    body = readBody(event);
  } catch {
    return json(400, { message: "body must be JSON" });
  }
  try {
    return await route(event, userId, body);
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return event.routeKey.startsWith("POST") ? json(409, { message: "task already exists" }) : json(404, { message: "task not found" });
    }
    console.error(err);
    return json(500, { message: "something went wrong" });
  }
};