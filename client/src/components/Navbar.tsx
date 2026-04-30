// src/components/Navbar.tsx
import { Link } from "react-router-dom";
import { FaSun, FaMoon } from "react-icons/fa";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { api } from "../api/client";

export default function Navbar() {
  const { accessToken, logout } = useAuthStore();

  // Persisted dark mode
  const [dark, setDark] = useState(
    localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.warn("Logout request failed", err);
    } finally {
      logout(); 
  }
};

  return (
    <div className="flex items-center justify-between px-6 py-4 
      bg-orange-500 dark:bg-gray-900 text-white shadow">

      {/* Left */}
      <Link to="/" className="text-xl font-bold tracking-wide">
        🎬 ProduceAFilm
      </Link>

      {/* Center */}
      <Input
        placeholder="Search a film..."
        className="w-1/3 bg-white text-black dark:bg-gray-800 dark:text-white"
      />

      {/* Right */}
      <div className="flex gap-3 items-center">

        {!accessToken ? (
          <>
            <Link to="/login">
              <Button variant="secondary" className="bg-white text-black hover:bg-gray-200">
                Sign In
              </Button>
            </Link>

            <Link to="/register">
              <Button className="bg-teal-500 hover:bg-teal-600 text-white">
                Sign Up
              </Button>
            </Link>
          </>
        ) : (
          <Button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Logout
          </Button>
        )}

        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          onClick={() => setDark(!dark)}
          className="text-white hover:bg-white/20"
        >
          {dark ? <FaSun /> : <FaMoon />}
        </Button>
      </div>
    </div>
  );
}