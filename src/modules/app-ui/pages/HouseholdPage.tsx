import EditHouseholdDialog from "@/modules/app-ui/components/households/EditHouseholdDialog";
import { TagIconComponent } from "@/modules/app-ui/icons/tags/TagIcons";
import { util } from "@/modules/app/entities/entities";
import type { Household } from "@/modules/app/entities/Household";
import { AppLogger } from "@/modules/app/logging/AppLogger";
import { GoogleDriveFileService } from "@/modules/app/store/cloud/google-drive/GoogleDriveFileService";
import { DateStrategy } from "@/modules/app/store/DateStrategy";
import { LocalPersistence } from "@/modules/app/store/local/LocalPersistence";
import { MemStore } from "@/modules/app/store/memory/MemStore";
import { useAuth } from "@/modules/auth/AuthProvider";
import type { IPersistence } from "@/modules/data-sync/interfaces/IPersistence";
import { useDataSync } from "@/modules/data-sync/providers/DataSyncProvider";
import { useTenant } from "@/modules/data-sync/providers/TenantProvider";
import TenantSelectionComponent from "@/modules/data-sync/ui/TenantSelectionComponent";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const HouseholdPage: React.FC = () => {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const { currentUser, token } = useAuth();
    const { orchestrator, load: loadDataSync, unload: unloadDataSync } = useDataSync();
    const { load: loadTenantManager, manager: tenantManager } = useTenant<typeof util, unknown, Household>();

    const [loading, setLoading] = useState(false);
    const [editTarget, setEditTarget] = useState<Household | null>(null);
    const autoSelectDefault = !params.get('pick');

    const returnBack = useCallback(() => {
        const householdId = params.get('householdId');
        navigate(householdId ? `/${householdId}` : '/');
    }, [navigate, params]);

    const loadHousehold = useCallback(async (household: Household) => {
        if (!tenantManager) return;
        setLoading(true);
        try {
            setParams(new URLSearchParams({
                householdId: household.id!,
            }));
            await loadDataSync(tenantManager.getDataSyncConfig(household));
        } finally {
            setLoading(false);
        }
    }, [tenantManager, loadDataSync, setParams]);

    // Auto-load if householdId param is present
    useEffect(() => {
        if (loading) return;
        const householdId = params.get('householdId');
        if (!householdId) { unloadDataSync(); return; }
        if (orchestrator && orchestrator.ctx.tenant.id === householdId) {
            returnBack();
        } else {
            tenantManager?.get(householdId).then(h => { if (h) loadHousehold(h); });
        }
    }, [loading, tenantManager, loadHousehold, unloadDataSync, orchestrator, params, returnBack]);

    // Bootstrap TenantManager on auth
    useEffect(() => {
        if (orchestrator || !currentUser) return;
        token().then(tokenObj => {
            if (!tokenObj) return;
            let cloudService: IPersistence<Household> | null = null;
            if (tokenObj.handlerId === 'google-drive') {
                cloudService = GoogleDriveFileService.load(token);
            }
            if (!cloudService) return;
            loadTenantManager({
                util,
                store: MemStore.getInstance(),
                logger: AppLogger.getInstance(),
                local: new LocalPersistence(),
                cloud: cloudService,
                strategy: new DateStrategy(),
            });
        });
    }, [currentUser, loadTenantManager, orchestrator]);

    const handleEdit = async (name: string, icon: string | undefined) => {
        if (!tenantManager || !editTarget?.id) return;
        await tenantManager.updateTenant(editTarget.id, { name, icon });
        setEditTarget(null);
    };

    return (
        <>
            <TenantSelectionComponent<typeof util, unknown, Household>
                tenantStr="household"
                TenantIcon={({ tenant }) => <TagIconComponent name={tenant.icon ?? 'house'} className="h-10 w-10" />}
                onSelect={loadHousehold}
                onEdit={setEditTarget}
                autoSelectDefault={autoSelectDefault}
            />
            {editTarget && (
                <EditHouseholdDialog
                    household={editTarget}
                    onSave={handleEdit}
                    onClose={() => setEditTarget(null)}
                />
            )}
        </>
    );
};

export default HouseholdPage;