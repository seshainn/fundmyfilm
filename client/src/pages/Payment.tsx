import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

type PaymentFormData = {
  name: string;
  email: string;
};

export default function Payment() {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PaymentFormData>();

  const onSubmit: SubmitHandler<PaymentFormData> = async (formData) => {
    if (!stripe || !elements) return;
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
    });

    if (error) return console.error(error.message);

    try {
        const { data } = await api.post("/payment", {
            paymentMethodId: paymentMethod.id,
            amount: 500, // Example
            project_id: "123"
        });

        if (data.status === "requires_action") {
            // Trigger the 3DS OTP Popup
            const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret);
            if (confirmError) {
                navigate("/payment-failed");
            } else {
                navigate("/payment-success");
            }
        } else if (data.status === "succeeded") {
            navigate("/payment-success");
        }
    } catch (err) {
        navigate("/payment-failed");
    }
};

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Complete Payment</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* React Hook Form fields for non-sensitive data */}
        <div>
          <label className="block mb-1">Name on Card</label>
          <input 
            {...register("name", { required: "Name is required" })}
            className="w-full p-2 border rounded"
          />
          {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block mb-1">Email</label>
          <input 
            {...register("email", { required: "Email is required" })}
            className="w-full p-2 border rounded"
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>

        {/* Secure Stripe CardElement */}
        <div className="p-3 border rounded">
          <label className="block mb-2 text-sm text-gray-600">Card Details</label>
          <CardElement options={{ style: { base: { fontSize: "16px" } } }} />
        </div>

        <button 
          type="submit" 
          disabled={!stripe || isSubmitting}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSubmitting ? "Processing..." : "Pay Now"}
        </button>
      </form>
    </div>
  );
}