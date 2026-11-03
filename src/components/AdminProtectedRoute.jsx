import { useEffect, useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";

// The app owner always has admin access, regardless of their stored role
// (Base44 locks the owner's role and it can't be set to 'admin').
const OWNER_EMAIL = "jan.brown@happyhourflower.com";
const hasAdminAccess = (user) =>
    !!user && (user.role === 'admin' || user.email?.toLowerCase() === OWNER_EMAIL);

export default function AdminProtectedRoute() {
    const [isVerified, setIsVerified] = useState(null);
    const location = useLocation();

    useEffect(() => {
        const checkAdminAccess = async () => {
            try {
                const user = await base44.auth.me();
                
                // CRITICAL: Triple-check admin status
                if (!hasAdminAccess(user)) {
                    // Log unauthorized access attempt
                    if (user) {
                        await base44.entities.ActivityLog.create({
                            venue_id: 'system',
                            user_id: user.id,
                            user_name: user.full_name,
                            action: 'admin_breach_attempt',
                            description: `Non-admin user ${user.email} attempted to access protected admin route ${location.pathname}`,
                            changes: { 
                                role: user.role, 
                                email: user.email, 
                                route: location.pathname,
                                attempt_type: 'protected_route'
                            }
                        }).catch(() => {});
                    }
                    
                    setIsVerified(false);
                    return;
                }

                setIsVerified(true);
            } catch (error) {
                setIsVerified(false);
            }
        };

        checkAdminAccess();
        // Verify admin status once on mount, not on every in-admin navigation —
        // re-running on each route change contributed to API rate-limit bursts.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (isVerified === null) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-950">
                <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isVerified) {
        return <Navigate to="/admin/login" replace state={{ from: location }} />;
    }

    return <Outlet />;
}