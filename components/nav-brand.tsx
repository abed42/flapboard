import Image from "next/image";
import Link from "next/link";

export function NavBrand() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src="/flapboard-logo.svg"
        alt="Flapboard"
        width={36}
        height={36}
        priority
      />
      <span>Flapboard</span>
    </Link>
  );
}
