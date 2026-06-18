import { PillNav } from "@/components/PillNav";

interface PillTabsProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; badge?: number | string }[];
  className?: string;
}

export function PillTabs<T extends string>(props: PillTabsProps<T>) {
  return <PillNav {...props} />;
}