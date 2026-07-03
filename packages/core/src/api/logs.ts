import { Request, Response } from 'express';
import http from 'http';
import https from 'https';
import { Container } from '../db/models/Container';
import { Node } from '../db/models/Node';

export async function streamLogs(req: Request, res: Response) {
  const { containerId } = req.params;

  const container = await Container.findById(containerId);
  if (!container) {
    return res.status(404).json({ error: 'Container not found' });
  }

  const node = await Node.findById(container.nodeId);
  if (!node || node.status === 'lost') {
    return res.status(503).json({ error: 'Node is not available' });
  }

  const workerLogsUrl = `http://${node.host}:${node.port}/logs/${container.dockerId}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const protocol = workerLogsUrl.startsWith('https') ? https : http;

  const workerReq = protocol.get(workerLogsUrl, (workerRes) => {
    workerRes.on('data', (chunk: Buffer) => {
      if (!res.writableEnded) {
        res.write(chunk);
      }
    });

    workerRes.on('end', () => {
      if (!res.writableEnded) res.end();
    });

    workerRes.on('error', () => {
      if (!res.writableEnded) res.end();
    });
  });

  workerReq.on('error', () => {
    if (!res.writableEnded) {
      res.write('data: [error: could not connect to worker]\n\n');
      res.end();
    }
  });

  req.on('close', () => {
    workerReq.destroy();
  });
}
