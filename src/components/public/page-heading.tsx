import { getPageTypography } from "@/lib/public/typography";
import { cn } from "@/lib/utils";

interface PageHeadingProps {
  pageKey:       string;
  /** Override from above — if parent fetched typography, pass it to avoid double DB query */
  typography?:   { heading: string; subheading: string; fontSize: number; rotation: number };
  /** Use brand gradient on second line */
  accentLine?:   number; // which \n-separated line gets the gradient (0-indexed)
  className?:    string;
  subClassName?: string;
  hideSubheading?: boolean;
}

export async function PageHeading({
  pageKey,
  typography: passedTypo,
  accentLine = 1,
  className,
  subClassName,
  hideSubheading,
}: PageHeadingProps) {
  const typo = passedTypo ?? await getPageTypography(pageKey);

  // Split heading on \n to apply gradient to a specific line
  const lines = typo.heading.split("\n");

  return (
    <div className={cn("space-y-4", className)}>
      <h1
        className="font-display font-bold site-heading leading-[1.05] text-balance"
        style={{
          fontSize:        `clamp(2rem, ${(typo.fontSize / 16).toFixed(2)}vw, ${typo.fontSize}px)`,
          transform:       typo.rotation !== 0 ? `rotate(${typo.rotation}deg)` : undefined,
          transformOrigin: "left center",
        }}
      >
        {lines.map((line, i) => (
          <span key={i}>
            {i === accentLine ? (
              <span className="site-accent">{line}</span>
            ) : (
              line
            )}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
      </h1>

      {!hideSubheading && typo.subheading && (
        <p
          className={cn(
            "site-text-muted text-base sm:text-lg md:text-xl max-w-xl leading-relaxed",
            subClassName
          )}
        >
          {typo.subheading.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i < typo.subheading.split("\n").length - 1 && <br />}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
