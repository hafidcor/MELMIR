'use client';

import { Button } from '@/components/ui/button';
import { EVENTO_ABRIR_ASISTENTE } from '@/components/burbuja-asistente';

/**
 * Botón «Preguntar» de la tarjeta del Dashboard: abre la burbuja
 * flotante del asistente (componente cliente aparte porque la página
 * del Dashboard es de servidor y no puede tener onClick).
 */
export function BotonAbrirAsistente() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_ASISTENTE))}
    >
      Preguntar →
    </Button>
  );
}
