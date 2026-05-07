import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

class ClassName {
  public static merge(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
  }
}

export { ClassName };
