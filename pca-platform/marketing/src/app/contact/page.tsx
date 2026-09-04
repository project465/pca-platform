import { getSite } from "@/content";
import Shell from "@/components/shell";
import Contact from "@/components/contact";
import { FaqSection } from "@/components/sections";
import { PageHead } from "@/components/visuals";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  const site = getSite();
  return (
    <Shell>
      <PageHead label={site.faq.label} title={site.contact.heading} lead={site.contact.lead} />
      <Contact site={site} />
      <FaqSection site={site} />
    </Shell>
  );
}
