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
            "text-sm font-medium text-gray-700 dark:text-gray-200",
            labelClassName,
          )}
          htmlFor={id}
        >
          {label}
        </label>
        <div className="relative flex items-center">
          {startIcon && (
            <span
              className="absolute left-4 text-gray-400 dark:text-gray-500"
              aria-hidden="true"
            >
              {startIcon}
            </span>
          )}
          <input
            id={id}
            className={ClassNameBuilder.join(
              "h-11 w-full rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-blue-900/60",
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
