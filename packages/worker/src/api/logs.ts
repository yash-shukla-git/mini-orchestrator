import { Request, Response } from 'express';
import { PassThrough } from 'stream';
import { docker } from '../docker/client';
import { logger } from '../logger';

export async function handleLogs(req: Request, res: Response) {
  const { dockerId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let logStream: NodeJS.ReadableStream | null = null;

  try {
    const container = docker.getContainer(dockerId);

    logStream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      timestamps: true,
    }) as unknown as NodeJS.ReadableStream;

    const stdout = new PassThrough();
    const stderr = new PassThrough();

    docker.modem.demuxStream(logStream, stdout, stderr);

    const sendLines = (chunk: Buffer) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line && !res.writableEnded) {
          res.write(`data: ${line}\n\n`);
        }
      }
    };

    stdout.on('data', sendLines);
    stderr.on('data', sendLines);

    stdout.on('end', () => { if (!res.writableEnded) res.end(); });
    stderr.on('end', () => { if (!res.writableEnded) res.end(); });

  } catch (err) {
    logger.error(`Log stream failed for ${dockerId}: ${(err as Error).message}`);
    if (!res.writableEnded) {
      res.write(`data: [error: ${(err as Error).message}]\n\n`);
      res.end();
    }
  }

  req.on('close', () => {
    if (logStream) {
      (logStream as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
    }
  });
}
