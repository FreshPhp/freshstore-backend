import { useEffect } from "react";

export default function CheckoutButton({ preferenceId }) {
  useEffect(() => {
    if (!preferenceId) return;

    const mp = new window.MercadoPago(process.env.REACT_APP_MERCADOPAGO_PUBLIC_KEY, {
      locale: "pt-BR"
    });

    mp.checkout({
      preference: { id: preferenceId },
      render: {
        container: "#button-checkout", // ID do container do botão
        label: "Pagar Agora"
      }
    });
  }, [preferenceId]);

  return <div id="button-checkout"></div>;
}
