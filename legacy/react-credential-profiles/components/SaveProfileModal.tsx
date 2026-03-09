import { FormEvent, useEffect, useState, type CSSProperties } from "react";

interface SaveProfileModalProps {
  isOpen: boolean;
  title: string;
  initialName?: string;
  onClose: () => void;
  onSubmit: (profileName: string) => void;
}

export function SaveProfileModal({
  isOpen,
  title,
  initialName = "",
  onClose,
  onSubmit,
}: SaveProfileModalProps) {
  const [profileName, setProfileName] = useState(initialName);

  useEffect(() => {
    if (!isOpen) return;
    setProfileName(initialName);
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!profileName.trim()) return;
    onSubmit(profileName);
  };

  return (
    <div style={backdropStyle} role="dialog" aria-modal="true">
      <form style={modalStyle} onSubmit={handleSubmit}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <label style={labelStyle} htmlFor="profileNameInput">
          Nombre del perfil
        </label>
        <input
          id="profileNameInput"
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
          placeholder="Ejemplo: Produccion"
          style={inputStyle}
          autoFocus
        />
        <div style={actionsStyle}>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            Cancelar
          </button>
          <button type="submit" style={primaryButtonStyle}>
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

const backdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "grid",
  placeItems: "center",
  zIndex: 1000,
  padding: "16px",
};

const modalStyle: CSSProperties = {
  width: "100%",
  maxWidth: "420px",
  background: "#fff",
  border: "1px solid #d9e3f5",
  borderRadius: "12px",
  padding: "16px",
  display: "grid",
  gap: "10px",
};

const labelStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#214178",
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: "38px",
  borderRadius: "10px",
  border: "1px solid #c7d6f2",
  padding: "0 10px",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "8px",
};

const baseButtonStyle: CSSProperties = {
  borderRadius: "10px",
  border: "1px solid #c7d6f2",
  height: "36px",
  padding: "0 12px",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  ...baseButtonStyle,
  background: "#fff",
  color: "#1b2a4a",
};

const primaryButtonStyle: CSSProperties = {
  ...baseButtonStyle,
  background: "#0a3a9a",
  borderColor: "#0a3a9a",
  color: "#fff",
};
