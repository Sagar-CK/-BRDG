import Resend from "@auth/core/providers/resend";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY!,
      from: "info@betonthebridge.com",
      async sendVerificationRequest(params) {
        const { identifier: to, provider, url } = params
        const trueUrl = url.replace("http://localhost:3000", "https://betonthebridge.com")
        const { host } = new URL(trueUrl)
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: provider.from,
            to,
            subject: `Sign in to ${host}`,
              html: html({ url: trueUrl, host }),
            text: text({ url: trueUrl, host }),
          }),
        })
       
        if (!res.ok)
          throw new Error("Resend error: " + JSON.stringify(await res.json()))
      }
    }),
  ],
});

function html({ url, host }: { url: string; host: string }) {
  return `<p>Sign in to <a href="${url}">${host}</a></p>`;
}
function text({ url, host }: { url: string; host: string }) {
  return `Sign in to ${host}: ${url}`;
}
