import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import vendorsRouter from "./vendors";
import coursesRouter from "./courses";
import productsRouter from "./products";
import cartRouter from "./cart";
import dashboardRouter from "./dashboard";
import paymentsRouter from "./payments";
import payoutsRouter from "./payouts";
import authRouter from "./auth";
import uploadsRouter from "./uploads";
import adminRouter from "./admin";
import sessionsRouter from "./sessions";
import reviewsRouter from "./reviews";
import supportRouter from "./support";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(vendorsRouter);
router.use(coursesRouter);
router.use(productsRouter);
router.use(cartRouter);
router.use(dashboardRouter);
router.use(paymentsRouter);
router.use(payoutsRouter);
router.use(uploadsRouter);
// These add further /vendors/:id/* sub-paths. Express matches per path
// segment, so /vendors/:id in vendorsRouter does not shadow them.
router.use(sessionsRouter);
router.use(reviewsRouter);
router.use(supportRouter);
router.use(adminRouter);

export default router;
