import type { AuthAccount } from "@/modules/app/entities/AuthAccount";
import { EmailImportSettingSchema, type EmailImportSetting } from "@/modules/app/entities/EmailImportSetting";
import { EntityName } from "@/modules/app/entities/entities";
import type { MoneyAccount } from "@/modules/app/entities/MoneyAccount";
import { AuthService } from "@/modules/app/services/AuthService";
import { AuthMatrix } from "@/modules/auth/AuthMatrix";
import { Avatar, AvatarFallback, AvatarImage } from "@/modules/base-ui/components/ui/avatar";
import { Button } from "@/modules/base-ui/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/modules/base-ui/components/ui/dropdown-menu";
import { Input } from "@/modules/base-ui/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/modules/base-ui/components/ui/input-group";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/modules/base-ui/components/ui/item";
import { Spinner } from "@/modules/base-ui/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/modules/base-ui/components/ui/tooltip";
import { Utils } from "@/modules/common/Utils";
import { useDataSync } from "@/modules/data-sync/providers/DataSyncProvider";
import { EmailImportProcessContext } from "@/modules/import/context/EmailImportProcessContext";
import { PromptError, type AccountSelectionError, type AdapterSelectionError, type FilePasswordError } from "@/modules/import/errors/PromptError";
import { ImportMatrix } from "@/modules/import/ImportMatrix";
import type { IBank } from "@/modules/import/interfaces/IBank";
import type { IBankOffering } from "@/modules/import/interfaces/IBankOffering";
import type { IImportAdapter } from "@/modules/import/interfaces/IImportAdapter";
import type { ImportError } from "@/modules/import/interfaces/ImportData";
import { Calendar, ChevronDownIcon, EllipsisVertical, Mail, Plus, RefreshCw, TimerIcon, TriangleAlert } from "lucide-react";
import moment from "moment";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { combineLatest, Observable } from "rxjs";
import AccountNumber from "../common/AccountNumber";
import { unsubscribeAll } from "../common/ComponentUtils";
import ResponsiveDialog from "../common/ResponsiveDialog";
import { ImportIconComponent } from "../icons/import/ImportIcon";
import { useApp } from "../providers/AppProvider";

const IntervalPeriods = ['hours', 'days', 'weeks', 'months'] as const;
type IntervalPeriod = typeof IntervalPeriods[number];
type CombinedAccount = AuthAccount & { settings?: EmailImportSetting, context?: EmailImportProcessContext };

const ImportPage: React.FC = () => {

    const { orchestrator } = useDataSync();
    const { householdId } = useParams();
    const { importService, isMobile } = useApp();
    const service = useRef(new AuthService()).current;
    const [accounts, setAccounts] = useState<CombinedAccount[] | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<CombinedAccount | null>(null);
    const [currentError, setCurrentError] = useState<PromptError | null>(null);
    const [interval, setInterval] = useState<number>(1);
    const [period, setPeriod] = useState<IntervalPeriod>('months');
    const [savingSettings, setSavingSettings] = useState<boolean>(false);

    useEffect(() => {
        if (!orchestrator || !importService) return;
        const accountRepo = orchestrator.repo(EntityName.AuthAccount);
        const settingsRepo = orchestrator.repo(EntityName.EmailImportSetting);
        const subscription = combineLatest([
            accountRepo.observeAll() as Observable<AuthAccount[]>,
            settingsRepo.observeAll() as Observable<EmailImportSetting[]>,
            importService.observe(),
        ]).subscribe(([accounts, settings, contexts]) => {
            if (!accounts || !settings || !contexts) return;
            const userMap = Utils.toRecord(accounts, a => a.user.id);
            const settingsMap = Utils.toRecord(settings, s => s.authAccountId);
            const contextMap = Utils.toRecord(Object.values(contexts)
                .filter(c => c.type === 'email')
                .map(c => c as EmailImportProcessContext),
                c => userMap[c.user.id]?.id);

            const combined: CombinedAccount[] = accounts.map(account => ({
                ...account,
                settings: settingsMap[account.id || ''],
                context: contextMap[account.id || '']
            }));
            setAccounts(combined);
        })

        return unsubscribeAll(subscription);

    }, [orchestrator, importService]);

    const deleteAccount = async (account: CombinedAccount) => {
        if (!orchestrator || !account.id) return;
        const accountRepo = orchestrator.repo(EntityName.AuthAccount);
        accountRepo.delete(account.id);
    }

    const resetAccount = async (account: CombinedAccount) => {
        if (!orchestrator || !account.id) return;
        const settingsRepo = orchestrator.repo(EntityName.EmailImportSetting);
        const settings = account.settings;
        if (settings) {
            settings.importState = {};
            settingsRepo.save(EmailImportSettingSchema.parse(settings));
        }
    }

    const openSettings = (account: CombinedAccount) => {
        const settings = account.settings;
        if (settings) {
            const intervalInMinutes = settings.importInterval;
            if (intervalInMinutes % 43200 === 0) { // months
                setPeriod('months');
                setInterval(intervalInMinutes / 43200);
            } else if (intervalInMinutes % 10080 === 0) { // weeks
                setPeriod('weeks');
                setInterval(intervalInMinutes / 10080);
            } else if (intervalInMinutes % 1440 === 0) { // days
                setPeriod('days');
                setInterval(intervalInMinutes / 1440);
            } else { // hours
                setPeriod('hours');
                setInterval(intervalInMinutes / 60);
            }
        } else {
            setPeriod('months');
            setInterval(1);
        }
        setSelectedAccount(account);
    }

    const saveSettings = async () => {
        if (!selectedAccount || !orchestrator || !selectedAccount.id) return;
        setSavingSettings(true);
        try {
            const settingsRepo = orchestrator.repo(EntityName.EmailImportSetting);
            const settings = selectedAccount.settings ?? {
                authAccountId: selectedAccount.id,
                importInterval: 43200,
            };
            settings.importInterval =
                period === 'hours' ? interval * 60 :
                    period === 'days' ? interval * 1440 :
                        period === 'weeks' ? interval * 10080 :
                            interval * 43200; // months
            settingsRepo.save(EmailImportSettingSchema.parse(settings));
            setSelectedAccount(null);
        } finally {
            setSavingSettings(false);
        }
    }

    const importNow = async (account: CombinedAccount) => {
        if (!accounts || !account.id || !importService) return;
        if (account.context) {
            account.context.startOrResume();
            return;
        } else {
            account.context = importService.newEmailContext(account.token, account.user, account.settings?.importState);
            setAccounts(accounts.map(a => a.id === account.id ? { ...account } : a));
        }
        account.context.startOrResume();
    }

    const PasswordPrompt = ({ error, close }: { error: FilePasswordError, close: () => void }) => {

        const [passwordInputText, setPasswordInputText] = useState("");
        const [errorMessage, setErrorMessage] = useState<string | null>(null);

        const submit = async () => {
            setErrorMessage(null);
            const success = await error.tryAndStorePassword(passwordInputText)
            if (!success) {
                setErrorMessage("Incorrect password. Please try again.");
            } else {
                close();
            }
        }

        return <div>
            <div className="text-lg">Password Required</div>
            <div className="text-sm text-muted-foreground">The file appears to be password protected. Enter password to retry.</div>
            <div className="flex flex-col gap-2 mt-2">
                <Input type="password" placeholder="Enter file password..." value={passwordInputText} onChange={e => setPasswordInputText(e.target.value)} />
                <Button disabled={!passwordInputText} onClick={submit}>Import</Button>
                {errorMessage && <div className="text-sm text-destructive">{errorMessage}</div>}
            </div>
        </div>;
    }

    const AdapterPrompt = ({ error, close }: { error: AdapterSelectionError, close: () => void }) => {

        const supportedBanks = error.adapterIds.map(id => ({
            bank: ImportMatrix.AdapterBankData[id]?.[0] ?? undefined,
            offering: ImportMatrix.AdapterBankData[id]?.[1] ?? undefined,
            adapter: ImportMatrix.Adapters[id],
        }));

        const selectAdapter = (adapter: IImportAdapter) => {
            error.selectAdapter(adapter);
            close();
        };

        return <div>
            <div className="text-lg">Select account</div>
            <div className="text-sm text-muted-foreground">Multiple accounts detected. Choose one to continue.</div>
            <div className="flex flex-col gap-2 mt-2">
                {supportedBanks.map(({ bank, offering, adapter }) =>
                    <Item key={adapter.id} variant="outline" className="hover:bg-muted cursor-pointer" onClick={() => selectAdapter(adapter)}>
                        <ItemMedia variant="image">
                            <ImportIconComponent name={bank?.display?.icon} />
                        </ItemMedia>
                        <ItemContent>
                            <ItemTitle>{bank?.display?.name}</ItemTitle>
                            <ItemDescription>{offering?.display?.name}</ItemDescription>
                        </ItemContent>
                    </Item>)}
            </div>
        </div>
    }

    const AccountPrompt = ({ error, close }: { error: AccountSelectionError, close: () => void }) => {

        type AccountGroup = {
            bank: IBank | undefined;
            offering: IBankOffering | undefined;
            account: MoneyAccount;
        }

        const { orchestrator } = useDataSync();
        const [loading, setLoading] = useState<boolean>(true);
        const [accounts, setAccounts] = useState<AccountGroup[]>([]);

        const loadAccounts = useCallback(async () => {
            if (!orchestrator) return;
            setLoading(true);

            try {
                const repo = orchestrator.repo(EntityName.MoneyAccount);
                const accounts = await repo.getAll() as MoneyAccount[];
                const accountMap = accounts.reduce<Record<string, MoneyAccount>>((map, account) => {
                    map[account.id!] = account;
                    return map;
                }, {} as Record<string, MoneyAccount>);

                const foundAccounts = error.accountIds.map(accountId => {
                    const account = accountMap[accountId];
                    const bank = ImportMatrix.Banks[account.bankId] ?? undefined;
                    const offering = bank?.offerings?.find(o => o.id === account.offeringId);
                    return { bank, offering, account };
                });

                setAccounts(foundAccounts);
            } finally {
                setLoading(false);
            }

        }, [orchestrator, error.accountIds]);

        useEffect(() => {
            loadAccounts();
        }, [loadAccounts]);

        const selectAccount = (account: MoneyAccount) => {
            if (!account.id) return;
            error.selectAccount(account.id);
            close();
        }

        return <div>
            <div className="text-lg">Multiple matching accounts found</div>
            <div className="text-sm text-muted-foreground">Multiple accounts detected. Choose one to continue.</div>
            <div className="flex flex-col items-center gap-2 mt-2">
                {loading && <Spinner />}
                {accounts.map(({ bank, offering, account }) => (
                    <Item key={`${account.id}`} variant="outline" className="hover:bg-muted cursor-pointer" onClick={() => selectAccount(account)}>
                        <ItemMedia variant="image">
                            <ImportIconComponent name={bank?.display?.icon ?? ''} />
                        </ItemMedia>
                        <ItemContent>
                            <div className="flex flex-row justify-between w-full">
                                <div>
                                    <ItemTitle>
                                        {bank?.display?.name && <span className="uppercase">{bank?.display?.name}</span>}
                                    </ItemTitle>
                                    <ItemDescription className="flex justify-between">
                                        {offering?.display?.name && <span className="text-sm text-muted-foreground">{offering?.display?.name}</span>}
                                    </ItemDescription>
                                </div>
                                <span className="text-xl"><AccountNumber accountNumber={account.accountNumber} /></span>
                            </div>
                        </ItemContent>
                    </Item>
                ))}
            </div>
        </div>
    }

    const ImportStatus = ({ account }: { account: CombinedAccount }) => {
        let status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelling' | 'cancelled' | undefined;
        let error: ImportError | Error | undefined | null;

        if (!account.settings) {
            return <Button variant="outline" size="sm" onClick={() => openSettings(account)}>Configure</Button>;
        }

        if (account.context) {
            switch (account.context.status) {
                case 'pending': status = 'pending'; break;
                case 'in_progress': status = 'in-progress'; break;
                case 'error': case 'prompt_error': status = 'failed'; error = account.context.error; break;
                case 'completed': status = 'completed'; break;
                case 'cancelling': status = 'cancelling'; break;
                case 'cancelled': status = 'cancelled'; break;
                default: status = 'pending';
            }
        } else if (account.settings) {
            if (account.settings.importState.lastError) {
                status = 'failed';
                error = account.settings.importState.lastError;
            } else if (account.settings.importState.lastImportAt) {
                const timeSinceLastImport = moment().diff(moment(account.settings.importState.lastImportAt), 'minutes');
                const importInterval = account.settings.importInterval;
                status = timeSinceLastImport >= importInterval ? 'pending' : 'completed';
            }
        }

        if (!status) status = 'pending';

        const resolveError = () => {
            if (!error) return;
            if ('promptErrorData' in error) {
                account.context = account.context || importService?.newEmailContext(account.token, account.user, account.settings?.importState);
                error = PromptError.restore(account.context!, error);
            }
            if (error instanceof PromptError) {
                setCurrentError(error);
            } else {
                importNow(account);
            }
        }


        switch (status) {
            case 'pending': return <Button variant="outline" size="sm" onClick={() => importNow(account)}>Start now </Button>;
            case 'in-progress': return <div className="text-accent flex flex-row gap-1"><RefreshCw className="animate-spin" />Importing</div>;
            case 'completed': return <div className="">Completed</div>;
            case 'cancelling': return <div className="text-muted-foreground flex flex-row gap-1"><RefreshCw className="animate-spin" />Cancelling</div>;
            case 'cancelled': return <div className="text-muted-foreground">Cancelled</div>;
            case 'failed': return (
                <div className="flex flex-row gap-2 items-center">
                    {error && <Tooltip>
                        <TooltipTrigger>
                            <TriangleAlert className="text-destructive" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <span>{error?.message}</span>
                        </TooltipContent>
                    </Tooltip>}
                    <Button variant="destructive" size="sm" onClick={() => resolveError()}>Resolve</Button>
                </div>
            );
            default: return <div className="">Unknown</div>;
        }
    }

    const ImportProgress = ({ account }: { account: CombinedAccount }) => {
        let state = account.settings?.importState;
        if (account.context) {
            state = account.context.state;
        }
        if (!state) return null;

        let latestEmailDate: Date | undefined;
        if (account.context?.status !== 'in_progress') {
            latestEmailDate = state.currentPoint?.date;
        }
        if (!latestEmailDate) {
            latestEmailDate = state.endPoint?.date;
        }

        return <div className="flex flex-col gap-2">
            {state.readEmailCount && <div className="flex flex-row gap-2 items-center"><Mail /> {state.importedEmailCount} of {state.readEmailCount} read emails imported.</div>}
            {latestEmailDate && <div className="flex flex-row gap-2 items-center"><Calendar /> Latest email: {moment(latestEmailDate).fromNow()}</div>}
        </div>
    }

    const ImportMenu = ({ account }: { account: CombinedAccount }) => {
        return <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="size-8">
                    <EllipsisVertical className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={!account.settings} onClick={() => importNow(account)}>Import Now</DropdownMenuItem>
                <DropdownMenuItem disabled={account.context?.status !== 'in_progress'} onClick={() => account.context?.cancel()}>Cancel Import</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openSettings(account)}>
                    {account.settings ? "Edit settings" : "Configure"}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={account.context !== undefined} onClick={() => resetAccount(account)}>Reset</DropdownMenuItem>
                <DropdownMenuItem disabled={account.context !== undefined} onClick={() => deleteAccount(account)}>Remove Account</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    }

    const AccountDetails = ({ account }: { account: CombinedAccount }) => {
        return <div key={account.id} className="flex flex-col gap-2 rounded-xl border p-4">
            <div className="flex flex-row gap-2 items-center">
                <Avatar className="size-11 cursor-pointer">
                    <AvatarImage src={account.user.picture} alt={account.user.name} />
                    <AvatarFallback>{account.user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <div>
                        <span className="text-lg">{account.user.name}</span>
                        {account.settings?.importState.lastImportAt &&
                            <span className="text-sm"> (synced {moment(account.settings?.importState.lastImportAt).fromNow()})</span>
                        }
                    </div>
                    <div className="text-muted-foreground text-sm">{account.user.email}</div>
                </div>
                <div className="flex-1" />
                <ImportStatus account={account} />
                <ImportMenu account={account} />
            </div>
            <div className="ml-12">
                <ImportProgress account={account} />
            </div>
        </div>;
    }

    const EmailHandler = ({ handlerId }: { handlerId: string }) => {
        const display = AuthMatrix.HandlerDisplay[handlerId];
        return <div key={handlerId} className="flex flex-col gap-4 w-full">
            <div key={`${handlerId}-title`} className="flex flex-row gap-2 items-center w-full">
                <display.icon className="size-6" />
                <div className="text-xl">{display.name}</div>
                <div className="flex-1" />
                <Button variant="outline" size="sm" className="flex flex-row items-center" onClick={() => service.login(handlerId, householdId)}>
                    <Plus />
                    Add New Account
                </Button>
            </div>
            {accounts?.filter(a => a.token.handlerId === handlerId).map(account => <AccountDetails key={account.id} account={account} />)}
        </div>
    }

    return <div className={`flex flex-col gap-4 items-start w-full ${isMobile ? 'p-4' : 'p-8'}`}>
        <div className="text-2xl font-semibold">Connected Accounts</div>
        {Object.keys(AuthMatrix.FeatureHandlers.mail).map(id => <EmailHandler key={id} handlerId={id} />)}

        <ResponsiveDialog title="Settings" open={selectedAccount !== null} onOpenChange={() => setSelectedAccount(null)}>
            <div className="flex flex-col items-start gap-2">
                <div>Import new emails at what interval ?</div>
                <div className="flex flex-row gap-2 w-full">
                    <InputGroup>
                        <InputGroupAddon><TimerIcon /></InputGroupAddon>
                        <InputGroupInput
                            type="number"
                            disabled={savingSettings}
                            value={interval}
                            onChange={e => setInterval(Number(e.target.value))}
                        />
                        <InputGroupAddon align="inline-end">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <InputGroupButton disabled={savingSettings} variant="ghost" className="!pr-1.5 text-xs">
                                        {period} <ChevronDownIcon className="size-3" />
                                    </InputGroupButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {IntervalPeriods.map(p => (
                                        <DropdownMenuItem key={p} onClick={() => setPeriod(p)}>
                                            {p.charAt(0).toUpperCase() + p.slice(1)}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </InputGroupAddon>
                    </InputGroup>
                    <Button variant="outline" disabled={savingSettings} onClick={() => saveSettings()}>Save</Button>
                </div>
            </div>
        </ResponsiveDialog>

        {currentError && <ResponsiveDialog title={currentError.name} open={true} onOpenChange={() => setCurrentError(null)}>
            {currentError.errorType === 'file_password' && <PasswordPrompt error={currentError as FilePasswordError} close={() => setCurrentError(null)} />}
            {currentError.errorType === 'adapter_selection' && <AdapterPrompt error={currentError as AdapterSelectionError} close={() => setCurrentError(null)} />}
            {currentError.errorType === 'account_selection' && <AccountPrompt error={currentError as AccountSelectionError} close={() => setCurrentError(null)} />}
        </ResponsiveDialog>}
    </div>
}

export default ImportPage;