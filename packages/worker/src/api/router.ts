import { Router } from 'express';
import { handleRun } from './run';
import { handleKill } from './kill';
import { handleHealth } from './health';
import { handleStats } from './stats';
import { handleLogs } from './logs';

const router = Router();

router.post('/run', handleRun);
router.delete('/container/:dockerId', handleKill);
router.get('/health', handleHealth);
router.get('/stats', handleStats);
router.get('/logs/:dockerId', handleLogs);

export default router;
