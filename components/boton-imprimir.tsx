'use client';

import { Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';

/** Botón que abre el diálogo de impresión del navegador. */
export function BotonImprimir() {
  return (
    <Button type="button" variant="outline" size="lg" onClick={() => window.print()}>
      <Printer className="mr-2 h-5 w-5" />
      Imprimir etiqueta
    </Button>
  );
}
