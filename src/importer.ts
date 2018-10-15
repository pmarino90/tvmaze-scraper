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

import { ClientError, get, Mixed } from "./fetch";
import { CastMember, Show } from "./types/model/show";
import { TVMazeCastMember } from "./types/TVMazeApiResponse/TVMazeCastMember";
import { TVMazeShow } from "./types/TVMazeApiResponse/TVMazeShow";

const RETRY_DELAY = 5000;
const RETRY_BACKOFF = 1000;
const RETRY_TIMES = 5;
interface Status {
  currentPage: number;
  items: Show[];
  error: Option<ClientError>;
}

type FetchError = "unknownError" | "retryError";

const policy = capDelay(
  RETRY_DELAY,
  monoidRetryPolicy.concat(
    exponentialBackoff(RETRY_BACKOFF),
    limitRetries(RETRY_TIMES)
  )
);

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
