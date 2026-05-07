import { FieldWrapper } from "./common";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
};

const DateTimeInput = ({ label, value, onChange, required, error }: Props) => (
  <FieldWrapper label={label} required={required} error={error}>
    <input
      type="datetime-local"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`field-input ${error ? "border-red-500" : ""}`}
    />
  </FieldWrapper>
);

export default DateTimeInput;
