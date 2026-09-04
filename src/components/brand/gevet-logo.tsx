import Image from "next/image";

type GevetLogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  showName?: boolean;
};

/** Identidad de la plataforma. El branding de cada tenant se resuelve por separado. */
export function GevetLogo({
  className = "",
  imageClassName = "h-10 w-10",
  priority = false,
  showName = true,
}: GevetLogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`.trim()}>
      <Image
        src="/GEVET.svg"
        width={64}
        height={64}
        priority={priority}
        className={`shrink-0 object-contain ${imageClassName}`.trim()}
        alt=""
        aria-hidden="true"
      />
      {showName && <span className="font-bold tracking-tight">GeVet</span>}
    </span>
  );
}
