// Marca (docs/design/marca.md, seção 5): os caminhos de `logo-paths.ts` são gerados, e dois erros
// passaram despercebidos na primeira geração: a tagline usava a caixa da palavra (34 % mais larga e
// alinhada à esquerda, em vez de recuada do R ao T como no original) e os números tinham até 18
// dígitos (47 KB inline em cada página). Este teste fixa as caixas de tinta medidas no original,
// o arredondamento a 2 casas e o orçamento de tamanho, para a próxima regeneração não regredir.
import { describe, expect, it } from "vitest";
import {
  LOGO_VIEWBOX,
  MARK_POLYGONS,
  TAGLINE_PATH,
  WORDMARK_PATH,
} from "@/components/brand/logo-paths";

type Box = { x0: number; y0: number; x1: number; y1: number };

// Caixa de tinta de um `d` absoluto (M, L, H, V, Q, C, Z, como o SVGPathPen escreve), amostrando as
// curvas em vez de usar os pontos de controle, que ficam fora do traço.
function inkBox(d: string): Box {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  const box: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const add = (x: number, y: number) => {
    box.x0 = Math.min(box.x0, x);
    box.y0 = Math.min(box.y0, y);
    box.x1 = Math.max(box.x1, x);
    box.y1 = Math.max(box.y1, y);
  };
  let cmd = "";
  let x = 0;
  let y = 0;
  let i = 0;
  const next = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[A-Za-z]/.test(t)) {
      cmd = t;
      i++;
      if (cmd === "Z") continue;
    }
    if (cmd === "M" || cmd === "L") {
      x = next();
      y = next();
      add(x, y);
    } else if (cmd === "H") {
      x = next();
      add(x, y);
    } else if (cmd === "V") {
      y = next();
      add(x, y);
    } else if (cmd === "Q" || cmd === "C") {
      const pts = [[x, y]];
      for (let k = 0; k < (cmd === "Q" ? 2 : 3); k++) pts.push([next(), next()]);
      for (let s = 0; s <= 20; s++) {
        const u = s / 20;
        let px = 0;
        let py = 0;
        if (cmd === "Q") {
          const [p0, p1, p2] = pts;
          px = (1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * p1[0] + u ** 2 * p2[0];
          py = (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * p1[1] + u ** 2 * p2[1];
        } else {
          const [p0, p1, p2, p3] = pts;
          px =
            (1 - u) ** 3 * p0[0] +
            3 * (1 - u) ** 2 * u * p1[0] +
            3 * (1 - u) * u ** 2 * p2[0] +
            u ** 3 * p3[0];
          py =
            (1 - u) ** 3 * p0[1] +
            3 * (1 - u) ** 2 * u * p1[1] +
            3 * (1 - u) * u ** 2 * p2[1] +
            u ** 3 * p3[1];
        }
        add(px, py);
      }
      [x, y] = pts[pts.length - 1];
    } else {
      throw new Error(`comando SVG inesperado: ${cmd}`);
    }
  }
  return box;
}

const word = inkBox(WORDMARK_PATH);
const tag = inkBox(TAGLINE_PATH);

describe("logo-paths (caixas medidas no original, viewBox 36 0 302 80)", () => {
  it("a palavra ocupa x 37–310,5 e y 21–59,5", () => {
    expect(LOGO_VIEWBOX).toBe("36 0 302 80");
    expect(word.x0).toBeCloseTo(37, 0);
    expect(word.x1).toBeCloseTo(310.5, 0);
    expect(word.y0).toBeCloseTo(21, 0);
    expect(word.y1).toBeCloseTo(59.5, 0);
  });

  it("a tagline ocupa x 69–270 e y 72–80: recuada do R ao T, com 8 unidades de altura", () => {
    expect(tag.x0).toBeCloseTo(69, 0);
    expect(tag.x1).toBeCloseTo(270, 0);
    expect(tag.y0).toBeCloseTo(72, 0);
    expect(tag.y1).toBeCloseTo(80, 0);
    // Proporções do original: largura 0,73 da palavra, recuo de 12 % à esquerda e 15 % à direita.
    const w = word.x1 - word.x0;
    expect((tag.x1 - tag.x0) / w).toBeCloseTo(0.733, 1);
    expect((tag.x0 - word.x0) / w).toBeCloseTo(0.117, 1);
    expect((word.x1 - tag.x1) / w).toBeCloseTo(0.15, 1);
    // Dentro do viewBox (y até 80) e sem invadir a marca (x a partir de 298,5).
    expect(tag.y1).toBeLessThanOrEqual(80.01);
    expect(tag.x1).toBeLessThan(298.5);
  });

  it("a marca continua nos quatro polígonos medidos, dois de cima e dois laterais", () => {
    expect(MARK_POLYGONS.map((p) => p.fill)).toEqual(["top", "side", "top", "side"]);
    expect(MARK_POLYGONS[2].points).toBe("317.5,1 337.5,12.5 331,15.5 311,4");
  });
});

describe("logo-paths (tamanho: 2 casas decimais)", () => {
  it("nenhum número tem mais de 2 casas decimais", () => {
    const nums = (WORDMARK_PATH + " " + TAGLINE_PATH).match(/-?\d*\.?\d+/g) ?? [];
    expect(nums.length).toBeGreaterThan(1000);
    const longos = nums.filter((n) => (n.split(".")[1]?.length ?? 0) > 2);
    expect(longos.slice(0, 5)).toEqual([]);
  });

  it("os dois caminhos somam menos de 20 KB (eram 47 KB com 18 dígitos)", () => {
    expect(WORDMARK_PATH.length + TAGLINE_PATH.length).toBeLessThan(20_000);
  });
});
