import { Pool } from "pg";

import { Show } from "./types/model/show";

// pools will use environment variables
// for connection information
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
  // you can also use async/await
};
