import express from "express";
import showController from "./controllers/show";

const app = express();

app.use("/", showController);

export default app;
