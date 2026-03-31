import { ReactNode } from "react";

type WorkspacePageHeaderProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

export function WorkspacePageHeader({
  title,
  description,
  actions
}: WorkspacePageHeaderProps) {
  return (
    <div className="motion-fade-up flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="pt-1">
        <h1 className="type-page-title text-[30px] sm:text-[32px]">
          {title}
        </h1>
        <p className="type-body-text mt-2 max-w-[760px] text-[15px]">{description}</p>
      </div>
      {actions ? <div className="flex items-center gap-3 self-start">{actions}</div> : null}
    </div>
  );
}
