import React, { useState } from "react";
import { Machine, OilStock, OilTransaction } from "../types";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { DropletIcon, PlusIcon, TruckIcon, ClockIcon, ExclamationTriangleIcon, CheckCircleIcon, ArrowDownTrayIcon, Squares2x2Icon } from "../constants";

interface OilManagementViewProps {
  machines: Machine[];
  oilStocks: OilStock[];
  onUpdateStock: (stocks: OilStock[]) => void;
  addToast: (toast: any) => void;
}

const MOCK_TRANSACTIONS: OilTransaction[] = [
  { id: "tx-1", machineId: "m-1", oilStockId: "oil-1", quantity: 5, date: "2024-05-20", performedBy: "Mohamed", serviceHours: 1200 },
  { id: "tx-2", machineId: "m-2", oilStockId: "oil-2", quantity: 10, date: "2024-05-21", performedBy: "Mohamed", serviceHours: 4500 },
];

type Tab = 'stock' | 'add' | 'reception' | 'history';

const OilManagementView: React.FC<OilManagementViewProps> = ({ machines, oilStocks, onUpdateStock, addToast }) => {
  const [activeTab, setActiveTab] = useState<Tab>('stock');
  const [transactions, setTransactions] = useState<OilTransaction[]>(MOCK_TRANSACTIONS);

  // Form State
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [selectedOilId, setSelectedOilId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [serviceHours, setServiceHours] = useState<string>("");

  // Stock Reception State
  const [receptionOilId, setReceptionOilId] = useState<string>("");
  const [receptionQuantity, setReceptionQuantity] = useState<string>("1");

  // Add Oil Type State
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [newOilType, setNewOilType] = useState("");
  const [newOilThreshold, setNewOilThreshold] = useState("20");

  const handleAddTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachineId || !selectedOilId || !quantity || !serviceHours) return;

    const qty = parseFloat(quantity);
    const hours = parseInt(serviceHours);

    if (isNaN(qty) || qty <= 0) {
      addToast({ title: "Erreur", description: "Quantité invalide", type: "error" });
      return;
    }

    if (isNaN(hours) || hours <= 0) {
      addToast({ title: "Erreur", description: "Heures de service invalides", type: "error" });
      return;
    }

    const oilStock = oilStocks.find(s => s.id === selectedOilId);
    if (!oilStock) return;

    if (oilStock.currentLevel < qty) {
      addToast({
        title: "Stock Insuffisant",
        description: `Il ne reste que ${oilStock.currentLevel}L dans le fût actuel. Veuillez changer de fût.`,
        type: "error"
      });
      return;
    }

    // Update Stock
    const updatedStocks = oilStocks.map(stock => {
      if (stock.id === selectedOilId) {
        return { ...stock, currentLevel: stock.currentLevel - qty };
      }
      return stock;
    });
    onUpdateStock(updatedStocks);

    // Add Transaction
    const newTx: OilTransaction = {
      id: `tx-${Date.now()}`,
      machineId: selectedMachineId,
      oilStockId: selectedOilId,
      quantity: qty,
      date: new Date().toISOString().split('T')[0],
      performedBy: "Current User", // Mock
      serviceHours: hours
    };
    setTransactions([newTx, ...transactions]);

    // Reset Form
    setQuantity("");
    setServiceHours("");
    addToast({ title: "Rajout enregistré", description: `${qty}L ajoutés avec succès.`, type: "success" });

    // Check for low level after update
    if (oilStock.currentLevel - qty <= 0) {
      addToast({ title: "Fût Terminé", description: `Le fût de ${oilStock.type} est vide. Pensez à le remplacer.`, type: "warning" });
    }
  };

  const handleReceiveStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receptionOilId || !receptionQuantity) return;

    const qty = parseInt(receptionQuantity);
    if (isNaN(qty) || qty <= 0) {
      addToast({ title: "Erreur", description: "Quantité invalide", type: "error" });
      return;
    }

    const updatedStocks = oilStocks.map(stock => {
      if (stock.id === receptionOilId) {
        return { ...stock, totalBarrels: stock.totalBarrels + qty };
      }
      return stock;
    });
    onUpdateStock(updatedStocks);

    // Reset Form
    setReceptionQuantity("1");
    setReceptionOilId("");
    addToast({ title: "Stock Mis à jour", description: `${qty} Fût(s) ajouté(s) au stock.`, type: "success" });
  };

  const handleAddType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOilType || !newOilThreshold) return;

    const threshold = parseInt(newOilThreshold);
    if (isNaN(threshold) || threshold < 0) {
      addToast({ title: "Erreur", description: "Seuil d'alerte invalide", type: "error" });
      return;
    }

    const newStock: OilStock = {
      id: `oil-${Date.now()}`,
      type: newOilType,
      currentLevel: 200, // Starts full
      totalBarrels: 1, // Starts with 1 barrel
      alertThreshold: threshold
    };

    onUpdateStock([...oilStocks, newStock]);
    setNewOilType("");
    setNewOilThreshold("20");
    setIsAddTypeOpen(false);
    addToast({ title: "Nouveau Type Ajouté", description: `${newOilType} a été ajouté au stock.`, type: "success" });
  };

  const handleReplaceBarrel = (stockId: string) => {
    const stock = oilStocks.find(s => s.id === stockId);
    if (!stock) return;

    if (stock.totalBarrels <= 0) {
      addToast({ title: "Plus de stock", description: "Aucun fût de réserve disponible.", type: "error" });
      return;
    }

    if (confirm(`Confirmer le remplacement du fût de ${stock.type} ? Cela décrémentera le stock de réserve.`)) {
      const updatedStocks = oilStocks.map(s => {
        if (s.id === stockId) {
          return {
            ...s,
            currentLevel: 200,
            totalBarrels: s.totalBarrels - 1
          };
        }
        return s;
      });
      onUpdateStock(updatedStocks);
      addToast({ title: "Fût Remplacé", description: "Nouveau fût de 200L entamé.", type: "success" });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <DropletIcon className="h-8 w-8 text-primary" />
          </div>
          Gestion des Huiles
        </h1>

        {/* Tabs Navigation */}
        <div className="flex bg-muted/50 p-1 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'stock'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
          >
            <Squares2x2Icon className="h-4 w-4" />
            Stock
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'add'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
          >
            <PlusIcon className="h-4 w-4" />
            Nouveau Rajout
          </button>
          <button
            onClick={() => setActiveTab('reception')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'reception'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Réception
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'history'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
          >
            <ClockIcon className="h-4 w-4" />
            Historique
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'stock' && (
          <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
            <div className="flex items-center justify-between">
              <div className="px-4 py-2 bg-card rounded-lg border border-border shadow-sm text-sm">
                <span className="font-semibold text-primary">{oilStocks.reduce((acc: number, s: OilStock) => acc + s.totalBarrels, 0)}</span> Fûts en réserve
              </div>
              <button
                onClick={() => setIsAddTypeOpen(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2 text-sm font-medium"
              >
                <PlusIcon className="h-4 w-4" />
                Nouveau Type
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {oilStocks.map((stock: OilStock) => {
                const percentage = (stock.currentLevel / 200) * 100;
                const isLow = stock.currentLevel <= stock.alertThreshold;
                const isEmpty = stock.currentLevel <= 0;

                return (
                  <Card key={stock.id} className={`border ${isLow ? 'border-destructive/50' : 'border-border'} overflow-hidden relative group`}>
                    {isLow && (
                      <div className="absolute top-2 right-2 animate-pulse text-destructive">
                        <ExclamationTriangleIcon className="h-5 w-5" />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold flex items-center justify-between">
                        {stock.type}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{stock.totalBarrels} fûts pleins en stock</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-sm mb-1 font-medium">
                        <span className={`${isLow ? 'text-destructive' : 'text-primary'}`}>
                          {isEmpty ? "VIDE" : `${stock.currentLevel} L`}
                        </span>
                        <span className="text-muted-foreground">200 L</span>
                      </div>

                      <div className="h-32 w-full bg-muted/50 rounded-lg relative overflow-hidden border border-border/50">
                        <div
                          className={`absolute bottom-0 left-0 right-0 transition-all duration-700 ease-in-out ${isLow ? 'bg-destructive/80' : 'bg-primary/80'
                            }`}
                          style={{ height: `${percentage}%` }}
                        >
                          <div className="absolute top-0 left-0 right-0 h-1 bg-white/20"></div>
                        </div>
                        {[25, 50, 75].map(p => (
                          <div key={p} className="absolute w-full border-t border-white/10" style={{ bottom: `${p}%` }}></div>
                        ))}
                      </div>

                      {isEmpty ? (
                        <button
                          onClick={() => handleReplaceBarrel(stock.id)}
                          className="w-full mt-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
                        >
                          Remplacer Fût
                        </button>
                      ) : (
                        <div className="mt-4 text-xs text-center text-muted-foreground">
                          {percentage.toFixed(0)}% Restant
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'add' && (
          <div className="max-w-md mx-auto animate-in slide-in-from-left-2 duration-300">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusIcon className="h-5 w-5 text-primary" />
                  Nouveau Rajout
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTopUp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Engin</label>
                    <select
                      value={selectedMachineId}
                      onChange={(e) => setSelectedMachineId(e.target.value)}
                      className="w-full p-2 rounded-md bg-background border border-border focus:ring-2 focus:ring-primary/20"
                      required
                    >
                      <option value="">Sélectionner un engin</option>
                      {machines.map(m => (
                        <option key={m.id} value={m.id}>{m.designation} ({m.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Heures Service</label>
                    <input
                      type="number"
                      min="0"
                      value={serviceHours}
                      onChange={(e) => setServiceHours(e.target.value)}
                      className="w-full p-2 rounded-md bg-background border border-border focus:ring-2 focus:ring-primary/20"
                      placeholder="ex: 12500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Type d'Huile</label>
                    <select
                      value={selectedOilId}
                      onChange={(e) => setSelectedOilId(e.target.value)}
                      className="w-full p-2 rounded-md bg-background border border-border focus:ring-2 focus:ring-primary/20"
                      required
                    >
                      <option value="">Sélectionner une huile</option>
                      {oilStocks.map((s: OilStock) => (
                        <option key={s.id} value={s.id}>{s.type} ({s.currentLevel}L dispo)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Quantité (Litres)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full p-2 rounded-md bg-background border border-border focus:ring-2 focus:ring-primary/20"
                      placeholder="ex: 5.5"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-md font-medium transition-all shadow-md active:scale-95"
                  >
                    Enregistrer Rajout
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'reception' && (
          <div className="max-w-md mx-auto animate-in slide-in-from-left-2 duration-300">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownTrayIcon className="h-5 w-5 text-primary" />
                  Réception de Fûts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleReceiveStock} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type d'Huile</label>
                    <select
                      value={receptionOilId}
                      onChange={(e) => setReceptionOilId(e.target.value)}
                      className="w-full p-2 rounded-md bg-background border border-border focus:ring-2 focus:ring-primary/20"
                      required
                    >
                      <option value="">Sélectionner une huile</option>
                      {oilStocks.map((s: OilStock) => (
                        <option key={s.id} value={s.id}>{s.type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre de Fûts</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={receptionQuantity}
                      onChange={(e) => setReceptionQuantity(e.target.value)}
                      className="w-full p-2 rounded-md bg-background border border-border focus:ring-2 focus:ring-primary/20"
                      placeholder="ex: 1"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground py-2 rounded-md font-medium transition-all shadow-md active:scale-95"
                  >
                    Ajouter au Stock
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-in slide-in-from-left-2 duration-300">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-primary" />
                  Historique des Rajouts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-[600px]">
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Aucun historique disponible</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Date</th>
                          <th className="px-4 py-2 text-left font-medium">Engin</th>
                          <th className="px-4 py-2 text-left font-medium">H. Service</th>
                          <th className="px-4 py-2 text-left font-medium">Huile</th>
                          <th className="px-4 py-2 text-right font-medium">Qté</th>
                          <th className="px-4 py-2 text-right font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {transactions.map(tx => {
                          const machine = machines.find(m => m.id === tx.machineId);
                          const oil = oilStocks.find((s: OilStock) => s.id === tx.oilStockId);
                          return (
                            <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3">{tx.date}</td>
                              <td className="px-4 py-3 font-medium">{machine?.code || 'Inconnu'}</td>
                              <td className="px-4 py-3 text-muted-foreground">{tx.serviceHours || '-'} h</td>
                              <td className="px-4 py-3 text-muted-foreground">{oil?.type || 'Inconnu'}</td>
                              <td className="px-4 py-3 text-right font-bold">{tx.quantity} L</td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex items-center text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                                  <CheckCircleIcon className="w-3 h-3 mr-1" /> OK
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Add Type Modal */}
      {isAddTypeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md mx-4 shadow-xl border-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ajouter un Type d'Huile</CardTitle>
              <button
                type="button"
                onClick={() => setIsAddTypeOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors"
                aria-label="Fermer"
              >
                <CheckCircleIcon className="h-6 w-6 rotate-45" /> {/* Mimic X icon */}
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddType} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom / Type d'Huile</label>
                  <input
                    type="text"
                    value={newOilType}
                    onChange={(e) => setNewOilType(e.target.value)}
                    className="w-full p-2 rounded-md bg-background border border-border focus:ring-2 focus:ring-primary/20"
                    placeholder="ex: Hydraulique 32"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Seuil d'Alerte (Litres)</label>
                  <input
                    type="number"
                    min="1"
                    max="199"
                    value={newOilThreshold}
                    onChange={(e) => setNewOilThreshold(e.target.value)}
                    className="w-full p-2 rounded-md bg-background border border-border focus:ring-2 focus:ring-primary/20"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Niveau déclenchant l'alerte de stock bas.</p>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsAddTypeOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md shadow-sm transition-colors"
                  >
                    Créer Référence
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OilManagementView;
