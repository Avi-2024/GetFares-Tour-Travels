abstract class BaseService<TPayload, TResult> {
  public abstract list(...args: unknown[]): Promise<TResult[]>;
  public abstract create(payload: TPayload, ...args: unknown[]): Promise<TResult | null>;
  public abstract update(
    payload: Partial<TPayload>,
    ...args: unknown[]
  ): Promise<TResult | null>;
  public abstract remove(...args: unknown[]): Promise<void>;
}

export { BaseService };
