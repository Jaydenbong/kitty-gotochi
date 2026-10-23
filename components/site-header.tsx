import Link from "next/link";

const SHOP_NAME = "kittycat"; 

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold">{SHOP_NAME}</Link>
        <Link href="/cart" className="text-sm hover:underline">Cart</Link>
      </div>
    </header>
  );
}