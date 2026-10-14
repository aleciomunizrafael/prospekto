import type { SVGProps } from "react";
import {
  BRAND_RED,
  BRAND_RED_DARK,
  LOGO_VIEWBOX,
  LOGO_VIEWBOX_SEM_TAGLINE,
  MARCA_VIEWBOX,
  MARK_POLYGONS,
  TAGLINE_PATH,
  WORDMARK_PATH,
} from "./logo-paths";

// Logo da Prospekto em SVG inline (docs/design/marca.md). O texto usa `currentColor`, então a cor
// vem do contexto (cinza da marca no site claro, claro no modo escuro do CRM); a marca vermelha é
// fixa. `variant`: "horizontal" (texto + tagline + marca), "compacto" (texto + marca, sem tagline)
// e "marca" (só os dois blocos vermelhos, para espaços quadrados). Decorativo quando `title` é
// omitido (aria-hidden); com `title`, vira imagem nomeada.
type LogoProps = Omit<SVGProps<SVGSVGElement>, "viewBox" | "children"> & {
  variant?: "horizontal" | "compacto" | "marca";
  title?: string;
};

function Mark() {
  return (
    <>
      {MARK_POLYGONS.map((p) => (
        <polygon
          key={p.points}
          fill={p.fill === "top" ? BRAND_RED : BRAND_RED_DARK}
          points={p.points}
        />
      ))}
    </>
  );
}

export function Logo({ variant = "horizontal", title, ...props }: LogoProps) {
  const viewBox =
    variant === "marca"
      ? MARCA_VIEWBOX
      : variant === "compacto"
        ? LOGO_VIEWBOX_SEM_TAGLINE
        : LOGO_VIEWBOX;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...props}
    >
      {variant !== "marca" ? (
        <g fill="currentColor">
          <path d={WORDMARK_PATH} />
          {variant === "horizontal" ? <path d={TAGLINE_PATH} /> : null}
        </g>
      ) : null}
      <Mark />
    </svg>
  );
}
