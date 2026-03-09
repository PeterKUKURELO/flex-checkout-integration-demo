import { useEffect, useMemo, useState } from "react";
import { CredentialDraft, PaymentCredentialProfile } from "../types";

const DEFAULT_STORAGE_KEY = "paymentCredentialProfiles";

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function parseProfiles(value: string | null): PaymentCredentialProfile[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as PaymentCredentialProfile[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.profileName === "string" &&
        typeof item.clientId === "string" &&
        typeof item.clientSecret === "string" &&
        typeof item.merchantCode === "string"
    );
  } catch {
    return [];
  }
}

export function useCredentialProfiles(storageKey = DEFAULT_STORAGE_KEY) {
  const [profiles, setProfiles] = useState<PaymentCredentialProfile[]>(() => {
    if (typeof window === "undefined") return [];
    return parseProfiles(window.localStorage.getItem(storageKey));
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(profiles));
  }, [profiles, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      setProfiles(parseProfiles(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey]);

  const profilesById = useMemo(() => {
    const map = new Map<string, PaymentCredentialProfile>();
    profiles.forEach((profile) => map.set(profile.id, profile));
    return map;
  }, [profiles]);

  const addProfile = (profileName: string, credentials: CredentialDraft) => {
    const newProfile: PaymentCredentialProfile = {
      id: createId(),
      profileName: profileName.trim(),
      clientId: credentials.clientId.trim(),
      clientSecret: credentials.clientSecret.trim(),
      merchantCode: credentials.merchantCode.trim(),
    };
    setProfiles((prev) => [...prev, newProfile]);
    return newProfile;
  };

  const updateProfile = (
    id: string,
    update: Partial<PaymentCredentialProfile> & Partial<CredentialDraft>
  ) => {
    setProfiles((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...update,
              profileName: update.profileName?.trim() ?? item.profileName,
              clientId: update.clientId?.trim() ?? item.clientId,
              clientSecret: update.clientSecret?.trim() ?? item.clientSecret,
              merchantCode: update.merchantCode?.trim() ?? item.merchantCode,
            }
          : item
      )
    );
  };

  const deleteProfile = (id: string) => {
    setProfiles((prev) => prev.filter((item) => item.id !== id));
  };

  const getProfile = (id: string) => profilesById.get(id) ?? null;

  const exportProfileAsJson = (id: string) => {
    const profile = getProfile(id);
    if (!profile) return false;

    const payload = {
      clientId: profile.clientId,
      clientSecret: profile.clientSecret,
      merchantCode: profile.merchantCode,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${profile.profileName || "payment-profile"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    return true;
  };

  return {
    profiles,
    addProfile,
    updateProfile,
    deleteProfile,
    getProfile,
    exportProfileAsJson,
  };
}
