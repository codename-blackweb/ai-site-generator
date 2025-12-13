import { useState } from "react";
import { Mail, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const CONTACT_EMAIL = "support@example.com";

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const copyEmail = async () => {
    await navigator.clipboard.writeText(CONTACT_EMAIL);
    toast.success("Email copied.");
  };

  const submit = () => {
    if (!email.trim() || !message.trim()) {
      toast.error("Add your email and a message.");
      return;
    }

    const subject = encodeURIComponent(`Contact from ${name?.trim() || "User"}`);
    const body = encodeURIComponent(
      `Name: ${name || "(not provided)"}\nEmail: ${email}\n\nMessage:\n${message}`
    );

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <main className="min-h-[calc(100vh-80px)]">
      <section className="pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="container px-6 max-w-4xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl">Contact</h1>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            Use the form, or email directly. This page is fully functional without backend wiring.
          </p>

          <div className="mt-10 grid gap-6">
            <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-secondary/40 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium">{CONTACT_EMAIL}</div>
                  </div>
                </div>
                <Button variant="glass" className="gap-2" onClick={copyEmail}>
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>

              <div className="mt-8 grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="bg-secondary/50"
                  />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    className="bg-secondary/50"
                  />
                </div>

                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What do you need?"
                  className="min-h-[140px] bg-secondary/50 resize-none"
                />

                <Button variant="coral" className="w-full" onClick={submit}>
                  Send Message
                </Button>

                <div className="text-xs text-muted-foreground">
                  If it’s a bug, include the browser console error and the Vite terminal output.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ContactPage;
