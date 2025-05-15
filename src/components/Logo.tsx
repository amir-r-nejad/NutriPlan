
import { Leaf } from 'lucide-react';
import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <div className="flex items-center gap-2 text-sidebar-foreground group-data-[collapsible=icon]:justify-center">
      <Leaf className="h-6 w-6 text-current" />
      <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
        NutriPlan
      </span>
    </div>
  );
}
