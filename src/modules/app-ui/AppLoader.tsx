import React, { useCallback, useEffect } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useDataSync } from "../data-sync/providers/DataSyncProvider";

export const AppLoader: React.FC = () => {
    const { currentUser } = useAuth();
    const { orchestrator } = useDataSync();
    const { householdId } = useParams();
    const navigate = useNavigate();

    const goToLogin = useCallback(() => {
        navigate('/auth/login');
    }, [navigate]);

    const goToHouseholdSelection = useCallback(() => {
        const params: Record<string, string> = {};
        if (householdId) {
            params.householdId = householdId;
        }
        navigate('/auth/households?' + new URLSearchParams(params).toString());
    }, [navigate, householdId]);

    useEffect(() => {
        if (!currentUser) {
            return goToLogin();
        }

        if (!orchestrator || orchestrator.ctx.tenant.id !== householdId) {
            return goToHouseholdSelection();
        }

    }, [currentUser, orchestrator, householdId, goToLogin, goToHouseholdSelection]);

    useEffect(() => {
        const beforeUnload = async (e: Event) => {
            if (!orchestrator) return;
            if (orchestrator.isDirty()) {
                orchestrator.syncNow();
                e.preventDefault();
            }
        };

        window.addEventListener('beforeunload', beforeUnload);

        return () => {
            window.removeEventListener('beforeunload', beforeUnload);
        };
    }, [orchestrator]);

    if (currentUser && orchestrator) return <Outlet />;
    return <></>
}