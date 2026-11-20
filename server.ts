import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  evaluateChallengeDefence,
  generateChallengeQuestions,
  generateFinalStrategyReview,
  mapGeminiError,
} from './server/geminiChallenger.ts';
import type {
  ChallengeFeedbackResult,
  GeneratedChallengeQuestion,
  StrategyChallengeContextPayload,
} from './server/geminiChallenger.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // POST /api/strategy-challenge/questions
  app.post(
    '/api/strategy-challenge/questions',
    async (req: Request, res: Response) => {
      try {
        const body = req.body as { context?: StrategyChallengeContextPayload };
        if (!body?.context) {
          res.status(400).json({ error: 'Missing workspace context payload.' });
          return;
        }
        const questions = await generateChallengeQuestions(body.context);
        res.json({ questions });
      } catch (error) {
        const mapped = mapGeminiError(error);
        res.status(mapped.statusCode).json({ error: mapped.message });
      }
    },
  );

  // POST /api/strategy-challenge/feedback
  app.post(
    '/api/strategy-challenge/feedback',
    async (req: Request, res: Response) => {
      try {
        const body = req.body as {
          context?: StrategyChallengeContextPayload;
          question?: GeneratedChallengeQuestion;
          defence?: string;
        };
        if (
          !body?.context ||
          !body?.question?.question ||
          !body?.defence?.trim()
        ) {
          res.status(400).json({
            error: 'Missing context, challenge question, or defence response.',
          });
          return;
        }
        const feedback = await evaluateChallengeDefence({
          context: body.context,
          question: body.question,
          defence: body.defence.trim(),
        });
        res.json({ feedback });
      } catch (error) {
        const mapped = mapGeminiError(error);
        res.status(mapped.statusCode).json({ error: mapped.message });
      }
    },
  );

  // POST /api/strategy-challenge/review
  app.post(
    '/api/strategy-challenge/review',
    async (req: Request, res: Response) => {
      try {
        const body = req.body as {
          context?: StrategyChallengeContextPayload;
          challenges?: Array<{
            focusArea: string;
            question: string;
            defence: string;
            feedback: ChallengeFeedbackResult;
          }>;
        };
        if (
          !body?.context ||
          !Array.isArray(body?.challenges) ||
          body.challenges.length < 3
        ) {
          res.status(400).json({
            error:
              'All 3 completed challenges with defences and feedback are required for the Final Strategy Review.',
          });
          return;
        }
        const review = await generateFinalStrategyReview({
          context: body.context,
          challenges: body.challenges,
        });
        res.json({ review });
      } catch (error) {
        const mapped = mapGeminiError(error);
        res.status(mapped.statusCode).json({ error: mapped.message });
      }
    },
  );

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    const indexPath = path.join(distDir, 'index.html');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SpiceBridge server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SpiceBridge server:', err);
  process.exit(1);
});
