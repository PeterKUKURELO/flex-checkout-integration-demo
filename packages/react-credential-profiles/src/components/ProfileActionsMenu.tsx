import { useEffect, useRef, type CSSProperties } from "react";

interface ProfileActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export function ProfileActionsMenu({
  isOpen,
  onClose,
  onEdit,
  onExport,
  onDelete,
}: ProfileActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={menuRef} style={menuStyle} role="menu">
      <button style={itemStyle} onClick={onEdit} type="button">
        Editar perfil
      </button>
      <button style={itemStyle} onClick={onExport} type="button">
        Exportar perfil
      </button>
      <button style={{ ...itemStyle, color: "#a6162f" }} onClick={onDelete} type="button">
        Eliminar perfil
      </button>
    </div>
  );
}

const menuStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  minWidth: "180px",
  background: "#fff",
  border: "1px solid #d9e3f5",
  borderRadius: "10px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
  padding: "6px",
  display: "grid",
  gap: "4px",
  zIndex: 50,
};

const itemStyle: CSSProperties = {
  border: "none",
  background: "#fff",
  textAlign: "left",
  borderRadius: "8px",
  height: "34px",
  padding: "0 10px",
  cursor: "pointer",
  color: "#1b2a4a",
  fontWeight: 500,
};
