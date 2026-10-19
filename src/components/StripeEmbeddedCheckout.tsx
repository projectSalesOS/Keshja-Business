import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createSubscriptionCheckout } from "@/lib/payments.functions";

interface StripeEmbeddedCheckoutProps {
  orgId: string;
  planId: "basic" | "premium";
  interval: "monthly" | "annual";
  returnUrl: string;
}

export function StripeEmbeddedCheckout({ orgId, planId, interval, returnUrl }: StripeEmbeddedCheckoutProps) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createSubscriptionCheckout({
      data: { orgId, planId, interval, returnUrl, environment: getStripeEnvironment() },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Das Zahlungssystem hat keine Sitzung zurückgegeben.");
    return result.clientSecret;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
