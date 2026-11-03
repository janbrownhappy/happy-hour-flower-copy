import { useState } from "react";
import { Shield, Mail, Lock, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await base44.auth.loginViaEmailPassword(email, password);
            const user = result?.user;
            const isOwner = user?.email?.toLowerCase() === "jan.brown@happyhourflower.com";
            if (user?.role === 'admin' || isOwner) {
                window.location.href = "/admin";
            } else {
                base44.auth.logout();
                setError(`Access denied. Role is "${user?.role || 'unknown'}" — admins only.`);
                setLoading(false);
            }
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || JSON.stringify(err) || "Login failed.";
            setError(msg);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="mx-auto mb-4 w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center">
                        <Shield className="w-8 h-8 text-amber-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
                    <p className="text-gray-400 text-sm mt-1">Restricted access — administrators only</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-300">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    autoFocus
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 h-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-amber-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-gray-300">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 h-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-amber-500"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                            disabled={loading}
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>
                            ) : (
                                "Sign In to Admin Portal"
                            )}
                        </Button>
                    </form>
                </div>

                <p className="text-center text-xs text-gray-600 mt-6">
                    Not an admin?{" "}
                    <a href="/login" className="text-gray-500 hover:text-gray-400 underline">
                        Return to main login
                    </a>
                </p>
            </div>
        </div>
    );
}