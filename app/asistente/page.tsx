import { redirect } from 'next/navigation';

/**
 * La página /asistente ya no es la entrada del asistente: ahora es
 * una burbuja flotante presente en todo el ERP
 * (components/burbuja-asistente.tsx). Esta ruta solo redirige al
 * tablero para no dejar una página duplicada ni un enlace roto.
 */
export default function AsistentePage() {
  redirect('/dashboard');
}
