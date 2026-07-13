import { Router } from 'express';
import { handleDeploy } from './deploy';
import { listContainers, killContainer, pruneContainers } from './containers';
import { handleScale } from './scale';
import { listNodes } from './nodes';
import { getMetrics } from './metrics';
import { streamLogs } from './logs';
import { handleRegister, handleHeartbeat } from '../worker-registry/index';

const router = Router();

router.post('/deploy', handleDeploy);
router.get('/containers', listContainers);
router.post('/containers/prune', pruneContainers);
router.delete('/container/:id', killContainer);
router.post('/scale', handleScale);
router.get('/nodes', listNodes);
router.get('/metrics', getMetrics);
router.get('/logs/:containerId', streamLogs);

router.post('/worker/register', handleRegister);
router.post('/worker/heartbeat', handleHeartbeat);

router.get('/health', (_req, res) => res.json({ ok: true }));

export default router;
