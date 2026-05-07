import { Component } from "react";
import type { HTMLAttributes } from "react";
import { ClassNameBuilder } from "../utils/class-name.builder";

export type CardProps = HTMLAttributes<HTMLDivElement>;

const CARD_BASE_CLASSES = "surface-card rounded-[var(--radius-lg)] p-6";

export class Card extends Component<CardProps> {
  render() {
    const { className, ...props } = this.props;

    return (
      <div
        className={ClassNameBuilder.join(CARD_BASE_CLASSES, className)}
        {...props}
      />
    );
  }
}
