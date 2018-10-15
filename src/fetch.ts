import { Either, left, right } from "fp-ts/lib/Either";
import { Task } from "fp-ts/lib/Task";
import { TaskEither } from "fp-ts/lib/TaskEither";
import fetch, { Response } from "node-fetch";

export type Mixed =
  | { [key: string]: any }
  | object
  | number
  | string
  | boolean
  | null;

export interface ClientError {
  type: string;
}

export class NotFoundError implements ClientError {
  readonly type: "NotFoundError" = "NotFoundError";
  constructor(readonly url: string, readonly response: Response) {}
}

export class RateLimitError implements ClientError {
  readonly type: "RateLimitError" = "RateLimitError";
  constructor(url: string, readonly response: Response) {}
}

export class UnknownError implements ClientError {
  readonly type: "UnknownError" = "UnknownError";
  constructor(url: string, readonly response: Response) {}
}

const parseBody = (body: string): Mixed => {
  try {
    return JSON.parse(body);
  } catch (err) {
    return body;
  }
};

const buildRequest = <T>(
  method: string,
  url: string
): Task<Either<ClientError, T>> =>
  new Task(() =>
    fetch(url, { method })
      .then(response =>
        response
          .text()
          .then(parseBody)
          .then(body => ({ response, body }))
      )
      .then(({ response, body }) => {
        if (response.ok) {
          return right<ClientError, T>(body as T);
        }

        if (response.status === 404) {
          throw new NotFoundError(url, response);
        } else if (response.status === 429) {
          throw new RateLimitError(url, response);
        } else if (response.status >= 500) {
          throw new UnknownError(url, response);
        }
      })
      .catch(err => left<ClientError, T>(err))
  );

export const get = <T>(url: string) =>
  new TaskEither(buildRequest<T>("GET", url));
