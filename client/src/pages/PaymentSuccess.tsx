import { useNavigate } from "react-router-dom";

export default function PaymentSuccess() {
    const navigate = useNavigate()
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-green-500 text-6xl mb-4">Checkmark Icon</div>
        <h1 className="text-2xl font-bold">Payment Successful!</h1>
        <p className="text-gray-600 mt-2">Thank you for your contribution.</p>
        <button 
            onClick={() => navigate('/') }
            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded shadow"
        >
            Return to Homepage
        </button>
        </div>
    );
}