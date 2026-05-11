"use client";

import { FormEvent, useEffect, useState } from "react";
import { FiLogIn, FiUserPlus } from "react-icons/fi";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  syncLocalInteractionsToUser,
  type AuthUser,
} from "@/lib/history";

type AuthMode = "login" | "register";

const AuthPage = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const nextUser =
        mode === "login"
          ? await loginUser(username, password)
          : await registerUser(username, email, password);

      await syncLocalInteractionsToUser();
      setUser(nextUser);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await logoutUser();
    setUser(null);
    setLoading(false);
  };

  return (
    <main className="flex-1 bg-gray-50 px-4 py-10 md:px-6">
      <section className="mx-auto w-full max-w-md">
        <div className="border-b border-gray-200 pb-6">
          <p className="text-sm font-medium text-blue-600">Account</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950">
            User auth
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Sign in to save favorites, ratings, notes, and playlists to your
            account instead of only this browser.
          </p>
        </div>

        {user ? (
          <div className="mt-6 rounded-md border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Signed in as</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-950">
              {user.username}
            </h2>
            {user.email && (
              <p className="mt-1 text-sm text-gray-500">{user.email}</p>
            )}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-gray-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sign out
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-6 rounded-md border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="grid grid-cols-2 gap-2 rounded-md bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`inline-flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium ${
                  mode === "login"
                    ? "bg-white text-gray-950 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                <FiLogIn aria-hidden="true" />
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`inline-flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium ${
                  mode === "register"
                    ? "bg-white text-gray-950 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                <FiUserPlus aria-hidden="true" />
                Register
              </button>
            </div>

            <label className="mt-5 block text-sm font-medium text-gray-800">
              Username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                className="mt-2 h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none transition focus:border-blue-400"
              />
            </label>

            {mode === "register" && (
              <label className="mt-4 block text-sm font-medium text-gray-800">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none transition focus:border-blue-400"
                />
              </label>
            )}

            <label className="mt-4 block text-sm font-medium text-gray-800">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                className="mt-2 h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none transition focus:border-blue-400"
              />
            </label>

            {error && (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
};

export default AuthPage;
