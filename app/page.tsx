import { Product } from "@/types";
import ProductGrid from "./components/ProductGrid";

async function getProducts(): Promise<Product[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/products`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export default async function Home() {
  const products = await getProducts();

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Hero section */}
      <div className="mb-20 flex flex-col md:flex-row items-center gap-12 pt-8">
        <div className="flex-1">
          <div className="inline-flex items-center rounded-full bg-[#fcf8e3] px-3 py-1 text-sm font-medium text-[#7a6522] mb-6">
            India&apos;s #1 sexual health provider
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[var(--gold)] mb-6 leading-[1.1]">
            Better Sex, <br className="hidden md:block" />
            Better Life
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-xl leading-relaxed mb-8">
            Science-backed solutions for sexual health, delivered with care.
          </p>
          <div className="flex items-center gap-4">
            <button className="px-8 py-3.5 rounded-full bg-[var(--gold)] text-white font-semibold hover:bg-[var(--gold-hover)] transition-all shadow-md">
              Book Appointment
            </button>
            <button className="px-8 py-3.5 rounded-full bg-white text-[var(--text-primary)] font-semibold border border-[var(--border-default)] hover:bg-[var(--surface-2)] transition-all shadow-sm">
              Take Self Assessment
            </button>
          </div>
          <div className="flex items-center gap-4 mt-8">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full border-2 border-white bg-blue-500 overflow-hidden flex items-center justify-center text-white text-xs">
                J
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-white bg-[var(--gold)] overflow-hidden flex items-center justify-center text-white text-xs">
                A
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-white bg-green-500 overflow-hidden flex items-center justify-center text-white text-xs">
                M
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Trusted by 4,00,000+ patients
              </p>
              <div className="flex items-center gap-1 text-[#f59e0b] text-sm">
                ★★★★★{" "}
                <span className="text-[var(--text-muted)] font-normal">
                  (4.8/5)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mock Hero Image Placeholder - replacing with a clean container */}
        <div className="flex-1 w-full relative">
          <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl relative bg-[var(--surface-2)]">
            <img
              src="https://images.unsplash.com/photo-1516585427167-9f4af9627e6c?w=800"
              alt="Happy couple"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
          Featured Medicines & Supplements
        </h2>
        <p className="text-[var(--text-secondary)] text-sm mb-8">
          Order authentic, science-backed treatments delivered discreetly to
          your door.
        </p>
      </div>

      <ProductGrid products={products} />
    </div>
  );
}
