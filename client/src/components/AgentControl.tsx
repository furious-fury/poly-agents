import { useState } from "react";
import { useAgents, useControlAgent, useCreateAgent, useDeleteAgent, useUpdateAgent } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Settings, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export default function AgentControl({ dbUserId, variant = "full", layout = "grid" }: { dbUserId: string | null, variant?: "full" | "compact", layout?: "grid" | "list" }) {
    const { publicKey } = useWallet();

    const { data: agents } = useAgents(dbUserId);
    const { mutate: controlAgent } = useControlAgent();
    const { mutate: createAgent, isPending: isCreating } = useCreateAgent();
    const { mutate: deleteAgent, isPending: isDeleting } = useDeleteAgent();
    const { mutate: updateAgent, isPending: isUpdating } = useUpdateAgent();

    // Form State
    const [name, setName] = useState("");
    const [riskProfile, setRiskProfile] = useState("MEDIUM");
    const [llmProvider, setLlmProvider] = useState("OPENAI");
    const [stopLoss, setStopLoss] = useState("20");
    const [takeProfit, setTakeProfit] = useState("100");

    const [isOpen, setIsOpen] = useState(false);

    // Edit State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<any>(null);

    const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);

    const handleToggle = (agentId: string, isRunning: boolean) => {
        if (!dbUserId) return alert("Please wait for login...");
        controlAgent({ agentId, action: isRunning ? "stop" : "start", userId: dbUserId });
    };

    const handleDelete = (agentId: string) => {
        setDeleteAgentId(agentId);
    };

    const confirmDelete = () => {
        if (deleteAgentId) {
            deleteAgent(deleteAgentId);
            setDeleteAgentId(null);
        }
    };

    const handleCreate = () => {
        if (!name || !riskProfile) return;
        if (!dbUserId) return alert("Please wait for login...");

        createAgent({
            name,
            description: "User Created",
            riskProfile,
            userId: dbUserId,
            stopLossPercent: !isNaN(parseFloat(stopLoss)) ? parseFloat(stopLoss) : 20,
            takeProfitPercent: !isNaN(parseFloat(takeProfit)) ? parseFloat(takeProfit) : 100,
            llmProvider
        }, {
            onSuccess: () => {
                setIsOpen(false);
                setName("");
                setRiskProfile("MEDIUM");
                setLlmProvider("OPENAI");
                setStopLoss("20");
                setTakeProfit("100");
                toast.success("Agent deployed successfully!");
            },
            onError: (err) => {
                toast.error(`Failed to deploy agent: ${err.message}`);
            }
        });
    }

    const openEdit = (agent: any) => {
        setEditingAgent(agent);
        setName(agent.name);
        setRiskProfile(agent.riskProfile);
        setStopLoss(agent.stopLossPercent?.toString() || "20");
        setTakeProfit(agent.takeProfitPercent?.toString() || "100");
        setIsEditOpen(true);
    };

    const handleUpdate = () => {
        if (!editingAgent || !dbUserId) return;
        updateAgent({
            agentId: editingAgent.id,
            data: {
                userId: dbUserId,
                name,
                riskProfile,
                stopLossPercent: !isNaN(parseFloat(stopLoss)) ? parseFloat(stopLoss) : undefined,
                takeProfitPercent: !isNaN(parseFloat(takeProfit)) ? parseFloat(takeProfit) : undefined
            }
        }, {
            onSuccess: () => {
                setIsEditOpen(false);
                setEditingAgent(null);
                toast.success("Agent settings updated successfully!");
            },
            onError: (err) => {
                toast.error(`Failed to update settings: ${err.message}`);
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Header Actions - Only show in full mode */}
            {variant === "full" && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Agent Command Center</h2>
                        <p className="text-sm text-gray-500">Manage and monitor your autonomous trading agents.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={() => setIsOpen(true)}
                            className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 border-none rounded-xl"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Deploy New Agent
                        </Button>
                    </div>
                </div>
            )}

            {/* Create Agent Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="bg-white border text-gray-900 shadow-2xl sm:rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Deploy New Agent</DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Configure a new AI agent with a name, provider, and risk profile.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Agent Name</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Risk Taker"
                                className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-blue-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">LLM Provider</label>
                                <select
                                    value={llmProvider}
                                    onChange={(e) => setLlmProvider(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="OPENAI">OpenAI - GPT</option>
                                    <option value="GEMINI">Google - Gemini</option>
                                    <option value="ANTHROPIC">Anthropic - Claude</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Risk Profile</label>
                                <select
                                    value={riskProfile}
                                    onChange={(e) => setRiskProfile(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="LOW">Conservative (Low Risk)</option>
                                    <option value="MEDIUM">Balanced (Medium Risk)</option>
                                    <option value="HIGH">Aggressive (High Risk)</option>
                                    <option value="DEGEN">Degen (Maximum Risk)</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Stop Loss (%)</label>
                                <Input
                                    type="number"
                                    value={stopLoss}
                                    onChange={(e) => setStopLoss(e.target.value)}
                                    placeholder="20"
                                    className="bg-white border-gray-200 text-gray-900"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Take Profit (%)</label>
                                <Input
                                    type="number"
                                    value={takeProfit}
                                    onChange={(e) => setTakeProfit(e.target.value)}
                                    placeholder="100"
                                    className="bg-white border-gray-200 text-gray-900"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={handleCreate}
                            disabled={isCreating}
                            className="w-full bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20 mt-6"
                        >
                            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Deploy Agent"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Agent Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="bg-white border text-gray-900 shadow-2xl sm:rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Agent Settings</DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Update risk parameters for {editingAgent?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Agent Name</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-white border-gray-200 text-gray-900"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Risk Profile</label>
                            <select
                                value={riskProfile}
                                onChange={(e) => setRiskProfile(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="LOW">Conservative (Low Risk)</option>
                                <option value="MEDIUM">Balanced (Medium Risk)</option>
                                <option value="HIGH">Aggressive (High Risk)</option>
                                <option value="DEGEN">Degen (Maximum Risk)</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Stop Loss (%)</label>
                                <Input
                                    type="number"
                                    value={stopLoss}
                                    onChange={(e) => setStopLoss(e.target.value)}
                                    className="bg-white border-gray-200 text-gray-900"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Take Profit (%)</label>
                                <Input
                                    type="number"
                                    value={takeProfit}
                                    onChange={(e) => setTakeProfit(e.target.value)}
                                    className="bg-white border-gray-200 text-gray-900"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={handleUpdate}
                            disabled={isUpdating}
                            className="w-full bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20 mt-6"
                        >
                            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Agent Confirmation Dialog */}
            <Dialog open={deleteAgentId !== null} onOpenChange={(open) => !open && setDeleteAgentId(null)}>
                <DialogContent className="bg-white border text-gray-900 shadow-2xl sm:rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Delete Agent</DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Are you sure you want to delete this agent? This action is irreversible.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 pt-4">
                        <Button
                            onClick={() => setDeleteAgentId(null)}
                            variant="outline"
                            className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Agent"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Agent Grid */}
            <div className={`grid gap-8 ${layout === 'list' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {(variant === "compact" ? agents?.slice(0, 3) : agents)?.map((agent: any) => (
                    layout === 'list' ? (
                        /* Compact List View */
                        <Card key={agent.id} className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden relative rounded-3xl">
                            {agent.isRunning && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-blue-400 via-blue-600 to-blue-400 animate-pulse" />
                            )}
                            <div className="p-4 flex items-center justify-between gap-4">
                                {/* Identity */}
                                <div className="flex items-center gap-4 min-w-[200px]">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${agent.isRunning ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-100 text-gray-400'}`}>
                                        <div className="text-sm font-bold">AI</div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">{agent.name}</h4>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className={`w-1.5 h-1.5 rounded-full ${agent.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                                            <span className="text-xs font-medium text-gray-500">{agent.isRunning ? 'Trading' : 'Stopped'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Stats (Hidden on very small screens) */}
                                <div className="hidden md:flex items-center gap-6 text-xs">
                                    <div className="flex flex-col">
                                        <span className="text-gray-400 font-medium uppercase text-[10px] tracking-wider">Strategy</span>
                                        <span className="font-bold text-gray-700 capitalize">{agent.riskProfile?.toLowerCase() || "balanced"}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-400 font-medium uppercase text-[10px] tracking-wider">P/L</span>
                                        <span className="font-bold text-gray-700">--</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => handleToggle(agent.id, agent.isRunning)}
                                        disabled={!publicKey}
                                        className={`h-9 px-4 font-bold rounded-lg shadow-none transition-all ${agent.isRunning
                                            ? "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                                            : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20"
                                            }`}
                                    >
                                        {agent.isRunning ? "Stop" : "Start"}
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => openEdit(agent)}
                                        className="h-9 w-9 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                    >
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleDelete(agent.id)}
                                        className="h-9 w-9 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        /* Grid Card View */
                        <Card key={agent.id} className="bg-white border border-gray-100 shadow-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative rounded-4xl">
                            {agent.isRunning && (
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-blue-400 via-blue-600 to-blue-400 animate-progress-indeterminate opacity-80" />
                            )}
                            <CardHeader className="pb-3 border-b border-gray-50 pt-6 px-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${agent.isRunning ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-100 text-gray-400'}`}>
                                                <div className="text-lg font-bold">AI</div>
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                    {agent.name}
                                                </CardTitle>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${agent.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                                                    <span className="text-xs font-medium text-gray-500">{agent.isRunning ? 'Active' : 'Stopped'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-3 line-clamp-2 min-h-[40px] pl-1">
                                            {agent.description || "An autonomous agent optimizing for market opportunities."}
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 px-6 pb-6">
                                <div className="space-y-4">
                                    {/* Stats Row */}
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100/50">
                                            <p className="text-blue-600/80 mb-1 font-bold uppercase tracking-wider text-[10px]">Strategy</p>
                                            <p className="font-bold text-gray-900 capitalize text-sm">{agent.riskProfile?.toLowerCase() || "balanced"}</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                            <p className="text-gray-500 mb-1 font-bold uppercase tracking-wider text-[10px]">Status</p>
                                            <p className="font-bold text-gray-900 truncate text-sm">{agent.isRunning ? "Trading" : "Idle"}</p>
                                        </div>
                                    </div>

                                    {/* Controls */}
                                    <div className="flex items-center gap-2 pt-2">
                                        <Button
                                            onClick={() => handleToggle(agent.id, agent.isRunning)}
                                            disabled={!publicKey}
                                            className={`flex-1 font-bold h-10 transition-all duration-300 rounded-xl shadow-none ${agent.isRunning
                                                ? "bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300"
                                                : "bg-blue-600 hover:bg-blue-700 text-white border-transparent hover:shadow-lg hover:shadow-blue-600/20"
                                                }`}
                                        >
                                            {agent.isRunning ? "Stop Agent" : "Start Agent"}
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => handleDelete(agent.id)}
                                            className="h-10 w-10 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 rounded-xl border-gray-200"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => openEdit(agent)}
                                            className="h-10 w-10 text-gray-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-xl border-gray-200"
                                        >
                                            <Settings className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                ))}

                {/* Empty State / Add New Placeholder */}
                {(!agents || agents.length === 0) && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setIsOpen(true)}>
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                            <Plus className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="mb-4 font-medium">No agents deployed yet.</p>
                        <Button variant="outline" className="bg-white border-gray-300 text-gray-700">Create Your First Agent</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
