# TVMaze scraper

## requirements

- node.js
- postgres

## install

### Install app dependencies

```bash
yarn
```

### Database

Run the init sql file `sql/initialize.sql` in the database

## Run

To run the importer run `yarn run:importer`

to start the server `yarn start:dev`

## API

The API will be available at `http://localhost:3000/shows`. Default limit `100`, it is
possible to change page by using `limit` and `offset` as query parameters (`http://localhost:3000/shows?limit=20&offset=40`).

Cast members are ordered by birthday descending with null values at last.
