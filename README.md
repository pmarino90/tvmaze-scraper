# TVMaze scraper

## requirements

- node.js
- postgres

## install

### Install postgres

On Mac

```
brew install postgres
```

### Install app dependencies

```bash
yarn
```

### Database

Run the init sql file `sql/initialize.sql` to create the role and the database used by the application.
Run the the tables creation sql file `sql/tables.sql` to create the tables in the `tvmaze_db` database.

Client configuration have a default value in the code in `src/database.ts`, however they can be overridden with  
env variables like so:

```bash
PGUSER=dbuser \
  PGHOST=database.server.com \
  PGPASSWORD=secretpassword \
  PGDATABASE=mydb \
  PGPORT=3211 \
  yarn start:dev
```

## Run

To run the importer run `yarn run:importer`

to start the server `yarn start:dev`, will be listening on port `3000`, to change it set the `PORT` env variable to  
the preferred value.

## API

The Show API will be available at `http://localhost:3000/shows`. Default limit `100`, it is
possible to change page by using `limit` and `offset` as query parameters.

Example: `http://localhost:3000/shows?offset=10&limit=10` gets the second page.

Cast members are ordered by birthday descending with null values at last.
