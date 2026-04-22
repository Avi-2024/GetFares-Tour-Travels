import type { HTMLAttributes } from "react";

type SurfaceCardProps = HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean;
};

const SurfaceCard = ({
  className = "",
  hoverable = false,
  ...props
}: SurfaceCardProps) => (
  <div
    className={`surface-card shadow-purple-400 ${hoverable ? "hover:scale-[1.02] hover:shadow-md" : ""} ${className}`}
    {...props}
  />
);

export default SurfaceCard;
