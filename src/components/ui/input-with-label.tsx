import { Input, type InputProps } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type InputWithLabelProps = InputProps & {
  id: string;
  label: string;
};

export default function InputWithLabel({
  id,
  label,
  ...props
}: InputWithLabelProps) {
  return (
    <div className="grid w-full items-center gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
    </div>
  );
}
