import { Pool } from "pg";

import { Show } from "./types/model/show";

const pool = new Pool({
  user: "tvmaze",
  host: "localhost",
  database: "tvmaze_db",
  password: "tvmaze",
  port: 5432
});

export const insertShows = (shows: Show[]) => {
  return Promise.all(
    shows.map(show =>
      pool
        .query(
          "INSERT INTO shows(id, name) VALUES($1, $2) ON CONFLICT (id) DO NOTHING",
          [show.id, show.name]
        )
        .then(() =>
          Promise.all(
            show.cast.map(member =>
              pool
                .query(
                  "INSERT INTO cast_members(id, name, birthday) VALUES($1, $2, $3) ON CONFLICT (id) DO NOTHING;",
                  [member.id, member.name, member.birthday]
                )
                .then(() =>
                  pool.query(
                    "INSERT INTO shows_cast_members(show_id, cast_member_id) VALUES($1, $2) ON CONFLICT (show_id, cast_member_id) DO NOTHING;",
                    [show.id, member.id]
                  )
                )
            )
          )
        )
    )
  ).then(() => pool.end());
};

export const getShows = (limit: number, offset: number) => {
  return pool
    .query("SELECT s.id, s.name FROM shows s LIMIT $1 OFFSET $2", [
      limit,
      offset
    ])
    .then(response =>
      Promise.all(
        response.rows.map(show =>
          pool
            .query(
              `
            SELECT
                c.id,
                c.name,
                c.birthday
            FROM
                cast_members c
                INNER JOIN shows_cast_members scm ON c.id = scm.cast_member_id
                WHERE
                    scm.show_id = $1
                ORDER BY c.birthday DESC NULLS LAST`,
              [show.id]
            )
            .then(data => ({ ...show, cast: data.rows }))
        )
      )
    );
};
