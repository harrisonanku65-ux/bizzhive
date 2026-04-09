import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import vendorsRouter from "./vendors";
import coursesRouter from "./courses";
import productsRouter from "./products";
import cartRouter from "./cart";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(vendorsRouter);
router.use(coursesRouter);
router.use(productsRouter);
router.use(cartRouter);
router.use(dashboardRouter);

export default router;
