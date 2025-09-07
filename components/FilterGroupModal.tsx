import React, { useState, useEffect, useMemo } from "react";
import { FilterGroup, FilterReference, FilterType } from "../types";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from "./ui/Dialog";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Label from "./ui/Label";
import Select from "./ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/Table";
import { PlusIcon, TrashIcon, PencilIcon } from "../constants";
import Badge from "./ui/Badge";
import ImageInput from "./ui/ImageInput";

interface FilterGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (group: FilterGroup | Omit<FilterGroup, "id">) => void;
  group: FilterGroup | null;
  filterTypes: FilterType[]; // Add filterTypes prop
}

const SectionDivider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="relative pt-6 pb-4">
    <div className="absolute inset-0 flex items-center" aria-hidden="true">
      <div className="w-full border-t border-border" />
    </div>
    <div className="relative flex justify-center">
      <span className="bg-background px-3 text-sm font-medium text-muted-foreground">
        {children}
      </span>
    </div>
  </div>
);

const getStockBadgeVariant = (
  stock: number
): "default" | "destructive" | "warning" => {
  if (stock === 0) return "destructive";
  if (stock < 10) return "warning";
  return "default";
};

const FilterGroupModal: React.FC<FilterGroupModalProps> = ({
  isOpen,
  onClose,
  onSave,
  group,
  filterTypes,
}) => {
  const [name, setName] = useState("");
  const [filterType, setFilterType] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [filterTypeError, setFilterTypeError] = useState<string | null>(null);
  const [references, setReferences] = useState<FilterReference[]>([]);
  const [originalReferenceId, setOriginalReferenceId] = useState<string | null>(
    null
  );

  const [refInput, setRefInput] = useState({
    id: "",
    reference: "",
    manufacturer: "",
    price: "",
    stock: "",
    image: undefined as string | null | undefined,
  });
  const [refErrors, setRefErrors] = useState<{
    reference?: string;
    manufacturer?: string;
    price?: string;
    stock?: string;
  }>({});
  const [isEditingRef, setIsEditingRef] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (group) {
        setName(group.name);
        setFilterType(group.filterType || "");
        setReferences(group.references || []);
        setOriginalReferenceId(group.originalReferenceId || null);
      } else {
        setName("");
        setFilterType("");
        setReferences([]);
        setOriginalReferenceId(null);
      }
      setRefInput({
        id: "",
        reference: "",
        manufacturer: "",
        price: "",
        stock: "",
        image: undefined,
      });
      setIsEditingRef(false);
      setRefErrors({});
      setNameError(null);
      setFilterTypeError(null);
    }
  }, [group, isOpen]);

  const handleSave = () => {
    let hasErrors = false;

    if (!name.trim()) {
      setNameError("Le nom du groupe est requis.");
      hasErrors = true;
    } else {
      setNameError(null);
    }

    if (!filterType.trim()) {
      setFilterTypeError("Le type de filtre est requis.");
      hasErrors = true;
    } else {
      setFilterTypeError(null);
    }

    if (hasErrors) {
      return;
    }

    if (references.length === 0 || !originalReferenceId) {
      return;
    }

    const finalGroup: FilterGroup | Omit<FilterGroup, "id"> = {
      id: group?.id || "",
      name,
      filterType,
      references: references,
      originalReferenceId: originalReferenceId,
    };

    if (!group?.id) {
      const { id, ...newGroupData } = finalGroup;
      onSave(newGroupData);
    } else {
      onSave(finalGroup as FilterGroup);
    }
    onClose();
  };

  const validateReference = () => {
    const errors: {
      reference?: string;
      manufacturer?: string;
      price?: string;
      stock?: string;
    } = {};
    if (!refInput.reference.trim())
      errors.reference = "La référence est requise.";
    if (!refInput.manufacturer.trim())
      errors.manufacturer = "Le fabricant est requis.";
    const price = parseFloat(refInput.price);
    if (!refInput.price || isNaN(price) || price <= 0)
      errors.price = "Le prix doit être un nombre positif.";
    const stock = parseInt(refInput.stock, 10);
    if (refInput.stock === "" || isNaN(stock) || stock < 0)
      errors.stock = "Le stock doit être un nombre positif ou nul.";
    setRefErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddOrUpdateReference = () => {
    if (!validateReference()) return;

    const newRefData = {
      reference: refInput.reference,
      manufacturer: refInput.manufacturer,
      price: parseFloat(refInput.price),
      stock: parseInt(refInput.stock, 10),
      image: refInput.image || undefined,
    };

    if (isEditingRef) {
      setReferences((refs) =>
        refs.map((r) =>
          r.id === refInput.id ? { id: refInput.id, ...newRefData } : r
        )
      );
    } else {
      const newRef = { id: `temp-${Date.now()}`, ...newRefData };
      setReferences((refs) => [...refs, newRef]);
      if (!originalReferenceId) {
        setOriginalReferenceId(newRef.id);
      }
    }

    setRefInput({
      id: "",
      reference: "",
      manufacturer: "",
      price: "",
      stock: "",
      image: undefined,
    });
    setIsEditingRef(false);
    setRefErrors({});
  };

  const handleEditReference = (ref: FilterReference) => {
    setIsEditingRef(true);
    setRefInput({
      ...ref,
      price: String(ref.price),
      stock: String(ref.stock),
      image: ref.image,
    });
    setRefErrors({});
    window.document
      .getElementById("add-reference-form")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDeleteReference = (refId: string) => {
    if (originalReferenceId === refId) {
      setOriginalReferenceId(null);
    }
    setReferences((refs) => refs.filter((r) => r.id !== refId));
  };

  const handleInputChange = (field: keyof typeof refInput, value: string) => {
    setRefInput((prev) => ({ ...prev, [field]: value }));
    if (refErrors[field as keyof typeof refErrors]) {
      setRefErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (nameError) setNameError(null);
  };

  const handleFilterTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterType(e.target.value);
    if (filterTypeError) setFilterTypeError(null);
  };

  const originalReference = useMemo(() => {
    return originalReferenceId
      ? references.find((r) => r.id === originalReferenceId)
      : null;
  }, [references, originalReferenceId]);

  const compatibleReferences = useMemo(() => {
    return originalReferenceId
      ? references.filter((r) => r.id !== originalReferenceId)
      : [];
  }, [references, originalReferenceId]);

  const ReferenceTable: React.FC<{ refs: FilterReference[] }> = ({ refs }) => (
    <div className="relative w-full border rounded-md max-h-60 overflow-y-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm">
          <TableRow>
            <TableHead>Image</TableHead>
            <TableHead>Référence</TableHead>
            <TableHead>Fabricant</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {refs.map((ref) => (
            <TableRow key={ref.id}>
              <TableCell>
                {ref.image ? (
                  <img
                    src={ref.image}
                    alt={ref.reference}
                    className="h-10 w-10 object-contain rounded-sm bg-white p-1"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">N/A</span>
                )}
              </TableCell>
              <TableCell className="font-medium">{ref.reference}</TableCell>
              <TableCell>{ref.manufacturer}</TableCell>
              <TableCell>
                <Badge variant={getStockBadgeVariant(ref.stock)}>
                  {ref.stock}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEditReference(ref)}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDeleteReference(ref.id)}
                >
                  <TrashIcon className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>
          {group
            ? "Modifier le groupe de filtres"
            : "Nouveau groupe de filtres"}
        </DialogTitle>
        <DialogDescription>
          Remplissez les informations du groupe et gérez ses références.
        </DialogDescription>
      </DialogHeader>
      <DialogContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom du groupe</Label>
          <Input
            id="name"
            value={name}
            onChange={handleNameChange}
            placeholder="ex: Filtre à huile standard"
            className={
              nameError ? "border-destructive focus:ring-destructive" : ""
            }
          />
          {nameError && (
            <p className="text-xs text-destructive mt-1">{nameError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="filterType">Type de filtre</Label>
          <Select
            id="filterType"
            value={filterType}
            onChange={handleFilterTypeChange}
            className={
              filterTypeError ? "border-destructive focus:ring-destructive" : ""
            }
          >
            <option value="">Sélectionnez un type de filtre</option>
            {filterTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
          {filterTypeError && (
            <p className="text-xs text-destructive mt-1">{filterTypeError}</p>
          )}
        </div>

        <SectionDivider>Référence Originale</SectionDivider>
        {originalReference ? (
          <ReferenceTable refs={[originalReference]} />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Aucune référence originale. Ajoutez une référence ci-dessous pour
            commencer.
          </p>
        )}

        <SectionDivider>Références Compatibles</SectionDivider>
        {compatibleReferences.length > 0 ? (
          <ReferenceTable refs={compatibleReferences} />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Aucune référence compatible ajoutée.
          </p>
        )}

        <div
          id="add-reference-form"
          className="space-y-4 p-4 border rounded-lg bg-muted/30 pt-6"
        >
          <h3 className="font-semibold text-sm">
            {isEditingRef
              ? "Modifier la Référence"
              : "Ajouter une Nouvelle Référence"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="image" className="text-xs">
                Image
              </Label>
              <ImageInput
                value={refInput.image}
                onChange={(base64) =>
                  setRefInput({ ...refInput, image: base64 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference" className="text-xs">
                Référence
              </Label>
              <Input
                id="reference"
                value={refInput.reference}
                onChange={(e) => handleInputChange("reference", e.target.value)}
                placeholder="P551670"
                className={
                  refErrors.reference
                    ? "border-destructive focus:ring-destructive"
                    : ""
                }
              />
              {refErrors.reference && (
                <p className="text-xs text-destructive mt-1">
                  {refErrors.reference}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufacturer" className="text-xs">
                Fabricant
              </Label>
              <Input
                id="manufacturer"
                value={refInput.manufacturer}
                onChange={(e) =>
                  handleInputChange("manufacturer", e.target.value)
                }
                placeholder="Donaldson"
                className={
                  refErrors.manufacturer
                    ? "border-destructive focus:ring-destructive"
                    : ""
                }
              />
              {refErrors.manufacturer && (
                <p className="text-xs text-destructive mt-1">
                  {refErrors.manufacturer}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="price" className="text-xs">
                Prix (DA)
              </Label>
              <Input
                id="price"
                type="number"
                value={refInput.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                placeholder="1500"
                className={
                  refErrors.price
                    ? "border-destructive focus:ring-destructive"
                    : ""
                }
              />
              {refErrors.price && (
                <p className="text-xs text-destructive mt-1">
                  {refErrors.price}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock" className="text-xs">
                Stock
              </Label>
              <Input
                id="stock"
                type="number"
                value={refInput.stock}
                onChange={(e) => handleInputChange("stock", e.target.value)}
                placeholder="50"
                className={
                  refErrors.stock
                    ? "border-destructive focus:ring-destructive"
                    : ""
                }
              />
              {refErrors.stock && (
                <p className="text-xs text-destructive mt-1">
                  {refErrors.stock}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleAddOrUpdateReference}>
              {isEditingRef ? (
                <PencilIcon className="mr-2 h-4 w-4" />
              ) : (
                <PlusIcon className="mr-2 h-5 w-5" />
              )}
              {isEditingRef
                ? "Mettre à jour"
                : !originalReference
                ? "Ajouter comme Originale"
                : "Ajouter Compatible"}
            </Button>
            {isEditingRef && (
              <Button
                variant="ghost"
                onClick={() => {
                  setIsEditingRef(false);
                  setRefInput({
                    id: "",
                    reference: "",
                    manufacturer: "",
                    price: "",
                    stock: "",
                    image: undefined,
                  });
                  setRefErrors({});
                }}
              >
                Annuler
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={handleSave}>Enregistrer</Button>
      </DialogFooter>
    </Dialog>
  );
};

export default FilterGroupModal;
