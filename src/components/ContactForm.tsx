import { useState } from "react";

interface Props {
  propertyTitle?: string;
  branchEmail?: string;
  formEndpoint?: string;
}

export default function ContactForm({ propertyTitle, branchEmail, formEndpoint }: Props) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: propertyTitle
      ? `I am interested in: ${propertyTitle}. Please contact me with more details.`
      : "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const endpoint = formEndpoint || import.meta.env?.PUBLIC_FORM_ENDPOINT;
      if (!endpoint) {
        // Fallback: mailto link
        const subject = propertyTitle ? `Enquiry about ${propertyTitle}` : "Website Enquiry";
        const body = `Name: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\n\n${formData.message}`;
        const mailto = branchEmail || "info@example.com";
        window.location.href = `mailto:${mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        setStatus("sent");
        return;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...formData,
          _subject: propertyTitle ? `Enquiry: ${propertyTitle}` : "Website Enquiry",
        }),
      });

      if (res.ok) {
        setStatus("sent");
        setFormData({ name: "", email: "", phone: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <p className="text-green-800 font-semibold text-lg mb-1">Thank you!</p>
        <p className="text-green-700 text-sm">We'll be in touch shortly.</p>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400";

  return (
    <div onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
            className={inputClass}
            placeholder="Your full name"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              id="contact-email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData((d) => ({ ...d, email: e.target.value }))}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              id="contact-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData((d) => ({ ...d, phone: e.target.value }))}
              className={inputClass}
              placeholder="07xxx xxxxxx"
            />
          </div>
        </div>

        <div>
          <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-1">
            Message *
          </label>
          <textarea
            id="contact-message"
            required
            rows={4}
            value={formData.message}
            onChange={(e) => setFormData((d) => ({ ...d, message: e.target.value }))}
            className={inputClass}
            placeholder="How can we help?"
          />
        </div>

        {status === "error" && (
          <p className="text-red-600 text-sm">
            Something went wrong. Please try again or call us directly.
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={status === "sending" || !formData.name || !formData.email || !formData.message}
          className="w-full py-3 px-6 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "var(--color-brand)" }}
        >
          {status === "sending" ? "Sending..." : "Send Enquiry"}
        </button>
      </div>
    </div>
  );
}
