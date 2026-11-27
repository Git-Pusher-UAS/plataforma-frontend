/** Logo de Ahome · SAI. Lleva al sitio del Ayuntamiento en otra pestaña, sin enviar de dónde viene. */
export function Logo({ className = 'logo-sai' }: { className?: string }) {
  return (
    <a href="https://ahome.gob.mx" target="_blank" rel="noopener noreferrer" className="logo-enlace" aria-label="Ayuntamiento de Ahome (abre en otra pestaña)">
      <img src="/assets/ahome_sai_Logo.svg" alt="" className={className} width={96} height={32} decoding="async" />
    </a>
  )
}
