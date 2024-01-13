import express from "express";

const userRouter = express.Router();

userRouter.get("/", function (req, res, next) {
  res.json({ user: "respond with a resource" });
});

export { userRouter };
