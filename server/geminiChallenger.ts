import { GoogleGenAI, Type } from '@google/genai';

export interface StrategyChallengeContextPayload {
  ventureMission: string;
  selectedLot: {
    id: string;
    farmerName: string;
    cropLabel: string;
    variety: string;
    clusterGeography: string;
    quantityKg: number;
    bagCount: number;
    moisturePercent: number;
    moistureNote: string;
    qualityStatus: string;
    purityPercent: number;
    foreignMatterNote: string;
    aromaGrade: string;
    offeredPricePerKg: number;
    mandiNetPricePerKg: number | null;
    priceNote: string;
    bankTransferStatus: string;
  } | null;
  lotBankSummary: {
    totalLots: number;
    passLots: number;
    holdLots: number;
    clusters: string[];
    crops: string[];
  };
  alternatives: Array<{
    name: string;
    type: string;
    priceCost: string;
    mainOffer: string;
    mainStrength: string;
    mainWeakness: string;
    evidenceSource: string;
    evidenceQuality: string;
  }>;
  battlefieldMap: {
    xAxisName: string;
    xLeftLabel: string;
    xRightLabel: string;
    yAxisName: string;
    yBottomLabel: string;
    yTopLabel: string;
    spiceBridgeScore: { x: number | null; y: number | null };
    alternativeScores: Array<{
      name: string;
      type: string;
      x: number | null;
      y: number | null;
    }>;
  };
  positioningStatement: {
    targetCustomer: string;
    category: string;
    primaryBenefit: string;
    mainAlternativeName: string;
    reasonToBelieve: string;
    finalStatement: string;
  };
}

export interface GeneratedChallengeQuestion {
  id: string;
  focusArea: string;
  question: string;
}

export interface ChallengeFeedbackResult {
  supported: string;
  assumption: string;
  nextEvidenceNeeded: string;
}

export interface FinalStrategyReviewResult {
  strongestPart: string;
  biggestAssumption: string;
  nextValidationPriority: string;
}

const MODEL_NAME = 'gemini-4-hydrogen';

const CHALLENGER_SYSTEM_INSTRUCTION = `You are a rigorous, skeptical B2B AgriTech strategy challenger evaluating SpiceBridge's competitive positioning.

STRICT GROUNDING RULES (MUST NEVER BE VIOLATED):
1. Use ONLY the facts, numbers, entities, evidence, map coordinates, and wording explicitly provided in the user's JSON context.
2. NEVER invent competitors, prices, customer preferences, market statistics, survey results, external market facts, certifications, or venture capabilities that are not in the JSON context.
3. NEVER write or rewrite the user's strategy as an answer for them, and NEVER tell them what their winning answer should be.
4. NEVER predict whether the venture will succeed or fail.
5. Reference specific lot details, competitor names, evidence quality ratings (Strong/Moderate/Weak), map axis scores, and positioning statement claims directly from the JSON context.
6. Keep outputs concise, sharp, and focused on testing logical defensibility and evidence sufficiency.`;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error(
      'Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets.',
    ) as Error & { statusCode?: number };
    err.statusCode = 503;
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function mapGeminiError(error: unknown): {
  statusCode: number;
  message: string;
} {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
  ) {
    return {
      statusCode: (error as { statusCode: number }).statusCode,
      message:
        error instanceof Error ? error.message : 'Gemini service unavailable.',
    };
  }

  const rawMessage = error instanceof Error ? error.message : String(error);

  if (
    rawMessage.includes('API_KEY_INVALID') ||
    rawMessage.includes('PERMISSION_DENIED') ||
    rawMessage.includes('403')
  ) {
    return {
      statusCode: 403,
      message:
        'Gemini API key was rejected (API_KEY_INVALID / PERMISSION_DENIED). Check your key in Settings > Secrets.',
    };
  }

  if (rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('429')) {
    return {
      statusCode: 429,
      message:
        'Gemini API rate limit reached (RESOURCE_EXHAUSTED). Please wait briefly and try again.',
    };
  }

  if (rawMessage.includes('NOT_FOUND') || rawMessage.includes('404')) {
    return {
      statusCode: 502,
      message: 'Requested Gemini model was not found. Please verify model availability.',
    };
  }

  return {
    statusCode: 502,
    message: rawMessage || 'Failed to communicate with Gemini Strategy Challenger.',
  };
}

export async function generateChallengeQuestions(
  context: StrategyChallengeContextPayload,
): Promise<GeneratedChallengeQuestion[]> {
  const ai = getGeminiClient();

  const prompt = `Review ONLY the SpiceBridge workspace data below and generate exactly 3 difficult, specific strategy challenge questions to test whether the user's competitive position is logically defensible and backed by evidence.

REQUIREMENTS FOR THE 3 QUESTIONS:
- Every question MUST cite specific names, metrics, axis names/scores, evidence quality ratings, or claims from the workspace data below.
- Do NOT ask generic startup/entrepreneurship questions.
- Cover distinct pressure points relevant to the entered data, such as:
  • Switching barriers for farmers or mills moving away from the named Main Alternative or "Do Nothing" option
  • Consistency between the Positioning Statement and Market Battlefield Map scores
  • Weak/Moderate evidence quality or unverified assumptions in the Reason to Believe or Competitor Matrix
  • Imitation risk if an existing named trader/competitor copies the key feature
  • Whether the claimed Primary Benefit is strong enough to outweigh switching friction or overlooked substitutes
- Do NOT answer the questions or invent any external facts.

WORKSPACE DATA (ONLY SOURCE OF TRUTH):
${JSON.stringify(context, null, 2)}`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      systemInstruction: CHALLENGER_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: {
                  type: Type.STRING,
                  description: 'Identifier such as q1, q2, q3',
                },
                focusArea: {
                  type: Type.STRING,
                  description:
                    'Short 2-5 word label of the strategic tension being tested (e.g., Switching Friction, Evidence Sufficiency, Imitation Risk)',
                },
                question: {
                  type: Type.STRING,
                  description:
                    'One sharp, specific challenge question grounded strictly in the entered SpiceBridge data',
                },
              },
              required: ['id', 'focusArea', 'question'],
            },
          },
        },
        required: ['questions'],
      },
    },
  });

  const text = (response.text ?? '').trim();
  const parsed = JSON.parse(text) as {
    questions?: Array<{ id?: string; focusArea?: string; question?: string }>;
  };

  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error('Gemini did not return valid challenge questions.');
  }

  return parsed.questions.slice(0, 3).map((q, idx) => ({
    id: q.id?.trim() || `q-${idx + 1}`,
    focusArea: q.focusArea?.trim() || `Strategic Challenge ${idx + 1}`,
    question: q.question?.trim() || 'Explain the evidence behind your strategic claim.',
  }));
}

export async function evaluateChallengeDefence(params: {
  context: StrategyChallengeContextPayload;
  question: GeneratedChallengeQuestion;
  defence: string;
}): Promise<ChallengeFeedbackResult> {
  const ai = getGeminiClient();

  const prompt = `Evaluate the user's defence to the strategy challenge question using ONLY the entered SpiceBridge workspace data and the user's defence text.

CHALLENGE QUESTION (${params.question.focusArea}):
"${params.question.question}"

USER'S DEFENCE:
"${params.defence}"

WORKSPACE DATA (ONLY SOURCE OF TRUTH):
${JSON.stringify(params.context, null, 2)}

INSTRUCTIONS:
Return concise, specific feedback under exactly three fields:
1. supported: State ONLY what in the user's defence is supported by facts, metrics, or evidence already entered in the workspace data. If nothing in the defence is backed by entered data, say so directly.
2. assumption: Identify any claim in the user's defence or strategy that is not sufficiently supported by the entered evidence.
3. nextEvidenceNeeded: State what specific additional evidence, field observation, mill/farmer feedback, or price/market data would help test that assumption. Do NOT invent the evidence or rewrite their strategy.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      systemInstruction: CHALLENGER_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          supported: {
            type: Type.STRING,
            description:
              'Concise summary of what in the user defence is backed by entered workspace evidence.',
          },
          assumption: {
            type: Type.STRING,
            description:
              'Specific claim(s) not sufficiently backed by entered evidence.',
          },
          nextEvidenceNeeded: {
            type: Type.STRING,
            description:
              'Specific next evidence, customer feedback, or observation needed to test the assumption.',
          },
        },
        required: ['supported', 'assumption', 'nextEvidenceNeeded'],
      },
    },
  });

  const text = (response.text ?? '').trim();
  const parsed = JSON.parse(text) as Partial<ChallengeFeedbackResult>;

  if (!parsed.supported || !parsed.assumption || !parsed.nextEvidenceNeeded) {
    throw new Error('Gemini returned an incomplete feedback object.');
  }

  return {
    supported: parsed.supported.trim(),
    assumption: parsed.assumption.trim(),
    nextEvidenceNeeded: parsed.nextEvidenceNeeded.trim(),
  };
}

export async function generateFinalStrategyReview(params: {
  context: StrategyChallengeContextPayload;
  challenges: Array<{
    focusArea: string;
    question: string;
    defence: string;
    feedback: ChallengeFeedbackResult;
  }>;
}): Promise<FinalStrategyReviewResult> {
  const ai = getGeminiClient();

  const prompt = `Review all 3 completed strategy challenge exchanges together with the SpiceBridge workspace data, and produce a concise Final Strategy Review.

STRICT RULES:
- Use ONLY information already entered in the workspace and the user's 3 defences/feedbacks.
- Do NOT invent evidence, numbers, or capabilities.
- Do NOT predict whether the venture will succeed or fail.

COMPLETED CHALLENGES & DEFENCES:
${JSON.stringify(params.challenges, null, 2)}

WORKSPACE DATA (ONLY SOURCE OF TRUTH):
${JSON.stringify(params.context, null, 2)}

INSTRUCTIONS:
Return exactly three concise fields:
1. strongestPart: The strongest part of the strategy supported strictly by existing entered work.
2. biggestAssumption: The single most important unsupported or weakly supported assumption across the positioning and defences.
3. nextValidationPriority: The single most important thing to test or research next.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      systemInstruction: CHALLENGER_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          strongestPart: {
            type: Type.STRING,
            description:
              'Strongest part of the strategy supported strictly by existing entered work.',
          },
          biggestAssumption: {
            type: Type.STRING,
            description:
              'Most important unsupported or weakly supported assumption.',
          },
          nextValidationPriority: {
            type: Type.STRING,
            description:
              'Single most important test or research priority next.',
          },
        },
        required: ['strongestPart', 'biggestAssumption', 'nextValidationPriority'],
      },
    },
  });

  const text = (response.text ?? '').trim();
  const parsed = JSON.parse(text) as Partial<FinalStrategyReviewResult>;

  if (
    !parsed.strongestPart ||
    !parsed.biggestAssumption ||
    !parsed.nextValidationPriority
  ) {
    throw new Error('Gemini returned an incomplete final strategy review.');
  }

  return {
    strongestPart: parsed.strongestPart.trim(),
    biggestAssumption: parsed.biggestAssumption.trim(),
    nextValidationPriority: parsed.nextValidationPriority.trim(),
  };
}
