import Link from "next/link";
import { CartLink } from "@/components/cart-link";

const SHOP_NAME = "kittycat"; 

export function SiteHeader() {
  return (
    <>
      <p className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950">
        Demo site: please don&apos;t pay for any orders.
      </p>
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold">{SHOP_NAME}</Link>
          <CartLink />
        </div>
      </header>
    </>
  );
}