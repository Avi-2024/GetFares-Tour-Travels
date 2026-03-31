import { Component } from "react";
import type { ButtonHTMLAttributes } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export class Button extends Component<ButtonProps> {
  render() {
    const { className, ...props } = this.props;

    const baseClasses =
      "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:focus-visible:ring-offset-gray-950 disabled:cursor-not-allowed disabled:opacity-60";

    return (
      <button
        className={[baseClasses, className].filter(Boolean).join(" ")}
        {...props}
      />
    );
  }
}
