import InquiryForm from "@/components/inquiry-form";
import type { SiteContent } from "@/content";

export default function Contact({ site }: { site: SiteContent }) {
  return (
    <section className="contact" id="contact">
      <div className="wrap">
        <div className="sec-head">
          <h2>{site.contact.heading}</h2>
          <p className="lead">{site.contact.lead}</p>
        </div>
        <InquiryForm site={site} variant="full" idPrefix="c" />
      </div>
    </section>
  );
}
