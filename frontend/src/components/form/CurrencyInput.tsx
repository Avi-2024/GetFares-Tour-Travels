import NumberInput from "./NumberInput";

type Props = {
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
  required?: boolean;
  error?: string;
  min?: number;
  max?: number;
};

const CurrencyInput = ({ label, value, onChange, required, error, min = 0, max }: Props) => (
  <NumberInput label={label} value={value} onChange={onChange} required={required} error={error} min={min} max={max} step={0.01} />
);

export default CurrencyInput;
