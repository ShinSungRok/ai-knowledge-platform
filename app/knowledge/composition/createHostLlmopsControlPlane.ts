/**
 * Host-side thin LLMOps control-plane wiring for `pnpm start`.
 * InMemory adapters only; no SQL / live OTLP / Express.
 */
import { RunLlmopsControlPlaneUseCase } from "../application/RunLlmopsControlPlaneUseCase";

/**
 * Builds {@link RunLlmopsControlPlaneUseCase} for listening HTTP.
 * Each execute() runs a fresh InMemory control-plane story.
 */
export function createHostLlmopsControlPlane(): RunLlmopsControlPlaneUseCase {
  return new RunLlmopsControlPlaneUseCase();
}
