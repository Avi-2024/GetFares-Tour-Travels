import { Component } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { ClassNameBuilder } from "../utils/class-name.builder";

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className"
> {
  id: string;
  label: string;
  wrapperClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  startIcon?: ReactNode;
  endAdornment?: ReactNode;
}

export class TextField extends Component<TextFieldProps> {
  render() {
    const {
      id,
      label,
      wrapperClassName,
      labelClassName,
      inputClassName,
      startIcon,
      endAdornment,
      ...inputProps
    } = this.props;

    const hasStartIcon = Boolean(startIcon);
    const hasEndAdornment = Boolean(endAdornment);
    const inputPadding = [
      hasStartIcon ? "pl-11" : "pl-4",
      hasEndAdornment ? "pr-12" : "pr-4",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        className={ClassNameBuilder.join("flex flex-col gap-2", wrapperClassName)}
      >
        <label
          className={ClassNameBuilder.join(
            "text-sm font-medium text-[var(--text-primary)]",
            labelClassName,
          )}
          htmlFor={id}
        >
          {label}
        </label>
        <div className="relative flex items-center">
          {startIcon && (
            <span
              className="absolute left-4 text-[var(--text-secondary)]"
              aria-hidden="true"
            >
              {startIcon}
            </span>
          )}
          <input
            id={id}
            className={ClassNameBuilder.join(
              "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]",
              inputPadding,
              inputClassName,
            )}
            {...inputProps}
          />
          {endAdornment && (
            <span className="absolute right-3 flex items-center">
              {endAdornment}
            </span>
          )}
        </div>
      </div>
    );
  }
}
