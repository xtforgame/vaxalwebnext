import Hero from "@/components/home/Hero";
import TrustBar from "@/components/home/TrustBar";
import Methodology from "@/components/home/Methodology";
import ProductGrid from "@/components/home/ProductGrid";
import CaseTeaser from "@/components/home/CaseTeaser";
import Philosophy from "@/components/home/Philosophy";
import Founders from "@/components/home/Founders";
import CtaSection from "@/components/home/CtaSection";

export default function Home() {
  return (
    <>
      <Hero />
      <TrustBar />
      <Methodology />
      <ProductGrid />
      <CaseTeaser />
      <Philosophy />
      <Founders />
      <CtaSection />
    </>
  );
}
