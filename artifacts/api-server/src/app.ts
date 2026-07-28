import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { startDeliveryAutoRelease } from "./lib/deliveryAutoRelease";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());

const SESSION_SECRET = process.env["SESSION_SECRET"] || "bizzhive-dev-secret-change-in-production";
const IS_PRODUCTION = process.env["NODE_ENV"] === "production";

// Anyone holding the session secret can forge cookies — including admin
// sessions, which can release and refund money. Refuse to boot rather than
// run production on the well-known development default.
if (IS_PRODUCTION && SESSION_SECRET === "bizzhive-dev-secret-change-in-production") {
  throw new Error(
    "SESSION_SECRET is still the development default. Set a long random value before deploying.",
  );
}

// "lax" is right when the API and frontend share a domain. If they're split
// across domains, cookies need sameSite "none" (which browsers only accept
// over HTTPS) or nobody stays signed in.
const SAME_SITE = (process.env["SESSION_COOKIE_SAMESITE"] ?? "lax") as
  | "lax"
  | "none"
  | "strict";

// Behind a proxy or load balancer, Express needs this to see the real client
// IP (for rate limiting) and to know the connection was HTTPS (for `secure`).
if (IS_PRODUCTION) app.set("trust proxy", 1);

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: IS_PRODUCTION || SAME_SITE === "none",
    sameSite: SAME_SITE,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Started once, after the app is wired. (It was previously invoked twice —
// at import time and again here — which ran two competing release timers.)
startDeliveryAutoRelease();

export default app;
