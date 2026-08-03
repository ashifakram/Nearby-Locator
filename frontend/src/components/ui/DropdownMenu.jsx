import React, { useState, useEffect, useRef, createContext, useContext } from 'react';

const DropdownContext = createContext({
  open: false,
  setOpen: () => {},
  close: () => {}
});

export function DropdownMenu({ children, open: controlledOpen, onOpenChange }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const containerRef = useRef(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (val) => {
    if (onOpenChange) onOpenChange(val);
    if (!isControlled) setUncontrolledOpen(val);
  };

  const close = () => setOpen(false);

  // Click outside listener
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // ESC keydown listener
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen, close }}>
      <div ref={containerRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ children, className = '', asChild = false }) {
  const { open, setOpen } = useContext(DropdownContext);

  const handleClick = (e) => {
    e.stopPropagation();
    setOpen(!open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        if (children.props.onClick) children.props.onClick(e);
        handleClick(e);
      },
      'aria-expanded': open,
      'aria-haspopup': 'menu'
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-expanded={open}
      aria-haspopup="menu"
      className={`focus-visible:outline-none cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  align = 'right',
  sideOffset = 8,
  className = ''
}) {
  const { open } = useContext(DropdownContext);

  if (!open) return null;

  const alignStyles = align === 'right' ? 'right-0' : 'left-0';

  return (
    <div
      role="menu"
      tabIndex={-1}
      style={{ marginTop: `${sideOffset}px` }}
      className={`absolute ${alignStyles} top-full z-[9999] min-w-[240px] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-1.5 shadow-2xl space-y-0.5 animate-in fade-in zoom-in-95 duration-150 ${className}`}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onClick = () => {},
  icon: Icon = null,
  shortcut = null,
  destructive = false,
  disabled = false,
  className = ''
}) {
  const { close } = useContext(DropdownContext);

  const handleClick = (e) => {
    if (disabled) return;
    onClick(e);
    close();
  };

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer select-none focus-visible:outline-none ${
        disabled
          ? 'opacity-40 cursor-not-allowed text-slate-400'
          : destructive
          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
      } ${className}`}
    >
      <div className="flex items-center gap-2.5 truncate">
        {Icon && <Icon className="w-4 h-4 shrink-0 opacity-70" />}
        <span className="truncate">{children}</span>
      </div>

      {shortcut && (
        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-normal ml-3 shrink-0">
          {shortcut}
        </span>
      )}
    </button>
  );
}

export function DropdownMenuHeader({ children, className = '' }) {
  return (
    <div className={`px-3 py-2.5 mb-1 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1 ${className}`}>
      {children}
    </div>
  );
}

export function DropdownMenuSeparator() {
  return <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />;
}

export function DropdownMenuLabel({ children }) {
  return (
    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">
      {children}
    </div>
  );
}
