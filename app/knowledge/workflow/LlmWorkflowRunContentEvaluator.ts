import type { LanguageModelProvider } from "../ai/LanguageModelProvider";
import type { GroundedPrompt } from "../prompt/GroundedPrompt";
import type { WorkflowContentCaseScore } from "./WorkflowContentCaseScore";
import type { WorkflowContentEvaluationMetrics } from "./WorkflowContentEvaluationMetrics";
import { MIN_LLM_JUDGE_SCORE } from "./MIN_LLM_JUDGE_SCORE";
import type { WorkflowEvaluationCase } from "./WorkflowEvaluationCase";
import type { WorkflowRunResult } from "./WorkflowRunResult";
import type {
  WorkflowRunContentEvaluator,
} from "./WorkflowRunContentEvaluator";
import type {
  WorkflowRunEvaluatorInput,
} from "./WorkflowRunEvaluator";
import type { WorkflowStepResult } from "./WorkflowStepResult";

const SYSTEM_INSTRUCTION =
  "You are a strict workflow-quality judge. You will be given an objective " +
  "and the transcript of a multi-agent run that attempted it. Output " +
  'exactly one line in the form "score: N" where N is an integer from 0 ' +
  "(the run completely fails the objective) to 10 (the run fully and " +
  "substantively satisfies the objective). Output only that line, " +
  "nothing else.";

/** Matches a standalone "score: N" line, case-insensitive. */
const SCORE_LINE_PATTERN = /^\s*score\s*:\s*(-?\d+(?:\.\d+)?)\s*$/im;

/**
 * {@link WorkflowRunContentEvaluator} implementation: asks a
 * {@link LanguageModelProvider} to judge, per case, whether the run's
 * actual step output content substantively satisfies the case objective
 * — the content-quality judgment {@link WorkflowRunEvaluator} structurally
 * cannot make (it only checks status/step-count/roles/handoff/memory
 * presence, never what an agent actually wrote).
 *
 * One LLM call per case (each case has an independent objective, unlike
 * P2 reranking's shared-query candidate set). Degrades conservatively:
 * a missing run or an unparseable LLM response counts as content-failed
 * rather than silently passing — against the default fake language model
 * adapter (which echoes the prompt back verbatim, containing no
 * "score: N" line), every case reports `unparseable-llm-response`.
 *
 * Depends only on the `LanguageModelProvider` port — never a concrete
 * adapter.
 */
export class LlmWorkflowRunContentEvaluator
  implements WorkflowRunContentEvaluator
{
  constructor(private readonly languageModelProvider: LanguageModelProvider) {}

  async evaluate(
    input: WorkflowRunEvaluatorInput,
  ): Promise<WorkflowContentEvaluationMetrics> {
    const { dataset, runsByCaseId } = this.toInput(input);

    const caseScores: WorkflowContentCaseScore[] = [];
    for (const evaluationCase of dataset.cases) {
      caseScores.push(
        await this.scoreCase(evaluationCase, runsByCaseId),
      );
    }

    const caseCount = caseScores.length;
    const passedCount = caseScores.filter((score) => score.passed).length;
    return {
      datasetId: dataset.id,
      caseCount,
      passedCount,
      passRate: passedCount / caseCount,
      caseScores,
    };
  }

  private async scoreCase(
    evaluationCase: WorkflowEvaluationCase,
    runsByCaseId: ReadonlyMap<string, WorkflowRunResult>,
  ): Promise<WorkflowContentCaseScore> {
    const run = runsByCaseId.get(evaluationCase.id);
    if (!run) {
      return {
        caseId: evaluationCase.id,
        passed: false,
        failureReasons: ["missing-run"],
      };
    }

    const prompt = this.buildPrompt(evaluationCase.objective, run.stepResults);
    const generated = await this.languageModelProvider.generate(prompt);
    const rawScore = this.parseScore(generated.text);

    if (rawScore === undefined) {
      return {
        caseId: evaluationCase.id,
        passed: false,
        failureReasons: ["unparseable-llm-response"],
      };
    }

    const score = rawScore / 10;
    const passed = score >= MIN_LLM_JUDGE_SCORE;
    return {
      caseId: evaluationCase.id,
      passed,
      score,
      ...(passed ? {} : { failureReasons: ["below-min-llm-judge-score"] }),
    };
  }

  private buildPrompt(
    objective: string,
    stepResults: readonly WorkflowStepResult[],
  ): GroundedPrompt {
    const transcript = stepResults
      .map((step) => `[${step.role}] ${step.output}`)
      .join("\n\n");
    return {
      systemInstruction: SYSTEM_INSTRUCTION,
      userMessage: `Objective:\n${objective}\n\nRun transcript:\n${transcript}`,
    };
  }

  private parseScore(text: string): number | undefined {
    const match = SCORE_LINE_PATTERN.exec(text);
    if (match === null) {
      return undefined;
    }
    const raw = Number(match[1]);
    if (!Number.isFinite(raw)) {
      return undefined;
    }
    return Math.max(0, Math.min(10, raw));
  }

  private toInput(
    input: WorkflowRunEvaluatorInput,
  ): WorkflowRunEvaluatorInput {
    if (!input || typeof input !== "object") {
      throw new Error("WorkflowRunEvaluatorInput must be an object");
    }
    const dataset = input.dataset;
    if (!dataset || typeof dataset !== "object") {
      throw new Error("WorkflowEvaluationDataset must be an object");
    }
    if (typeof dataset.id !== "string" || dataset.id.trim().length === 0) {
      throw new Error("WorkflowEvaluationDataset.id must be a non-empty string");
    }
    if (!Array.isArray(dataset.cases) || dataset.cases.length === 0) {
      throw new Error("dataset must contain at least one case");
    }
    if (!(input.runsByCaseId instanceof Map)) {
      throw new Error("WorkflowRunEvaluatorInput.runsByCaseId must be a Map");
    }
    return { dataset, runsByCaseId: input.runsByCaseId };
  }
}
