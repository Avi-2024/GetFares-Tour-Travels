import { Component } from "react";
import type { HTMLAttributes } from "react";
import { ClassNameBuilder } from "../utils/class-name.builder";

export type CardProps = HTMLAttributes<HTMLDivElement>;

class CardStyle {
  public static readonly base =
    "rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900";
}

export class Card extends Component<CardProps> {
  render() {
    const { className, ...props } = this.props;

    return (
      <div
        className={ClassNameBuilder.join(CardStyle.base, className)}
        {...props}
      />
    );
  }
}
