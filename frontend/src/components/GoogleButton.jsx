import { useEffect, useRef } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Renders the official Google sign-in button (if a client id is configured).
// On success it calls onCredential(idToken).
export default function GoogleButton({ onCredential }) {
  const ref = useRef(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;

  useEffect(() => {
    if (!CLIENT_ID || !ref.current) return;
    let tries = 0;
    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(timer);
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (resp) => cb.current(resp.credential),
        });
        ref.current.innerHTML = "";
        window.google.accounts.id.renderButton(ref.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          width: 300,
        });
      } else if (++tries > 40) {
        clearInterval(timer); // give up after ~4s
      }
    }, 100);
    return () => clearInterval(timer);
  }, []);

  if (!CLIENT_ID) return null;
  return <div ref={ref} className="google-btn" />;
}
