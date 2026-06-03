import { useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import {
  CardElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import type { Project } from "./Home";

type PaymentFormData = {
  name: string;
  receipt_email?: string;
  amount: number;
};

type LocationState = {
  project?: Project;
};

export default function Payment() {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const location = useLocation();

  const project = (location.state as LocationState | null)?.project;

  const remainingAmount = project
    ? Number(project.budget) - Number(project.amount_collected)
    : 0;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<PaymentFormData>({
    defaultValues: {
      amount: remainingAmount > 500 ? 500 : remainingAmount
    }
  });

  if (!project) {
    return (
      <div className="max-w-md mx-auto p-4">
        <p>No project selected.</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 bg-orange-500 text-white px-4 py-2 rounded"
        >
          Go Home
        </button>
      </div>
    );
  }

  const onSubmit: SubmitHandler<PaymentFormData> = async (formData) => {
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) return;

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
      billing_details: {
        name: formData.name,
        email: formData.receipt_email
      }
    });

    if (error || !paymentMethod) {
      navigate("/payment-failed");
      return;
    }

    try {
      const { data } = await api.post("/payments", {
        payment_method_id: paymentMethod.id,
        amount: formData.amount,
        project_id: project.id,
        receipt_email: formData.receipt_email
      });

      if (data.status === "requires_action") {
        const { error: confirmError } = await stripe.confirmCardPayment(
          data.clientSecret
        );

        if (confirmError) {
          navigate("/payment-failed");
        } else {
          navigate("/payment-success");
        }

        return;
      }

      if (data.status === "succeeded" || data.status === "processing") {
        navigate("/payment-success");
        return;
      }

      navigate("/payment-failed");
    } catch {
      navigate("/payment-failed");
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-2">Complete Payment</h2>

      <div className="mb-4 p-3 bg-gray-100 rounded">
        <p className="font-semibold">{project.title}</p>
        <p className="text-sm">{project.logline}</p>
        <p className="text-sm mt-1">
          Remaining: ₹{remainingAmount.toLocaleString()}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block mb-1">Contribution Amount</label>
          <input
            type="number"
            min={1}
            max={remainingAmount}
            {...register("amount", {
              valueAsNumber: true,
              required: "Amount is required",
              min: {
                value: 1,
                message: "Amount must be greater than 0"
              },
              max: {
                value: remainingAmount,
                message: "Amount exceeds remaining budget"
              }
            })}
            className="w-full p-2 border rounded"
          />
          {errors.amount && (
            <p className="text-red-500 text-sm">{errors.amount.message}</p>
          )}
        </div>

        <div>
          <label className="block mb-1">Name on Card</label>
          <input
            {...register("name", { required: "Name is required" })}
            className="w-full p-2 border rounded"
          />
          {errors.name && (
            <p className="text-red-500 text-sm">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block mb-1">Receipt Email</label>
          <input
            {...register("receipt_email")}
            className="w-full p-2 border rounded"
            placeholder="optional"
          />
        </div>

        <div className="p-3 border rounded">
          <label className="block mb-2 text-sm text-gray-600">
            Card Details
          </label>
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