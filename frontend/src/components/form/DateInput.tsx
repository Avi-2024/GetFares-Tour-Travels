import { FieldWrapper } from "./common";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  min?: string;
  max?: string;
};

const DateInput = ({ label, value, onChange, required, error, min, max }: Props) => (
  <FieldWrapper label={label} required={required} error={error}>
    <input
      type="date"
      value={value}
      min={min}
      max={max}
      onChange={(event) => onChange(event.target.value)}
      className={`field-input ${error ? "border-red-500" : ""}`}
    />
  </FieldWrapper>
);

export default DateInput;
