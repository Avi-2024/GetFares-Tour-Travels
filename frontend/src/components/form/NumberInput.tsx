import { FieldWrapper } from "./common";

type Props = {
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
  required?: boolean;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
};

const NumberInput = ({ label, value, onChange, required, error, min, max, step = 1 }: Props) => (
  <FieldWrapper label={label} required={required} error={error}>
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(event) => {
        const next = event.target.value;
        onChange(next === "" ? "" : Number(next));
      }}
      className={`field-input ${error ? "border-red-500" : ""}`}
    />
  </FieldWrapper>
);

export default NumberInput;
