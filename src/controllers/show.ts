import express, { Request, Response } from "express";

import { getShows } from "../database";

const router = express.Router();

const DEFAULT_LIMIT = 100;
const DEFAULT_OFFSET = 0;

router.get("/shows", (req: Request, res: Response) => {
  const { limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET } = req.query;
  getShows(limit, offset).then(data => res.send(data));
});

export default router;
