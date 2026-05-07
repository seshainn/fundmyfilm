import { useNavigate } from "react-router-dom";
export default function PaymentFailed() {
    const navigate = useNavigate()
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-red-500 text-6xl mb-4">X Icon</div>
        <h1 className="text-2xl font-bold">Payment Failed</h1>
        <p className="text-gray-600 mt-2">Something went wrong with your transaction. Please try again.</p>
        <div className="flex gap-4 mt-6">
            <button 
                onClick={() => window.location.href = '/payment'}
                className="border border-blue-600 text-blue-600 px-6 py-2 rounded"
            >
                Try Again
            </button>
            <button 
                onClick={() => navigate('/') }
                className="bg-gray-200 px-6 py-2 rounded"
            >
                Go Home
            </button>
        </div>
        </div>
    );
}