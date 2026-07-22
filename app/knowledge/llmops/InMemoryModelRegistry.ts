import { asModelId, type ModelId } from "./ModelId";
import type { ModelRecord } from "./ModelRecord";
import {
  asModelVersionId,
  type ModelVersionId,
} from "./ModelVersionId";
import type { ModelVersionRecord } from "./ModelVersionRecord";
import type {
  ModelRegisterInput,
  ModelRegistry,
  ModelVersionRegisterInput,
} from "./ModelRegistry";

/**
 * In-memory {@link ModelRegistry}: workspace-scoped models and versions
 * with defensive copies and cross-workspace isolation.
 */
export class InMemoryModelRegistry implements ModelRegistry {
  private readonly modelsByWorkspace = new Map<
    string,
    Map<string, ModelRecord>
  >();
  private readonly versionsByWorkspace = new Map<
    string,
    Map<string, ModelVersionRecord>
  >();

  async registerModel(input: ModelRegisterInput): Promise<ModelRecord> {
    const validated = this.toModelInput(input);
    const models = this.getOrCreateModels(validated.workspaceId);
    if (models.has(validated.id)) {
      throw new Error(`Duplicate model id: ${validated.id}`);
    }
    const record: ModelRecord = {
      id: validated.id,
      workspaceId: validated.workspaceId,
      name: validated.name,
    };
    models.set(record.id, this.cloneModel(record));
    return this.cloneModel(record);
  }

  async getModel(
    workspaceId: string,
    modelId: ModelId,
  ): Promise<ModelRecord | null> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const id = asModelId(modelId);
    const stored = this.modelsByWorkspace.get(workspaceId)?.get(id);
    return stored ? this.cloneModel(stored) : null;
  }

  async listModels(workspaceId: string): Promise<readonly ModelRecord[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const models = this.modelsByWorkspace.get(workspaceId);
    if (!models || models.size === 0) {
      return [];
    }
    return [...models.values()]
      .sort((a, b) => {
        if (a.name !== b.name) {
          return a.name < b.name ? -1 : 1;
        }
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      })
      .map((m) => this.cloneModel(m));
  }

  async registerVersion(
    input: ModelVersionRegisterInput,
  ): Promise<ModelVersionRecord> {
    const validated = this.toVersionInput(input);
    const models = this.modelsByWorkspace.get(validated.workspaceId);
    if (!models?.has(validated.modelId)) {
      throw new Error(`Unknown model id: ${validated.modelId}`);
    }
    const versions = this.getOrCreateVersions(validated.workspaceId);
    if (versions.has(validated.id)) {
      throw new Error(`Duplicate model version id: ${validated.id}`);
    }
    for (const existing of versions.values()) {
      if (
        existing.modelId === validated.modelId &&
        existing.version === validated.version
      ) {
        throw new Error(
          `Duplicate model version string: ${validated.version}`,
        );
      }
    }
    const record: ModelVersionRecord = {
      id: validated.id,
      modelId: validated.modelId,
      workspaceId: validated.workspaceId,
      version: validated.version,
      providerModel: validated.providerModel,
    };
    if (validated.metadata !== undefined) {
      record.metadata = { ...validated.metadata };
    }
    versions.set(record.id, this.cloneVersion(record));
    return this.cloneVersion(record);
  }

  async getVersion(
    workspaceId: string,
    versionId: ModelVersionId,
  ): Promise<ModelVersionRecord | null> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const id = asModelVersionId(versionId);
    const stored = this.versionsByWorkspace.get(workspaceId)?.get(id);
    return stored ? this.cloneVersion(stored) : null;
  }

  async listVersions(
    workspaceId: string,
    modelId: ModelId,
  ): Promise<readonly ModelVersionRecord[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const mid = asModelId(modelId);
    const versions = this.versionsByWorkspace.get(workspaceId);
    if (!versions || versions.size === 0) {
      return [];
    }
    return [...versions.values()]
      .filter((v) => v.modelId === mid)
      .sort((a, b) => {
        if (a.version !== b.version) {
          return a.version < b.version ? -1 : 1;
        }
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      })
      .map((v) => this.cloneVersion(v));
  }

  private getOrCreateModels(
    workspaceId: string,
  ): Map<string, ModelRecord> {
    let map = this.modelsByWorkspace.get(workspaceId);
    if (!map) {
      map = new Map();
      this.modelsByWorkspace.set(workspaceId, map);
    }
    return map;
  }

  private getOrCreateVersions(
    workspaceId: string,
  ): Map<string, ModelVersionRecord> {
    let map = this.versionsByWorkspace.get(workspaceId);
    if (!map) {
      map = new Map();
      this.versionsByWorkspace.set(workspaceId, map);
    }
    return map;
  }

  private toModelInput(input: ModelRegisterInput): ModelRegisterInput {
    if (!input || typeof input !== "object") {
      throw new Error("ModelRegisterInput must be an object");
    }
    this.assertNonEmptyString(input.workspaceId, "workspaceId");
    this.assertNonEmptyString(input.name, "name");
    return {
      id: asModelId(input.id),
      workspaceId: input.workspaceId,
      name: input.name.trim(),
    };
  }

  private toVersionInput(
    input: ModelVersionRegisterInput,
  ): ModelVersionRegisterInput {
    if (!input || typeof input !== "object") {
      throw new Error("ModelVersionRegisterInput must be an object");
    }
    this.assertNonEmptyString(input.workspaceId, "workspaceId");
    this.assertNonEmptyString(input.version, "version");
    this.assertNonEmptyString(input.providerModel, "providerModel");
    const result: ModelVersionRegisterInput = {
      id: asModelVersionId(input.id),
      modelId: asModelId(input.modelId),
      workspaceId: input.workspaceId,
      version: input.version.trim(),
      providerModel: input.providerModel.trim(),
    };
    if (input.metadata !== undefined) {
      result.metadata = this.copyStringMap(input.metadata);
    }
    return result;
  }

  private assertNonEmptyString(value: unknown, field: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${field} must be a non-empty string`);
    }
  }

  private copyStringMap(
    map: Readonly<Record<string, string>>,
  ): Record<string, string> {
    const copied: Record<string, string> = {};
    for (const [key, value] of Object.entries(map)) {
      if (typeof value !== "string") {
        throw new Error(`metadata.${key} must be a string`);
      }
      copied[key] = value;
    }
    return copied;
  }

  private cloneModel(record: ModelRecord): ModelRecord {
    return {
      id: record.id,
      workspaceId: record.workspaceId,
      name: record.name,
    };
  }

  private cloneVersion(record: ModelVersionRecord): ModelVersionRecord {
    const cloned: ModelVersionRecord = {
      id: record.id,
      modelId: record.modelId,
      workspaceId: record.workspaceId,
      version: record.version,
      providerModel: record.providerModel,
    };
    if (record.metadata !== undefined) {
      cloned.metadata = { ...record.metadata };
    }
    return cloned;
  }
}

export { InMemoryModelRegistry as DefaultModelRegistry };
