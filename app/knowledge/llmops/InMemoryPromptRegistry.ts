import {
  asPromptTemplateId,
  type PromptTemplateId,
} from "./PromptTemplateId";
import type { PromptTemplateRecord } from "./PromptTemplateRecord";
import {
  asPromptVersionId,
  type PromptVersionId,
} from "./PromptVersionId";
import type { PromptVersionRecord } from "./PromptVersionRecord";
import type {
  PromptRegistry,
  PromptTemplateRegisterInput,
  PromptVersionRegisterInput,
} from "./PromptRegistry";

/**
 * In-memory {@link PromptRegistry}: workspace-scoped prompt templates and
 * versions with defensive copies and cross-workspace isolation.
 */
export class InMemoryPromptRegistry implements PromptRegistry {
  private readonly templatesByWorkspace = new Map<
    string,
    Map<string, PromptTemplateRecord>
  >();
  private readonly versionsByWorkspace = new Map<
    string,
    Map<string, PromptVersionRecord>
  >();

  async registerTemplate(
    input: PromptTemplateRegisterInput,
  ): Promise<PromptTemplateRecord> {
    const validated = this.toTemplateInput(input);
    const templates = this.getOrCreateTemplates(validated.workspaceId);
    if (templates.has(validated.id)) {
      throw new Error(`Duplicate prompt template id: ${validated.id}`);
    }
    const record: PromptTemplateRecord = {
      id: validated.id,
      workspaceId: validated.workspaceId,
      name: validated.name,
    };
    if (validated.description !== undefined) {
      record.description = validated.description;
    }
    templates.set(record.id, this.cloneTemplate(record));
    return this.cloneTemplate(record);
  }

  async getTemplate(
    workspaceId: string,
    templateId: PromptTemplateId,
  ): Promise<PromptTemplateRecord | null> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const id = asPromptTemplateId(templateId);
    const stored = this.templatesByWorkspace.get(workspaceId)?.get(id);
    return stored ? this.cloneTemplate(stored) : null;
  }

  async listTemplates(
    workspaceId: string,
  ): Promise<readonly PromptTemplateRecord[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const templates = this.templatesByWorkspace.get(workspaceId);
    if (!templates || templates.size === 0) {
      return [];
    }
    return [...templates.values()]
      .sort((a, b) => {
        if (a.name !== b.name) {
          return a.name < b.name ? -1 : 1;
        }
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      })
      .map((t) => this.cloneTemplate(t));
  }

  async registerVersion(
    input: PromptVersionRegisterInput,
  ): Promise<PromptVersionRecord> {
    const validated = this.toVersionInput(input);
    const templates = this.templatesByWorkspace.get(validated.workspaceId);
    if (!templates?.has(validated.templateId)) {
      throw new Error(`Unknown prompt template id: ${validated.templateId}`);
    }
    const versions = this.getOrCreateVersions(validated.workspaceId);
    if (versions.has(validated.id)) {
      throw new Error(`Duplicate prompt version id: ${validated.id}`);
    }
    for (const existing of versions.values()) {
      if (
        existing.templateId === validated.templateId &&
        existing.version === validated.version
      ) {
        throw new Error(
          `Duplicate prompt version string: ${validated.version}`,
        );
      }
    }
    const record: PromptVersionRecord = {
      id: validated.id,
      templateId: validated.templateId,
      workspaceId: validated.workspaceId,
      version: validated.version,
      body: validated.body,
    };
    if (validated.metadata !== undefined) {
      record.metadata = { ...validated.metadata };
    }
    versions.set(record.id, this.cloneVersion(record));
    return this.cloneVersion(record);
  }

  async getVersion(
    workspaceId: string,
    versionId: PromptVersionId,
  ): Promise<PromptVersionRecord | null> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const id = asPromptVersionId(versionId);
    const stored = this.versionsByWorkspace.get(workspaceId)?.get(id);
    return stored ? this.cloneVersion(stored) : null;
  }

  async listVersions(
    workspaceId: string,
    templateId: PromptTemplateId,
  ): Promise<readonly PromptVersionRecord[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const tid = asPromptTemplateId(templateId);
    const versions = this.versionsByWorkspace.get(workspaceId);
    if (!versions || versions.size === 0) {
      return [];
    }
    return [...versions.values()]
      .filter((v) => v.templateId === tid)
      .sort((a, b) => {
        if (a.version !== b.version) {
          return a.version < b.version ? -1 : 1;
        }
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      })
      .map((v) => this.cloneVersion(v));
  }

  private getOrCreateTemplates(
    workspaceId: string,
  ): Map<string, PromptTemplateRecord> {
    let map = this.templatesByWorkspace.get(workspaceId);
    if (!map) {
      map = new Map();
      this.templatesByWorkspace.set(workspaceId, map);
    }
    return map;
  }

  private getOrCreateVersions(
    workspaceId: string,
  ): Map<string, PromptVersionRecord> {
    let map = this.versionsByWorkspace.get(workspaceId);
    if (!map) {
      map = new Map();
      this.versionsByWorkspace.set(workspaceId, map);
    }
    return map;
  }

  private toTemplateInput(
    input: PromptTemplateRegisterInput,
  ): PromptTemplateRegisterInput {
    if (!input || typeof input !== "object") {
      throw new Error("PromptTemplateRegisterInput must be an object");
    }
    this.assertNonEmptyString(input.workspaceId, "workspaceId");
    this.assertNonEmptyString(input.name, "name");
    const result: PromptTemplateRegisterInput = {
      id: asPromptTemplateId(input.id),
      workspaceId: input.workspaceId,
      name: input.name.trim(),
    };
    if (input.description !== undefined) {
      result.description = input.description;
    }
    return result;
  }

  private toVersionInput(
    input: PromptVersionRegisterInput,
  ): PromptVersionRegisterInput {
    if (!input || typeof input !== "object") {
      throw new Error("PromptVersionRegisterInput must be an object");
    }
    this.assertNonEmptyString(input.workspaceId, "workspaceId");
    this.assertNonEmptyString(input.version, "version");
    this.assertNonEmptyString(input.body, "body");
    const result: PromptVersionRegisterInput = {
      id: asPromptVersionId(input.id),
      templateId: asPromptTemplateId(input.templateId),
      workspaceId: input.workspaceId,
      version: input.version.trim(),
      body: input.body,
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

  private cloneTemplate(record: PromptTemplateRecord): PromptTemplateRecord {
    const cloned: PromptTemplateRecord = {
      id: record.id,
      workspaceId: record.workspaceId,
      name: record.name,
    };
    if (record.description !== undefined) {
      cloned.description = record.description;
    }
    return cloned;
  }

  private cloneVersion(record: PromptVersionRecord): PromptVersionRecord {
    const cloned: PromptVersionRecord = {
      id: record.id,
      templateId: record.templateId,
      workspaceId: record.workspaceId,
      version: record.version,
      body: record.body,
    };
    if (record.metadata !== undefined) {
      cloned.metadata = { ...record.metadata };
    }
    return cloned;
  }
}

export { InMemoryPromptRegistry as DefaultPromptRegistry };
