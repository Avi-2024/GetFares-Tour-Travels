interface ValidationOutcome {
  isValid: boolean;
  errors: Record<string, string>;
}

abstract class BaseValidator<TInput> {
  public abstract validate(input: TInput): ValidationOutcome;
}

export type { ValidationOutcome };
export { BaseValidator };
