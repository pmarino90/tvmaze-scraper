-- Create unprivileged role for the application
CREATE ROLE tvmaze WITH LOGIN PASSWORD 'tvmaze';

-- Create database and grant access to the app user
CREATE DATABASE tvmaze_db;
GRANT ALL PRIVILEGES ON DATABASE tvmaze_db TO tvmaze;