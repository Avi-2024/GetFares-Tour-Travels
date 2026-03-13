import { FieldWrapper } from "./common";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  type?: "text" | "email" | "password" | "url";
  maxLength?: number;
};

const TextInput = ({ label, value, onChange, required, error, placeholder, type = "text", maxLength }: Props) => (
  <FieldWrapper label={label} required={required} error={error}>
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(event) => onChange(event.target.value)}
      className={`field-input ${error ? "border-red-500" : ""}`}
    />
  </FieldWrapper>
);

export default TextInput;
