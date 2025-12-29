export default function Footer() {
  return (
    <footer className="mt-auto py-3 px-4 text-center">
      <p className="text-[10px] text-slate-400">
        Desarrollado por{" "}
        <a
          href="https://jonadevel-portfolio.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 hover:text-slate-700 hover:underline transition-colors"
        >
          Jonathan Guarirapa
        </a>
        {" - "}
        <a
          href="https://wa.me/56962614851"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 hover:text-slate-700 hover:underline transition-colors"
        >
          WhatsApp
        </a>
        {" | "}
        <a
          href="https://instagram.com/jonacrd1"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 hover:text-slate-700 hover:underline transition-colors"
        >
          Instagram
        </a>
        {" | "}
        <a
          href="mailto:jona.develp@gmail.com"
          className="text-slate-500 hover:text-slate-700 hover:underline transition-colors"
        >
          Email
        </a>
      </p>
    </footer>
  );
}




