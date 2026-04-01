import { Component } from "react";
import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export class Card extends Component<CardProps> {
  render() {
    const { className, ...props } = this.props;

    const baseClasses =
      "rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900";

    return (
      <div
        className={[baseClasses, className].filter(Boolean).join(" ")}
        {...props}
      />
    );
  }
}
