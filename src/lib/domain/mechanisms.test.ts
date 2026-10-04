import { describe, expect, it } from "vitest";
import { allowedContributionMechanisms, checkContributionMechanism } from "./mechanisms";

describe("mechanisms (R-9)", () => {
  it("art. 18 só aceita art. 18", () => {
    expect(checkContributionMechanism("rouanet_art18", "rouanet_art18", "patrocinio").ok).toBe(
      true,
    );
    expect(checkContributionMechanism("rouanet_art18", "rouanet_art26_doacao", "doacao").ok).toBe(
      false,
    );
  });

  it("art. 26 aceita patrocínio ou doação conforme o tipo", () => {
    expect(allowedContributionMechanisms("rouanet_art26_patrocinio")).toEqual([
      "rouanet_art26_patrocinio",
      "rouanet_art26_doacao",
    ]);
    expect(
      checkContributionMechanism("rouanet_art26_patrocinio", "rouanet_art26_doacao", "doacao").ok,
    ).toBe(true);
    expect(
      checkContributionMechanism("rouanet_art26_patrocinio", "rouanet_art26_doacao", "patrocinio")
        .ok,
    ).toBe(false);
  });

  it("audiovisual 1º-A, LIC-RS e LIC municipal só aceitam o próprio mecanismo", () => {
    expect(
      checkContributionMechanism("audiovisual_art1A", "audiovisual_art1A", "patrocinio").ok,
    ).toBe(true);
    expect(checkContributionMechanism("lic_rs", "rouanet_art18", "patrocinio").ok).toBe(false);
    expect(checkContributionMechanism("lic_municipal", "lic_municipal", "doacao").ok).toBe(true);
  });

  it("fomento direto não recebe aporte", () => {
    for (const m of ["fsa_brde", "pnab", "edital"] as const) {
      expect(allowedContributionMechanisms(m)).toEqual([]);
      expect(checkContributionMechanism(m, m, "patrocinio").ok).toBe(false);
    }
  });
});
