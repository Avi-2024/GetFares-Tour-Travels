import { ClassName } from "../../lib/cn";

export class ClassNameBuilder {
  public static join(...values: Array<string | undefined>): string {
    return ClassName.merge(...values);
  }
}
