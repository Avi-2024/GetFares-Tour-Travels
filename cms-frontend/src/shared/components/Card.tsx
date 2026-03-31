import { Component } from "react";
import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export class Card extends Component<CardProps> {
  render() {
    const { className, ...props } = this.props;

    const baseClasses =
      "rounded-3xl border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur-xl";

    return (
      <div
        className={[baseClasses, className].filter(Boolean).join(" ")}
        {...props}
      />
    );
  }
}
