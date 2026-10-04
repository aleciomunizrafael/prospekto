import { site, waLink } from "@/config/site";

type Props = {
  message?: string;
  label?: string;
  className?: string;
};

export function WhatsappButton({
  message = site.whatsappMessages.home,
  label = "Falar com a Daniela no WhatsApp",
  className = "",
}: Props) {
  return (
    <a
      href={waLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium ${className}`}
    >
      {label}
    </a>
  );
}
