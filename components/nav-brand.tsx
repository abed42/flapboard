import Image from "next/image";
import Link from "next/link";

export function NavBrand() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src="/gameplug-logo.svg"
        alt="Gameplug"
        width={52}
        height={52}
        priority
      />
      <span>Gamerplug Mission Control</span>
    </Link>
  );
}
