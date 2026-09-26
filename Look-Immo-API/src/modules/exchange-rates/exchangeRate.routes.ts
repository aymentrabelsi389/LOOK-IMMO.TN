import { Router } from 'express';
import * as exchangeRateController from './exchangeRate.controller';

const router = Router();

router.get('/exchange-rates', exchangeRateController.getExchangeRates);

export default router;
