import { Component } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

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

const joinClassNames = (...values: Array<string | undefined>) =>
  values.filter(Boolean).join(" ");

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
        className={joinClassNames("flex flex-col gap-2", wrapperClassName)}
      >
        <label
          className={joinClassNames(
            "text-xs font-semibold uppercase tracking-[0.18em] text-mist-200/80",
            labelClassName,
          )}
          htmlFor={id}
        >
          {label}
        </label>
        <div className="relative flex items-center">
          {startIcon && (
            <span
              className="absolute left-4 text-mist-200/70"
              aria-hidden="true"
            >
              {startIcon}
            </span>
          )}
          <input
            id={id}
            className={joinClassNames(
              "h-12 w-full rounded-xl border border-white/10 bg-white/5 text-sm text-mist-50 placeholder:text-mist-200/40 transition focus:border-brand-400/70 focus:outline-none focus:ring-2 focus:ring-brand-400/40",
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
