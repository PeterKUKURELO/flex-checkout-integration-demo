import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useCredentialProfiles } from "../hooks/useCredentialProfiles";
import { CredentialDraft, UsageMode } from "../types";
import { ProfileActionsMenu } from "./ProfileActionsMenu";
import { SaveProfileModal } from "./SaveProfileModal";

interface PaymentCredentialFormProps {
  initialValues?: Partial<CredentialDraft>;
  storageKey?: string;
  onCredentialsChange?: (credentials: CredentialDraft) => void;
}

export function PaymentCredentialForm({
  initialValues,
  storageKey,
  onCredentialsChange,
}: PaymentCredentialFormProps) {
  const { profiles, addProfile, updateProfile, deleteProfile, getProfile, exportProfileAsJson } =
    useCredentialProfiles(storageKey);

  const [mode, setMode] = useState<UsageMode>("guest");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [clientId, setClientId] = useState(initialValues?.clientId ?? "");
  const [clientSecret, setClientSecret] = useState(initialValues?.clientSecret ?? "");
  const [merchantCode, setMerchantCode] = useState(initialValues?.merchantCode ?? "");
  const [showSecret, setShowSecret] = useState(false);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  const selectedProfile = useMemo(
    () => (selectedProfileId ? getProfile(selectedProfileId) : null),
    [getProfile, selectedProfileId]
  );
  const isEditingSavedProfile = mode === "saved_profile" && Boolean(selectedProfile);

  useEffect(() => {
    onCredentialsChange?.({ clientId, clientSecret, merchantCode });
  }, [clientId, clientSecret, merchantCode, onCredentialsChange]);

  const applyProfileToFields = (profileId: string) => {
    const profile = getProfile(profileId);
    if (!profile) return;
    setClientId(profile.clientId);
    setClientSecret(profile.clientSecret);
    setMerchantCode(profile.merchantCode);
    setShowSecret(false);
  };

  const handleProfileSelect = (profileId: string) => {
    setSelectedProfileId(profileId);
    if (!profileId) return;
    applyProfileToFields(profileId);
  };

  const openCreateProfileModal = () => {
    setEditingProfileId(null);
    setIsSaveModalOpen(true);
  };

  const openEditProfileModal = () => {
    if (!selectedProfile) return;
    setEditingProfileId(selectedProfile.id);
    setIsSaveModalOpen(true);
    setIsActionsMenuOpen(false);
  };

  const handleSaveProfile = (profileName: string) => {
    const credentials: CredentialDraft = { clientId, clientSecret, merchantCode };
    if (editingProfileId) {
      updateProfile(editingProfileId, { profileName, ...credentials });
    } else {
      const created = addProfile(profileName, credentials);
      setSelectedProfileId(created.id);
      setMode("saved_profile");
    }
    setIsSaveModalOpen(false);
    setEditingProfileId(null);
  };

  const handleDeleteProfile = () => {
    if (!selectedProfile) return;
    const ok = window.confirm(`¿Eliminar perfil "${selectedProfile.profileName}"?`);
    if (!ok) return;
    deleteProfile(selectedProfile.id);
    setSelectedProfileId("");
    setMode("guest");
    setIsActionsMenuOpen(false);
  };

  const handleExportProfile = () => {
    if (!selectedProfile) return;
    exportProfileAsJson(selectedProfile.id);
    setIsActionsMenuOpen(false);
  };

  return (
    <section style={containerStyle}>
      <h3 style={titleStyle}>Credenciales de pago seguro</h3>

      <label style={labelStyle} htmlFor="usageMode">
        Modo de uso
      </label>
      <select
        id="usageMode"
        value={mode}
        onChange={(e) => setMode(e.target.value as UsageMode)}
        style={inputStyle}
      >
        <option value="guest">Usar como invitado</option>
        <option value="saved_profile">Usar perfil guardado</option>
      </select>

      {mode === "saved_profile" && (
        <>
          <label style={labelStyle} htmlFor="profileId">
            Perfil de credenciales
          </label>
          <div style={profileRowStyle}>
            <select
              id="profileId"
              value={selectedProfileId}
              onChange={(e) => handleProfileSelect(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            >
              <option value="">Seleccionar perfil</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.profileName}
                </option>
              ))}
            </select>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setIsActionsMenuOpen((prev) => !prev)}
                disabled={!selectedProfile}
                style={menuButtonStyle}
                aria-label="Acciones de perfil"
              >
                ⋮
              </button>
              <ProfileActionsMenu
                isOpen={isActionsMenuOpen}
                onClose={() => setIsActionsMenuOpen(false)}
                onEdit={openEditProfileModal}
                onExport={handleExportProfile}
                onDelete={handleDeleteProfile}
              />
            </div>
          </div>
        </>
      )}

      <label style={labelStyle} htmlFor="clientId">
        Client ID
      </label>
      <input id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)} style={inputStyle} />

      <label style={labelStyle} htmlFor="clientSecret">
        Client Secret
      </label>
      <div style={secretRowStyle}>
        <input
          id="clientSecret"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
          type={showSecret ? "text" : "password"}
        />
        <button type="button" onClick={() => setShowSecret((prev) => !prev)} style={toggleSecretButtonStyle}>
          {showSecret ? "Ocultar" : "Mostrar"}
        </button>
      </div>

      <label style={labelStyle} htmlFor="merchantCode">
        Merchant Code
      </label>
      <input
        id="merchantCode"
        value={merchantCode}
        onChange={(e) => setMerchantCode(e.target.value)}
        style={inputStyle}
      />

      <button
        type="button"
        onClick={isEditingSavedProfile ? openEditProfileModal : openCreateProfileModal}
        style={saveButtonStyle}
      >
        {isEditingSavedProfile ? "Editar credenciales" : "Guardar como perfil"}
      </button>

      <SaveProfileModal
        isOpen={isSaveModalOpen}
        title={editingProfileId ? "Editar perfil" : "Guardar como perfil"}
        initialName={editingProfileId ? selectedProfile?.profileName ?? "" : ""}
        onClose={() => {
          setIsSaveModalOpen(false);
          setEditingProfileId(null);
        }}
        onSubmit={handleSaveProfile}
      />
    </section>
  );
}

const containerStyle: CSSProperties = {
  border: "1px solid #d9e3f5",
  borderRadius: "14px",
  background: "#f7faff",
  padding: "16px",
  display: "grid",
  gap: "10px",
  maxWidth: "460px",
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "#0a3a9a",
  textTransform: "uppercase",
  letterSpacing: ".4px",
  fontSize: "16px",
};

const labelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 800,
  color: "#214178",
  textTransform: "uppercase",
  letterSpacing: ".35px",
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: "40px",
  borderRadius: "10px",
  border: "1px solid #c7d6f2",
  padding: "0 10px",
  background: "#fff",
};

const profileRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
};

const secretRowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
};

const menuButtonStyle: CSSProperties = {
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  border: "1px solid #c7d6f2",
  background: "#fff",
  cursor: "pointer",
  fontSize: "20px",
  lineHeight: 1,
};

const saveButtonStyle: CSSProperties = {
  marginTop: "4px",
  height: "40px",
  borderRadius: "10px",
  border: "1px solid #0a3a9a",
  background: "#0a3a9a",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const toggleSecretButtonStyle: CSSProperties = {
  height: "40px",
  borderRadius: "10px",
  border: "1px solid #c7d6f2",
  background: "#fff",
  color: "#1b2a4a",
  fontWeight: 600,
  cursor: "pointer",
  padding: "0 12px",
  whiteSpace: "nowrap",
};
