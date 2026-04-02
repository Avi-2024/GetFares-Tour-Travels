export class ClassNameBuilder {
  public static join(...values: Array<string | undefined>) {
    return values.filter(Boolean).join(" ");
  }
}
