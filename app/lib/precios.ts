export type PricingConfig = {
  ieps: number;
  iva: number;
  margen: number;
};

export function calcularPrecioVenta({
  costoUnitario,
  ieps,
  iva,
  margen,
}: {
  costoUnitario: number;
} & PricingConfig) {
  const costoBase = costoUnitario;
  const impuestoIEPS = costoBase * ieps;
  const costoConIEPS = costoBase + impuestoIEPS;
  const impuestoIva = costoConIEPS * iva;
  const costoConImpuestos = costoConIEPS + impuestoIva;
  const ganancia = costoConImpuestos * margen;
  const precioFinal = costoConImpuestos + ganancia;

  return {
    costoBase,
    impuestoIEPS,
    impuestoIva,
    costoConImpuestos,
    ganancia,
    precioFinal,
  };
}
