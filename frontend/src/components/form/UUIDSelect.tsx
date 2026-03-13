import { FieldWrapper } from "./common";

type Option = {
  value: string;
  label: string;
};

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  required?: boolean;
  error?: string;
  placeholder?: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const UUIDSelect = ({ label, value, onChange, options, required, error, placeholder = "Select an option" }: Props) => {
  const invalidUuid = value ? !UUID_PATTERN.test(value) && !options.some((option) => option.value === value) : false;

  return (
    <FieldWrapper label={label} required={required} error={error ?? (invalidUuid ? "Invalid UUID value selected." : "")}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`field-input ${error || invalidUuid ? "border-red-500" : ""}`}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
};

export default UUIDSelect;
