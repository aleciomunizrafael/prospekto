# ADR-002: padrões do simulador (LC 224/2025 e LIC-RS)

| Campo | Valor |
|---|---|
| Status | Aceito |
| Data | 04/10/2026 |
| Decide | Rafael (implementação), com base em `docs/site/simulador-spec.md`, seção 13.1, e `docs/dominio/leis-de-incentivo.md`, seções 2.5 e 6.1 |
| Pendente | Comunicação da decisão D1 à Daniela (pergunta C1 do README) |

## Contexto

O número da primeira tela do simulador depende de duas escolhas que a lei não fecha sozinha: se a redução linear de 10% da Lei Complementar 224/2025 entra no cálculo da pessoa jurídica, e se a tabela de faixas da LIC-RS, confirmada só em fontes secundárias, vai ao ar. O código não decide nada disso: lê os campos de `docs/dominio/parametros-simulador.json`. Este ADR registra o valor desses campos e o que faria cada decisão ser revista.

## D1. A LC 224/2025 é aplicada por padrão na pessoa jurídica

- O número grande da tela de resultado é o de 3,6% do IRPJ devido (fator 0,9 sobre o limite de 4%). Logo abaixo aparece o valor de 4% "sem a redução", e o interruptor "Aplicar redução da LC 224/2025" fica visível com o aviso `lc224_notice`.
- Campo lido: `regras_gerais.lc_224_2025.aplicar_por_padrao` (hoje `true`) e `fator_pj` (0,9). Pessoa física não é alcançada (`aplica_a_pf: false`).
- Fundamento: a Receita Federal confirmou a redução para a Lei Rouanet (Perguntas e Respostas sobre a LC 224/2025, versão 5, de 30/07/2026, pergunta 21.1). O Ministério da Cultura contesta (Parecer Conjur 69/2026) e o PLP 11/2026 tramita na Câmara. Mostrar o número menor primeiro evita prometer um teto que o contador pode não confirmar; o teto legal de 4% continua na tela e nas peças de campanha como "até 4% (3,6% com a LC 224/2025)".
- Revisar quando: o PLP 11/2026 for aprovado, houver decisão judicial com efeito geral, ou uma nova versão do Perguntas e Respostas retirar a Rouanet da redução. Ação: trocar `aplicar_por_padrao` para `false` no JSON, manter o interruptor, atualizar `atualizado_em` e os textos.

## D2. O módulo LIC-RS vai ao ar com aviso, não como "fale conosco"

- Para empresas no lucro presumido ou arbitrado que são contribuintes de ICMS no RS, o simulador calcula o limite anual por faixa do ICMS próprio do ano anterior e o repasse ao FAC, exibindo o aviso `lic_rs_notice` com a marca [verificar].
- Campos lidos: `mecanismos.lic_rs.limite_por_faixa_icms_ano_anterior`, `limite_por_faixa_status` (hoje `verificar`), `repasse_adicional_fac_percentual`.
- Fundamento: a tabela bate em três fontes secundárias independentes e a página oficial da Sedac confirma a amplitude "de 5% a 20%"; o texto da Lei 13.490/2010, art. 6º (redação da Lei 15.449/2020), não pôde ser aberto na AL-RS em 03/10/2026. Esconder o módulo deixaria o lead presumido sem a única alternativa que existe para ele. O Decreto 55.448/2020 está revogado (Decreto 57.531/2024, art. 24) e não aparece como norma vigente em texto de tela.
- Revisar quando: o texto da lei for conferido na AL-RS ou a Sedac responder. Ação: mudar `limite_por_faixa_status` para `verificado` e retirar a marca dos textos; se a tabela for outra, corrigir o JSON e os testes T-LIC-01 a T-LIC-09 juntos.

## Consequências

- Os testes T-PJ-02, T-PJ-04 e T-PJ-20 (com LC 224) e T-LIC-01 a T-LIC-09 passam a ser o contrato dessas decisões.
- Peças de campanha e páginas do site citam "até 4% (3,6% com a LC 224/2025)" onde antes citavam só "4%".
- `simulations.apply_lc224` guarda o valor usado em cada simulação, para que uma mudança futura de padrão não altere resultados já enviados.
