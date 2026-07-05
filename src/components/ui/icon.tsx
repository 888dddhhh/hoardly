import type { ComponentType, SVGProps } from "react";

import { cn } from "../../lib/utils";

type LucideIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type IconProps = {
  icon: LucideIconComponent;
  className?: string;
  strokeWidth?: number;
  [key: string]: unknown;
};

function Icon({ icon: IconComponent, className, ...props }: IconProps) {
  return <IconComponent aria-hidden="true" className={cn("size-4", className)} {...props} />;
}

export { Icon };
export type { LucideIconComponent as IconSvgElement };
