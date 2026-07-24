/**
 * Host-side thin LLMOps control-plane wiring for `pnpm start`.
 * InMemory adapters only; no SQL / live OTLP / Express.
 * When `LLM_MODEL` is set, registry labels use that id (soft-link only).
 */
import { RunLlmopsControlPlaneUseCase } from "../application/RunLlmopsControlPlaneUseCase";

/**
 * Builds {@link RunLlmopsControlPlaneUseCase} for listening HTTP.
 * Each execute() runs a fresh InMemory control-plane story.
 */
export function createHostLlmopsControlPlane(
  env: NodeJS.ProcessEnv = process.env,
): RunLlmopsControlPlaneUseCase {
  const model = env["LLM_MODEL"]?.trim();
  if (model === undefined || model.length === 0) {
    return new RunLlmopsControlPlaneUseCase();
  }
  return new RunLlmopsControlPlaneUseCase({
    modelName: model,
    providerModel: model,
  });
}
