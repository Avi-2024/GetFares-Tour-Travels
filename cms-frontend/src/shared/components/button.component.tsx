import { Component } from "react";
import type { ButtonHTMLAttributes } from "react";
import { ClassNameBuilder } from "../utils/class-name.builder";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

class ButtonStyle {
  public static readonly base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60";
}

export class Button extends Component<ButtonProps> {
  render() {
    const { className, ...props } = this.props;

    return (
      <button
        className={ClassNameBuilder.join(ButtonStyle.base, className)}
        {...props}
      />
    );
  }
}
