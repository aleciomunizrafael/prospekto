// Erros de domínio com mensagem em português para a UI e código estável para o código.
export class DomainError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id?: string) {
    super("not_found", `${entity} não encontrado.`, id ? { id } : undefined);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("validation", message, details);
    this.name = "ValidationError";
  }
}

// Campos que faltam para um movimento de estágio (moveLeadStage, moveProjectStage).
export class MissingFieldsError extends DomainError {
  readonly missing: readonly string[];
  constructor(missing: readonly string[], context: string) {
    super("missing_fields", `Para ${context} é preciso preencher: ${missing.join(", ")}.`, {
      missing,
    });
    this.name = "MissingFieldsError";
    this.missing = missing;
  }
}
