import { useState } from 'react'

// U-17 · Página neutra a la que lleva «Salir» en el portal (supuesto 3: una página de recetas).
// No menciona la aplicación, no tiene enlaces de regreso y no usa los colores de la marca.
const RECETAS = [
  {
    nombre: 'Frijoles charros',
    tiempo: '45 min',
    pasos: ['Cuece los frijoles con sal y ajo.', 'Fríe tocino, chorizo, cebolla y chile.', 'Mezcla todo y deja hervir 10 minutos.'],
  },
  {
    nombre: 'Agua de jamaica',
    tiempo: '20 min',
    pasos: ['Hierve una taza de flor de jamaica en un litro de agua.', 'Cuela y agrega dos litros de agua fría.', 'Endulza al gusto y sirve con hielo.'],
  },
  {
    nombre: 'Tortillas de harina',
    tiempo: '40 min',
    pasos: ['Mezcla harina, sal, manteca y agua tibia.', 'Amasa y deja reposar 15 minutos.', 'Extiende bolitas y cuécelas en el comal.'],
  },
]

export function PaginaNeutra() {
  const [abierta, setAbierta] = useState<string | null>(null)
  return (
    <main className="neutra">
      <header>
        <h1>Cocina de casa</h1>
        <p>Recetas sencillas para todos los días</p>
      </header>
      {RECETAS.map((r) => (
        <article key={r.nombre} className="neutra-receta">
          <h2>{r.nombre}</h2>
          <p>Tiempo: {r.tiempo}</p>
          <button type="button" onClick={() => setAbierta(abierta === r.nombre ? null : r.nombre)} aria-expanded={abierta === r.nombre}>
            {abierta === r.nombre ? 'Ocultar pasos' : 'Ver pasos'}
          </button>
          {abierta === r.nombre && (
            <ol>
              {r.pasos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
          )}
        </article>
      ))}
    </main>
  )
}
