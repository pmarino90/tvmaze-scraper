import { Either, either, left, right } from "fp-ts/lib/Either";
import { tuple } from "fp-ts/lib/function";
import { none, Option, option, some } from "fp-ts/lib/Option";
import { Task, task } from "fp-ts/lib/Task";
import { TaskEither, taskEither } from "fp-ts/lib/TaskEither";
import { sequence } from "fp-ts/lib/Traversable";
import fetch, { Response } from "node-fetch";
import {
  capDelay,
  exponentialBackoff,
  limitRetries,
  monoidRetryPolicy
} from "retry-ts";
import { retrying } from "retry-ts/lib/TaskEither";

import { TVMazeCastMember } from "./types/TVMazeCastMember";
import { TVMazeShow } from "./types/TVMazeShow";

const RETRY_DELAY = 5000;
const RETRY_BACKOFF = 1000;
const RETRY_TIMES = 5;

export type Mixed =
  | { [key: string]: any }
  | object
  | number
  | string
  | boolean
  | null;

interface ClientError {
  type: string;
}

interface CastMember {
  id: number;
  name: string;
  birthday: string;
}

interface Show {
  id: number;
  name: string;
  cast: CastMember[];
}

interface Status {
  currentPage: number;
  items: Show[];
  error: Option<ClientError>;
}

type FetchError = "unknownError" | "retryError";

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

const policy = capDelay(
  RETRY_DELAY,
  monoidRetryPolicy.concat(
    exponentialBackoff(RETRY_BACKOFF),
    limitRetries(RETRY_TIMES)
  )
);

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

const get = <T>(url: string) => new TaskEither(buildRequest<T>("GET", url));

const parseShowsResponse = (items: TVMazeShow[]): Show[] =>
  items.map(({ id, name }) => ({ id, name, cast: [] }));

const parseCastMembersResponse = (items: TVMazeCastMember[]): CastMember[] =>
  items.map(({ person }) => ({
    id: person.id,
    name: person.name,
    birthday: person.birthday
  }));

const fetchShowPage = (page: number) => {
  return retrying(
    policy,
    () =>
      get<TVMazeShow[]>(`http://api.tvmaze.com/shows?page=${page}`).map(
        parseShowsResponse
      ),
    e =>
      e.fold(
        (error: ClientError) => error.type === "RateLimitError",
        () => false
      )
  );
};

const fetchShowCastMembers = (show: Show) => {
  return retrying(
    policy,
    () =>
      get<TVMazeCastMember[]>(
        `http://api.tvmaze.com/shows/${show.id}/cast`
      ).map(parseCastMembersResponse),
    e =>
      e.fold(
        (error: ClientError) => error.type === "RateLimitError",
        () => false
      )
  );
};

const foldApiError = <R>(
  error: ClientError,
  notFound: () => R,
  rateLimit: () => R,
  unknown: () => R
): R => {
  switch (error.type) {
    case "NotFoundError":
      return notFound();
    case "RateLimitError":
      return rateLimit();
    case "UnknownError":
      return unknown();
  }
};

const initialStatus: Status = {
  currentPage: 1,
  items: [],
  error: none
};

const collectShows = (status: Status, items: Show[]): Status => ({
  currentPage: status.currentPage + 1,
  items: status.items.concat(items),
  error: none
});

const setError = (status: Status, error: Option<ClientError>): Status => ({
  ...status,
  error
});

const setCast = (show: Show, cast: CastMember[]): Show => ({ ...show, cast });

function scrapeShowsApi(): Task<[Show[], Option<FetchError>]> {
  const runStatus = (status: Status): Task<Status> => {
    return fetchShowPage(status.currentPage).fold(
      error => setError(status, some(error)),
      items => collectShows(status, items)
    );
  };

  const run = (status: Status): Task<[Show[], Option<FetchError>]> => {
    return status.error.foldL(
      () => runStatus(status).chain(run),
      error =>
        task.of(
          tuple(
            status.items,
            foldApiError(
              error,
              () => none,
              () => some<FetchError>("retryError"),
              () => some<FetchError>("unknownError")
            )
          )
        )
    );
  };

  return run(initialStatus);
}

scrapeShowsApi()
  .run()
  .then(([shows, error]) => console.log(`Total shows: ${shows.length}`));