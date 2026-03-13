import type { ReactNode } from "react";

export const FieldWrapper = ({ label, required, children, error }: { label: string; required?: boolean; children: ReactNode; error?: string }) => (
  <div>
    <label className="field-label">
      {label}
      {required ? <span className="ml-1 text-red-500">*</span> : null}
    </label>
    {children}
    {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
  </div>
);
