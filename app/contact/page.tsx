import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { contactEmail, whatsappNumber } from "@/lib/data";

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="bg-ocean-50 pt-28">
        <section className="section">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-ocean-700">Contact</p>
              <h1 className="mt-3 text-5xl font-black">Get in touch with us</h1>
              <p className="mt-5 text-lg leading-8 text-ocean-950/65">Press enquiries, group bookings, agents, and direct guests can reach the team here.</p>
              <div className="mt-8 grid gap-3 font-bold">
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                <a href={`https://wa.me/${whatsappNumber}`}>+960 777 3905</a>
                <span>Vahmaafushi Island, Kaafu Atoll, Maldives</span>
              </div>
            </div>
            <form className="grid gap-4 rounded-[2rem] bg-white p-6 shadow-sm">
              {["First name", "Last name", "Email address", "Phone / WhatsApp", "Subject"].map((label) => (
                <label key={label} className="grid gap-2 text-sm font-bold">
                  {label}
                  <input className="rounded-2xl border border-ocean-950/10 px-4 py-3" />
                </label>
              ))}
              <label className="grid gap-2 text-sm font-bold">
                Message
                <textarea rows={5} className="rounded-2xl border border-ocean-950/10 px-4 py-3" />
              </label>
              <button className="rounded-full bg-ocean-950 px-6 py-4 font-black text-white">Send Message</button>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
