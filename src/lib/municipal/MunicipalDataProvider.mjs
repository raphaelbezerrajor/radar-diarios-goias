export class MunicipalDataProvider {
  async listarEdicoes() { throw new Error("listarEdicoes() não implementado"); }
  async buscarAtos() { throw new Error("buscarAtos() não implementado"); }
  async obterAto() { throw new Error("obterAto() não implementado"); }
  async listarNoticias() { throw new Error("listarNoticias() não implementado"); }
  async obterNoticia() { throw new Error("obterNoticia() não implementado"); }
  async listarProposicoes() { throw new Error("listarProposicoes() não implementado"); }
  async listarProcessosTCM() { throw new Error("listarProcessosTCM() não implementado"); }
  async obterEstadoDaBase() { throw new Error("obterEstadoDaBase() não implementado"); }
  async buscarEntidades() { throw new Error("buscarEntidades() não implementado"); }
  async obterEntidade() { throw new Error("obterEntidade() não implementado"); }
}

export const MUNICIPAL_PROVIDER_METHODS = Object.freeze([
  "listarEdicoes",
  "buscarAtos",
  "obterAto",
  "listarNoticias",
  "obterNoticia",
  "listarProposicoes",
  "listarProcessosTCM",
  "obterEstadoDaBase",
  "buscarEntidades",
  "obterEntidade"
]);

export function assertMunicipalDataProvider(provider) {
  const missing = MUNICIPAL_PROVIDER_METHODS.filter((method) => typeof provider?.[method] !== "function");
  if (missing.length) throw new TypeError(`MunicipalDataProvider incompleto: ${missing.join(", ")}`);
  return provider;
}

