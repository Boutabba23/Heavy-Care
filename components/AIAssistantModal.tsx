"use client";

import React, { useState, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AIMessage,
  FilterGroup,
  AISuggestion,
  GroundingSource,
} from "../types";
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
import { SparklesIcon, PaperClipIcon, GlobeAltIcon } from "../constants";
import { Card, CardContent } from "./ui/Card";

// --- Helper Functions ---
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const imageFileToPreview = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
};

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterGroups: FilterGroup[];
  onNavigateToGroup: (groupId: string) => void;
}

const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  filterGroups,
  onNavigateToGroup,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "initial",
          role: "model",
          text: "Comment puis-je vous aider à trouver un filtre aujourd'hui ? Décrivez-le ou montrez-moi une photo.",
        },
      ]);
    }
    if (!isOpen) {
      // Reset state on close
      setTimeout(() => {
        setMessages([]);
        setInput("");
        setImageFile(null);
        setImagePreview(null);
      }, 300); // delay to allow for closing animation
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const preview = await imageFileToPreview(file);
      setImagePreview(preview);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !imageFile) return;

    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: input.trim(),
      image: imagePreview || undefined,
    };

    const loadingMessage: AIMessage = {
      id: `loading-${Date.now()}`,
      role: "model",
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInput("");
    handleRemoveImage();

    try {
      const allFilters = filterGroups.flatMap((group) =>
        group.references.map((ref) => ({
          ...ref,
          groupId: group.id,
          groupName: group.name,
        }))
      );
      const ai = new GoogleGenerativeAI(
        process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY ||
          process.env.GOOGLE_AI_API_KEY ||
          ""
      );

      const promptParts: any[] = [
        {
          text: `Voici l'inventaire actuel des filtres au format JSON :\n\n${JSON.stringify(
            allFilters
          )}`,
        },
      ];

      if (imageFile) {
        const imagePart = await fileToGenerativePart(imageFile);
        promptParts.push(imagePart);
      }

      const userTextPrompt = userMessage.text
        ? userMessage.text
        : "Analyser l'image et trouver les correspondances.";
      promptParts.push({ text: `Ma demande est : '${userTextPrompt}'` });

      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const response = await model.generateContent(promptParts);

      const groundingChunks = undefined; // Grounding metadata is not available in the standard API
      const sources: GroundingSource[] = [];

      let responseText = response.response.text();
      let suggestions: AISuggestion[] = [];

      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          suggestions = JSON.parse(jsonMatch[1]);
          responseText = responseText.replace(jsonMatch[0], "").trim();
        } catch (e) {
          console.error("Failed to parse JSON from AI response:", e);
          // Keep responseText as is, since parsing failed.
        }
      }

      const newModelMessage: AIMessage = {
        id: `model-${Date.now()}`,
        role: "model",
        text: responseText,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        sources: sources.length > 0 ? sources : undefined,
      };

      setMessages((prev) => [...prev.slice(0, -1), newModelMessage]);
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      const errorMessage: AIMessage = {
        id: `error-${Date.now()}`,
        role: "model",
        text: "Désolé, une erreur s'est produite lors de la communication avec l'assistant. Veuillez réessayer.",
        isError: true,
      };
      setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
    }
  };

  const renderSuggestions = (suggestions: AISuggestion[]) => (
    <div className="space-y-3 mt-2">
      {suggestions.map((s, index) => (
        <Card
          key={s.referenceId}
          className="bg-background/50 animate-slideInUp"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardContent className="p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-primary">
                  {s.reference}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    - {s.manufacturer}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Groupe: {s.groupName}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigateToGroup(s.groupId)}
              >
                Aller au Groupe
              </Button>
            </div>
            <p className="text-xs mt-2 pt-2 border-t border-dashed">
              {s.reasoning}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderSources = (sources: GroundingSource[]) => (
    <div className="mt-4 pt-3 border-t">
      <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
        <GlobeAltIcon className="w-4 h-4" />
        Sources du web
      </h4>
      <div className="space-y-2">
        {sources.map((source, index) => (
          <a
            key={index}
            href={source.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-primary hover:underline truncate"
          >
            {source.title}
          </a>
        ))}
      </div>
    </div>
  );

  const LoadingBubble = () => (
    <div className="chat-bubble chat-bubble-model flex items-center space-x-2">
      <div className="w-2 h-2 rounded-full bg-current animate-[bounce_1s_infinite_0.1s]"></div>
      <div className="w-2 h-2 rounded-full bg-current animate-[bounce_1s_infinite_0.2s]"></div>
      <div className="w-2 h-2 rounded-full bg-current animate-[bounce_1s_infinite_0.3s]"></div>
    </div>
  );

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <SparklesIcon className="w-6 h-6 text-primary" />
          Assistant IA GestiFiltres
        </DialogTitle>
        <DialogDescription>
          Obtenez des suggestions de filtres en décrivant ce que vous cherchez
          ou en envoyant une photo.
        </DialogDescription>
      </DialogHeader>
      <DialogContent className="pr-2">
        <div className="h-[50vh] overflow-y-auto pr-4 space-y-4 flex flex-col">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-bubble ${
                msg.role === "user" ? "chat-bubble-user" : "chat-bubble-model"
              } ${msg.isError ? "bg-destructive/20 text-destructive" : ""}`}
            >
              {msg.isLoading ? (
                <LoadingBubble />
              ) : (
                <>
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="User upload preview"
                      className="rounded-lg mb-2 max-h-48"
                    />
                  )}
                  {msg.text && <p>{msg.text}</p>}
                  {msg.suggestions && renderSuggestions(msg.suggestions)}
                  {msg.sources && renderSources(msg.sources)}
                </>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </DialogContent>
      <DialogFooter className="flex-col !items-stretch">
        {imagePreview && (
          <div className="relative w-24 h-24 mb-2 p-1 border rounded-md">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-full object-cover rounded"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold"
              aria-label="Remove image"
            >
              &times;
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach image"
          >
            <PaperClipIcon className="w-5 h-5" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ex: filtre à air pour Caterpillar 320D"
            className="flex-1"
            autoComplete="off"
          />
          <Button type="submit" disabled={!input.trim() && !imageFile}>
            Envoyer
          </Button>
        </form>
      </DialogFooter>
    </Dialog>
  );
};

export default AIAssistantModal;
